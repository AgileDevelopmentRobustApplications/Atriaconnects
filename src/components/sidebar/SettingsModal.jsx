import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { STATUSES } from '../../lib/status.js'
import Modal from '../common/Modal.jsx'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import CustomSelect from '../common/CustomSelect.jsx'
import BrowseClubsModal from './BrowseClubsModal.jsx'

const AVATAR_COLORS = [
  '#0B1E13',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#EF4444',
  '#6366F1',
]

const YEAR_OPTIONS = [
  { value: '', label: 'Select Year' },
  { value: '1', label: 'Year 1 (1st/2nd Sem)' },
  { value: '2', label: 'Year 2 (3rd/4th Sem)' },
  { value: '3', label: 'Year 3 (5th/6th Sem)' },
  { value: '4', label: 'Year 4 (7th/8th Sem)' },
]

export default function SettingsModal({ onClose, initialTab = 'profile' }) {
  const { profile, user, updateProfile, theme, toggleTheme } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState(initialTab) // 'profile' | 'services'
  const [status, setStatus] = useState(profile?.status ?? 'active')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color ?? '#0B1E13')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [department, setDepartment] = useState(profile?.department ?? '')
  const [branch, setBranch] = useState(profile?.branch ?? '')
  const [year, setYear] = useState(profile?.year ?? '')
  const [admissionCode, setAdmissionCode] = useState(profile?.admission_code ?? '')
  const [dob, setDob] = useState(profile?.dob ?? '')
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [browseModal, setBrowseModal] = useState(false)

  const fullName = profile?.full_name ?? ''

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSuccess('')
    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user?.id || 'avatar'}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        const reader = new FileReader()
        reader.onload = (evt) => {
          setAvatarUrl(evt.target.result)
          setUploading(false)
          setSuccess('Photo loaded! Click Save Settings to apply.')
        }
        reader.readAsDataURL(file)
      } else {
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        setAvatarUrl(data.publicUrl)
        setUploading(false)
        setSuccess('Photo uploaded! Click Save Settings to apply.')
      }
    } catch (err) {
      setError(err.message || 'Failed to process image')
      setUploading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)

    try {
      await updateProfile({
        status,
        avatar_url: avatarUrl.trim() || null,
        avatar_color: avatarColor,
        phone: phone.trim(),
        department: department.trim(),
        branch: branch.trim(),
        year: year ? parseInt(year, 10) : null,
        admission_code: admissionCode.trim(),
        dob: dob || null,
      })
      setSuccess('Settings updated successfully!')
      setTimeout(() => {
        onClose()
      }, 600)
    } catch (err) {
      setError(err.message || 'Failed to update settings')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Settings & Campus Services" onClose={onClose} wide>
      <div className="settings-nav-tabs">
        <button
          className={`settings-nav-tab${tab === 'profile' ? ' active' : ''}`}
          onClick={() => setTab('profile')}
        >
          <Icon name="user" size={16} />
          <span>Personal Info & Status</span>
        </button>
        <button
          className={`settings-nav-tab${tab === 'services' ? ' active' : ''}`}
          onClick={() => setTab('services')}
        >
          <Icon name="compass" size={16} />
          <span>Campus Services & Alerts</span>
        </button>
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSave} className="settings-form">
          {/* Preview Banner */}
          <div className="settings-hero">
            <div className="settings-avatar-wrap">
              <Avatar
                name={fullName}
                size={72}
                online
                status={status}
                url={avatarUrl}
                color={avatarColor}
              />
              <label className="upload-badge" title="Upload new photo">
                <Icon name="camera" size={16} />
                <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} hidden />
              </label>
            </div>
            <div className="settings-hero-info">
              <h3>{fullName || 'Your Name'}</h3>
              <p className="settings-email">{user?.email || profile?.email}</p>
              <span className="settings-status-pill">{status.toUpperCase()}</span>
            </div>
          </div>

          {/* Section 1: Photo & Avatar Customization */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Icon name="camera" size={16} />
              <span>Profile Photo & Avatar</span>
            </div>
            <div className="settings-field-group">
              <div className="photo-actions">
                <label className="btn-small">
                  {uploading ? (
                    'Uploading…'
                  ) : (
                    <>
                      <Icon name="camera" size={14} />
                      <span>Choose Photo File</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} hidden />
                </label>
                {avatarUrl && (
                  <button type="button" className="btn-small danger" onClick={() => setAvatarUrl('')}>
                    Remove Photo
                  </button>
                )}
              </div>

              <div className="field-row">
                <label className="field-label">Or Direct Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>

              {!avatarUrl && (
                <div className="field-row">
                  <label className="field-label">Avatar Theme Color</label>
                  <div className="color-swatch-row">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`swatch-btn${avatarColor === c ? ' active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setAvatarColor(c)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Online Status & Presence */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Icon name="circle" size={16} />
              <span>Status & Presence</span>
            </div>
            <div className="status-grid">
              {STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`status-card${status === s.id ? ' selected' : ''}`}
                  onClick={() => setStatus(s.id)}
                >
                  <span className="status-swatch" style={{ background: s.color }} />
                  <span className="status-card-label">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Theme & Appearance */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Icon name="sun" size={16} />
              <span>Appearance & Theme Mode</span>
            </div>
            <div className="theme-toggle-grid">
              <button
                type="button"
                className={`theme-card${theme === 'light' ? ' selected' : ''}`}
                onClick={() => toggleTheme('light')}
              >
                <div className="theme-card-icon light">
                  <Icon name="sun" size={20} />
                </div>
                <div className="theme-card-text">
                  <h4>Light Mode</h4>
                  <p>Clean Porcelain surface & obsidian green contrast</p>
                </div>
                {theme === 'light' && <Icon name="check" size={16} className="theme-check" />}
              </button>

              <button
                type="button"
                className={`theme-card${theme === 'dark' ? ' selected' : ''}`}
                onClick={() => toggleTheme('dark')}
              >
                <div className="theme-card-icon dark">
                  <Icon name="moon" size={20} />
                </div>
                <div className="theme-card-text">
                  <h4>Dark Mode</h4>
                  <p>Deep Obsidian Carbon surface & Electric Lime glow</p>
                </div>
                {theme === 'dark' && <Icon name="check" size={16} className="theme-check" />}
              </button>
            </div>
          </div>

          {/* Section 3: Personal Information & Student Details */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Icon name="user" size={16} />
              <span>Personal & Campus Information</span>
            </div>
            <div className="settings-stack">
              <div className="field-row">
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  disabled
                  readOnly
                  className="input-disabled"
                  title="Official registered name associated with your campus account"
                />
                <span className="field-hint">
                  <Icon name="lock" size={12} /> Official registered name associated with your campus account.
                </span>
              </div>

              <div className="field-row">
                <label className="field-label">USN</label>
                <input
                  type="text"
                  value={admissionCode}
                  disabled
                  readOnly
                  className="input-disabled"
                  placeholder="Not assigned"
                  title="Official USN assigned by institutional registry"
                />
                <span className="field-hint">
                  <Icon name="lock" size={12} /> Official USN assigned by institutional registry.
                </span>
              </div>

              <div className="field-row">
                <label className="field-label">Department</label>
                <input
                  type="text"
                  value={department}
                  disabled
                  readOnly
                  className="input-disabled"
                  placeholder="Not assigned"
                  title="Assigned academic department"
                />
                <span className="field-hint">
                  <Icon name="lock" size={12} /> Assigned academic department.
                </span>
              </div>

              <div className="field-row">
                <label className="field-label">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="field-row">
                <label className="field-label">Academic Year</label>
                <CustomSelect
                  value={year}
                  onChange={(val) => setYear(val)}
                  options={YEAR_OPTIONS}
                  placeholder="Select Year"
                />
              </div>

              <div className="field-row">
                <label className="field-label">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <div className="settings-footer-actions">
            <button type="button" className="btn-small danger" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy || uploading}>
              {busy ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {tab === 'services' && (
        <div className="services-tab-container">
          {/* Upcoming Campus Events */}
          <div className="dashboard-card events-card">
            <div className="dashboard-card-header">
              <div className="card-title-wrap">
                <span className="card-icon-wrap"><Icon name="calendar" size={18} /></span>
                <h3>Upcoming Campus Events</h3>
              </div>
              <span className="pill-badge">0 Scheduled</span>
            </div>
            <div className="dashboard-card-body empty-box">
              <div className="empty-box-icon">
                <Icon name="calendar" size={28} />
              </div>
              <p className="empty-box-text">No upcoming campus events scheduled.</p>
            </div>
          </div>

          {/* Canteen Alerts & Banners */}
          <div className="dashboard-card canteen-card">
            <div className="dashboard-card-header">
              <div className="card-title-wrap">
                <span className="card-icon-wrap"><Icon name="megaphone" size={18} /></span>
                <h3>Canteen Alerts & Banners</h3>
              </div>
              <span className="pill-badge green">Live</span>
            </div>
            <div className="dashboard-card-body empty-box">
              <div className="empty-box-icon">
                <Icon name="megaphone" size={28} />
              </div>
              <p className="empty-box-text">No recent canteen banners posted today.</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card actions-card">
            <div className="dashboard-card-header">
              <div className="card-title-wrap">
                <span className="card-icon-wrap"><Icon name="compass" size={18} /></span>
                <h3>Quick Actions</h3>
              </div>
            </div>
            <div className="quick-actions-grid">
              <div
                className="quick-action-card"
                onClick={() => showToast('Canteen ordering & menu service coming soon!', 'info')}
              >
                <div className="action-card-icon food"><Icon name="coffee" size={20} /></div>
                <div className="action-card-text">
                  <h4>Order Food</h4>
                  <p>Browse menu & place order</p>
                </div>
                <span className="action-arrow">→</span>
              </div>

              <div
                className="quick-action-card"
                onClick={() => setBrowseModal(true)}
              >
                <div className="action-card-icon clubs"><Icon name="search" size={20} /></div>
                <div className="action-card-text">
                  <h4>Explore Clubs</h4>
                  <p>Discover & join communities</p>
                </div>
                <span className="action-arrow">→</span>
              </div>
            </div>
          </div>

          {browseModal && <BrowseClubsModal onClose={() => setBrowseModal(false)} />}
        </div>
      )}
    </Modal>
  )
}
