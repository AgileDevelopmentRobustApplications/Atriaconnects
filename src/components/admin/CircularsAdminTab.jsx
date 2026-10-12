import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatFileSize } from '../../lib/format.js'
import {
  CIRCULAR_AUDIENCES,
  MAX_CIRCULAR_FILE_MB,
  audienceLabel,
  circularFileUrl,
  fetchCirculars,
  uploadCircularFile,
} from '../../lib/circulars.js'
import Icon from '../common/Icon.jsx'

// Staff-only: publish official management circulars (title, body, optional
// attachment, audience) and manage the ones already out. Users read them in
// Notifications → Management circulars.
export default function CircularsAdminTab() {
  const { user, isSuperAdmin } = useAuth()
  const { showToast } = useToast()
  const fileRef = useRef(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('everyone')
  const [file, setFile] = useState(null)
  const [publishing, setPublishing] = useState(false)

  const [circulars, setCirculars] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await fetchCirculars(100)
    if (error) {
      console.error('Circulars: failed to load', error)
      setLoadError(error.message)
    } else {
      setLoadError('')
      setCirculars(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function pickFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_CIRCULAR_FILE_MB * 1024 * 1024) {
      showToast(`File too large — max ${MAX_CIRCULAR_FILE_MB} MB`, 'warning')
      return
    }
    setFile(f)
  }

  async function publish(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim() || publishing) return
    if (!confirm(`Publish “${title.trim()}” to ${audienceLabel(audience).toLowerCase()}?`)) return
    setPublishing(true)
    try {
      const attachment = file ? await uploadCircularFile(file, user.id) : {}
      const { error } = await supabase.from('circulars').insert({
        title: title.trim(),
        body: body.trim(),
        audience,
        created_by: user.id,
        ...attachment,
      })
      if (error) throw error
      showToast('Circular published', 'success')
      setTitle('')
      setBody('')
      setFile(null)
      setAudience('everyone')
      load()
    } catch (err) {
      console.error('Circulars: publish failed', err)
      showToast(`Couldn't publish: ${err.message}`, 'error', 7000)
    } finally {
      setPublishing(false)
    }
  }

  async function remove(c) {
    if (!confirm(`Withdraw the circular “${c.title}”? Everyone will stop seeing it.`)) return
    setDeletingId(c.id)
    const { error } = await supabase.from('circulars').delete().eq('id', c.id)
    if (!error && c.attachment_path) {
      await supabase.storage.from('circulars').remove([c.attachment_path])
    }
    setDeletingId(null)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Circular withdrawn', 'info')
    setCirculars((list) => list.filter((x) => x.id !== c.id))
  }

  return (
    <div className="circulars-admin">
      <div className="admin-section-head">
        <div>
          <h2>Management circulars</h2>
          <p>Official notices from college management. They appear under Notifications → Management circulars.</p>
        </div>
      </div>

      <form className="announce-composer" onSubmit={publish}>
        <label className="field-label-block">
          Title
          <input
            value={title}
            maxLength={200}
            placeholder="e.g. Revised academic calendar for Semester 5"
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="field-label-block">
          Circular
          <textarea
            value={body}
            maxLength={5000}
            rows={6}
            placeholder="Write the full text of the circular…"
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </label>

        <div className="circular-options">
          <div className="field-label-block">
            <span>Audience</span>
            <div className="announce-audience" role="radiogroup" aria-label="Audience">
              {CIRCULAR_AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={audience === a.id}
                  className={`filter-chip${audience === a.id ? ' active' : ''}`}
                  onClick={() => setAudience(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-label-block">
            <span>
              Attachment <span className="field-optional">optional · max {MAX_CIRCULAR_FILE_MB} MB</span>
            </span>
            <input ref={fileRef} type="file" hidden onChange={pickFile} />
            {file ? (
              <div className="circular-file">
                <Icon name="file" size={16} />
                <span className="circular-file-name">{file.name}</span>
                <span className="picker-sub">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Remove attachment"
                  onClick={() => setFile(null)}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ) : (
              <button type="button" className="btn-small secondary" onClick={() => fileRef.current?.click()}>
                <Icon name="paperclip" size={14} /> Attach PDF or file
              </button>
            )}
          </div>
        </div>

        <div className="announce-footer">
          <span className="announce-reach">
            <Icon name="file" size={14} />
            Visible to {audienceLabel(audience).toLowerCase()}
            {audience === 'students' ? ' (and staff)' : ''}
          </span>
          <span className="announce-count">{body.length}/5000</span>
          <button type="submit" className="btn-primary" disabled={!title.trim() || !body.trim() || publishing}>
            {publishing ? (
              'Publishing…'
            ) : (
              <>
                <Icon name="send" size={16} /> Publish
              </>
            )}
          </button>
        </div>
      </form>

      <div className="announce-feed-head">
        <h3>Published circulars</h3>
      </div>

      {loading && <div className="side-note">Loading circulars…</div>}
      {!loading && loadError && (
        <div className="auth-error">
          Couldn’t load circulars: {loadError}
          {/relation|does not exist|schema cache/i.test(loadError) && ' — run migration 034 in Supabase.'}
        </div>
      )}
      {!loading && !loadError && circulars.length === 0 && (
        <div className="empty-box">
          <div className="empty-box-icon">
            <Icon name="file" size={22} />
          </div>
          <p className="empty-box-text">No circulars yet</p>
          <p className="empty-box-sub">Circulars you publish will be listed here.</p>
        </div>
      )}
      {!loading && !loadError && circulars.length > 0 && (
        <div className="announce-feed">
          {circulars.map((c) => {
            const canDelete = c.created_by === user?.id || isSuperAdmin
            return (
              <article key={c.id} className="announce-card circular-card">
                <header className="circular-head">
                  <div className="picker-grow">
                    <h4 className="circular-title">{c.title}</h4>
                    <span className="picker-sub">
                      {c.author?.full_name ?? 'Management'} · {format(new Date(c.created_at), 'd MMM yyyy, h:mm a')}
                    </span>
                  </div>
                  <span className="pill-badge green">{audienceLabel(c.audience)}</span>
                  {canDelete && (
                    <button
                      className="icon-btn"
                      aria-label={`Withdraw ${c.title}`}
                      data-tip="Withdraw"
                      disabled={deletingId === c.id}
                      onClick={() => remove(c)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </header>
                <p className="announce-body circular-body">{c.body}</p>
                {c.attachment_path && (
                  <a
                    className="file-card circular-attachment"
                    href={circularFileUrl(c.attachment_path)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="file-icon">
                      <Icon name="file" size={22} strokeWidth={1.6} />
                    </span>
                    <span className="file-meta">
                      <span className="file-name">{c.attachment_name}</span>
                      <span className="file-size">{formatFileSize(c.attachment_size)}</span>
                    </span>
                    <span className="file-download">
                      <Icon name="download" size={16} />
                    </span>
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
