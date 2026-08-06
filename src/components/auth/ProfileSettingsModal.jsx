import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Modal from '../common/Modal.jsx'
import Icon from '../common/Icon.jsx'

export default function ProfileSettingsModal({ onClose }) {
  const { profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const { compressImage } = await import('../../lib/compress.js')
      const compressed = await compressImage(file, 400, 0.8) // Resize to max 400px for avatar

      const fileExt = 'jpg'
      const filePath = `${profile.id}/${crypto.randomUUID()}.${fileExt}`

      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressed)

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
    } catch (err) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!fullName.trim()) return

    setSaving(true)
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl,
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      await refreshProfile()
      onClose()
    } catch (err) {
      setError(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Profile settings" onClose={onClose}>
      <form onSubmit={handleSave} className="modal-form">
        <div className="profile-settings-avatar-section">
          <Avatar name={fullName} url={avatarUrl} size={90} />
          <button
            type="button"
            className="btn-small"
            style={{ marginTop: 12 }}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Change profile picture'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />
        </div>

        <label style={{ display: 'block', marginTop: 16 }}>
          Display name
          <input
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            maxLength={60}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="btn-primary" style={{ marginTop: 20 }} disabled={saving || uploading || !fullName.trim()}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </Modal>
  )
}
