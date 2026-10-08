import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatChatTime } from '../../lib/format.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'

// Staff-only: read every community / academic-group announcement channel in
// one feed, and post an announcement to one, several or all of them. Posts are
// ordinary messages in each target's announcements conversation, so members
// see them exactly where they already read announcements. Access for channels
// staff aren't members of comes from migration 033.

const ANNOUNCEMENT_TYPES = ['club_announcements', 'group_announcements']
const AUDIENCES = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'communities', label: 'All communities' },
  { id: 'groups', label: 'All academic groups' },
  { id: 'custom', label: 'Choose…' },
]
const MAX_LENGTH = 2000
const BROADCAST_WINDOW_MS = 2 * 60 * 1000

const targetName = (t) => t?.club?.name ?? t?.group?.name ?? 'Unknown'
const isCommunity = (t) => t.type === 'club_announcements'

export default function AnnouncementsAdminTab({ totalChannels }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [targets, setTargets] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [audience, setAudience] = useState('everyone')
  const [picked, setPicked] = useState(() => new Set())
  const [pickerSearch, setPickerSearch] = useState('')
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [justPosted, setJustPosted] = useState(false)

  const [feedFilter, setFeedFilter] = useState('all') // all | communities | groups
  const [feedSearch, setFeedSearch] = useState('')

  const load = useCallback(async () => {
    const { data: convs, error: convErr } = await supabase
      .from('conversations')
      .select('id, type, club_id, academic_group_id, club:clubs(id, name), group:academic_groups(id, name)')
      .in('type', ANNOUNCEMENT_TYPES)
    if (convErr) {
      console.error('Announcements: failed to load channels', convErr)
      setLoadError(convErr.message)
      setLoading(false)
      return
    }
    const channels = (convs ?? []).sort((a, b) => targetName(a).localeCompare(targetName(b)))
    setTargets(channels)

    if (channels.length === 0) {
      setPosts([])
      setLoading(false)
      return
    }
    const { data: msgs, error: msgErr } = await supabase
      .from('messages')
      .select(
        'id, conversation_id, content, created_at, sender_id, attachment_name, sender:profiles!sender_id(id, full_name, avatar_url, avatar_color)'
      )
      .in(
        'conversation_id',
        channels.map((c) => c.id)
      )
      .order('created_at', { ascending: false })
      .limit(300)
    if (msgErr) {
      console.error('Announcements: failed to load posts', msgErr)
      setLoadError(msgErr.message)
    } else {
      setLoadError('')
      setPosts(msgs ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Live: refresh when anything new lands in an announcement channel.
  const targetIds = useMemo(() => new Set(targets.map((t) => t.id)), [targets])
  useEffect(() => {
    if (targetIds.size === 0) return
    const channel = supabase
      .channel('admin-announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (targetIds.has(payload.new?.conversation_id)) load()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [targetIds, load])

  const byId = useMemo(() => new Map(targets.map((t) => [t.id, t])), [targets])

  const selectedTargets = useMemo(() => {
    if (audience === 'everyone') return targets
    if (audience === 'communities') return targets.filter(isCommunity)
    if (audience === 'groups') return targets.filter((t) => !isCommunity(t))
    return targets.filter((t) => picked.has(t.id))
  }, [audience, targets, picked])

  // One broadcast = same sender + same text posted to several channels within
  // a couple of minutes. Shown as a single card listing its channels.
  const broadcasts = useMemo(() => {
    const groups = []
    for (const m of posts) {
      const last = groups[groups.length - 1]
      if (
        last &&
        last.sender_id === m.sender_id &&
        last.content === m.content &&
        Math.abs(new Date(last.created_at) - new Date(m.created_at)) < BROADCAST_WINDOW_MS
      ) {
        last.channels.push(m.conversation_id)
      } else {
        groups.push({ ...m, key: m.id, channels: [m.conversation_id] })
      }
    }
    return groups
  }, [posts])

  const q = feedSearch.trim().toLowerCase()
  const visibleBroadcasts = broadcasts.filter((b) => {
    const chans = b.channels.map((id) => byId.get(id)).filter(Boolean)
    if (feedFilter === 'communities' && !chans.some(isCommunity)) return false
    if (feedFilter === 'groups' && !chans.some((t) => !isCommunity(t))) return false
    if (!q) return true
    return (
      (b.content ?? '').toLowerCase().includes(q) ||
      (b.sender?.full_name ?? '').toLowerCase().includes(q) ||
      chans.some((t) => targetName(t).toLowerCase().includes(q))
    )
  })

  function togglePicked(id) {
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function post(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content || selectedTargets.length === 0 || posting) return
    if (
      selectedTargets.length > 1 &&
      !confirm(`Post this announcement to ${selectedTargets.length} channels?`)
    ) {
      return
    }
    setPosting(true)
    // One insert per channel so a single refusal doesn't block the rest.
    const results = await Promise.allSettled(
      selectedTargets.map((t) =>
        supabase
          .from('messages')
          .insert({ conversation_id: t.id, sender_id: user.id, content })
          .then(({ error }) => {
            if (error) throw error
          })
      )
    )
    setPosting(false)
    const failed = results.filter((r) => r.status === 'rejected')
    const ok = results.length - failed.length
    if (failed.length) console.error('Announcements: some posts failed', failed.map((f) => f.reason))
    if (ok === 0) {
      showToast(`Couldn't post: ${failed[0]?.reason?.message ?? 'unknown error'}`, 'error', 7000)
      return
    }
    showToast(
      failed.length
        ? `Posted to ${ok} of ${results.length} channels — ${failed.length} refused`
        : `Announcement posted to ${ok} channel${ok === 1 ? '' : 's'}`,
      failed.length ? 'warning' : 'success'
    )
    setText('')
    setJustPosted(true)
    setTimeout(() => setJustPosted(false), 1200)
    load()
  }

  const pickerMatches = targets.filter((t) =>
    targetName(t).toLowerCase().includes(pickerSearch.trim().toLowerCase())
  )
  const canPost = text.trim().length > 0 && selectedTargets.length > 0 && !posting

  return (
    <div className="announcements-admin">
      <div className="admin-section-head">
        <div>
          <h2>Announcements</h2>
          <p>Post to community and academic-group announcement channels, and see everything that’s been announced.</p>
        </div>
      </div>

      {!loading && totalChannels > targets.length && (
        <p className="side-note announce-access-note">
          <Icon name="info" size={14} /> You can reach {targets.length} of {totalChannels} channels. Staff access to
          the rest needs the latest database update (migration 033).
        </p>
      )}

      <form className={`announce-composer${justPosted ? ' just-posted' : ''}`} onSubmit={post}>
        <div className="announce-audience" role="radiogroup" aria-label="Audience">
          {AUDIENCES.map((a) => (
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

        {audience === 'custom' && (
          <div className="announce-picker">
            <input
              type="search"
              placeholder="Search communities and groups"
              aria-label="Search channels"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
            />
            <div className="announce-picker-list">
              {pickerMatches.length === 0 && <div className="side-note">No channels match.</div>}
              {pickerMatches.map((t) => (
                <label key={t.id} className="announce-picker-item">
                  <input type="checkbox" checked={picked.has(t.id)} onChange={() => togglePicked(t.id)} />
                  <span className="picker-grow">
                    <span className="picker-name">{targetName(t)}</span>
                  </span>
                  <span className="announce-kind">{isCommunity(t) ? 'Community' : 'Academic'}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <textarea
          aria-label="Announcement"
          placeholder="Write an announcement…"
          value={text}
          maxLength={MAX_LENGTH}
          rows={4}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') post(e)
          }}
        />

        <div className="announce-footer">
          <span className="announce-reach">
            <Icon name="megaphone" size={14} />
            {selectedTargets.length === 0
              ? 'Choose at least one channel'
              : `Reaches ${selectedTargets.length} channel${selectedTargets.length === 1 ? '' : 's'}: ${selectedTargets
                  .slice(0, 3)
                  .map(targetName)
                  .join(', ')}${selectedTargets.length > 3 ? ` +${selectedTargets.length - 3} more` : ''}`}
          </span>
          <span className="announce-count">
            {text.length}/{MAX_LENGTH}
          </span>
          <button type="submit" className="btn-primary" disabled={!canPost}>
            {posting ? (
              'Posting…'
            ) : justPosted ? (
              <>
                <Icon name="check" size={16} /> Posted
              </>
            ) : (
              <>
                <Icon name="send" size={16} /> Post
              </>
            )}
          </button>
        </div>
      </form>

      <div className="announce-feed-head">
        <h3>Recent announcements</h3>
        <div className="announce-feed-tools">
          <div className="filter-row" style={{ margin: 0 }}>
            {[
              ['all', 'All'],
              ['communities', 'Communities'],
              ['groups', 'Academic'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`filter-chip${feedFilter === id ? ' active' : ''}`}
                onClick={() => setFeedFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="announce-feed-search"
            placeholder="Search announcements"
            aria-label="Search announcements"
            value={feedSearch}
            onChange={(e) => setFeedSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="announce-feed" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="announce-card">
              <div className="skeleton-row" style={{ padding: 0 }}>
                <span className="skeleton skeleton-avatar" style={{ width: 36, height: 36 }} />
                <span className="skeleton-lines">
                  <span className="skeleton skeleton-line" style={{ width: '35%' }} />
                  <span className="skeleton skeleton-line" style={{ width: '80%' }} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && loadError && (
        <div className="auth-error">Couldn’t load announcements: {loadError}</div>
      )}

      {!loading && !loadError && visibleBroadcasts.length === 0 && (
        <div className="empty-box">
          <div className="empty-box-icon">
            <Icon name="megaphone" size={22} />
          </div>
          <p className="empty-box-text">{q || feedFilter !== 'all' ? 'Nothing matches' : 'No announcements yet'}</p>
          <p className="empty-box-sub">
            {q || feedFilter !== 'all'
              ? 'Try a different search or filter.'
              : 'Announcements you or community admins post will show up here.'}
          </p>
        </div>
      )}

      {!loading && !loadError && visibleBroadcasts.length > 0 && (
        <div className="announce-feed">
          {visibleBroadcasts.map((b) => {
            const chans = b.channels.map((id) => byId.get(id)).filter(Boolean)
            const mine = b.sender_id === user?.id
            return (
              <article key={b.key} className="announce-card">
                <header className="announce-card-head">
                  <Avatar
                    name={b.sender?.full_name}
                    url={b.sender?.avatar_url}
                    color={b.sender?.avatar_color}
                    size={36}
                  />
                  <div className="picker-grow">
                    <span className="picker-name">
                      {b.sender?.full_name ?? 'Unknown'}
                      {mine && <span className="picker-you"> · you</span>}
                    </span>
                    <span className="picker-sub">{formatChatTime(b.created_at)}</span>
                  </div>
                  {chans.length > 1 && <span className="pill-badge green">Broadcast · {chans.length}</span>}
                </header>
                {b.content && <p className="announce-body">{b.content}</p>}
                {b.attachment_name && (
                  <p className="announce-attachment">
                    <Icon name="paperclip" size={13} /> {b.attachment_name}
                  </p>
                )}
                <div className="chip-row">
                  {chans.slice(0, 6).map((t) => (
                    <span key={t.id} className="club-chip announce-target">
                      <Icon name={isCommunity(t) ? 'users' : 'book'} size={11} />
                      {targetName(t)}
                    </span>
                  ))}
                  {chans.length > 6 && <span className="club-chip announce-target">+{chans.length - 6} more</span>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
