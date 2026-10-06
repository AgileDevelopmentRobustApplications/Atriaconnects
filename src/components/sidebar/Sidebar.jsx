import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { STATUSES, statusById } from '../../lib/status.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import ChatListItem from './ChatListItem.jsx'
import NewDmModal from './NewDmModal.jsx'
import NewClubModal from './NewClubModal.jsx'
import BrowseClubsModal from './BrowseClubsModal.jsx'
import SettingsModal from './SettingsModal.jsx'
import Modal from '../common/Modal.jsx'

function ChatSection({ title, chats }) {
  if (chats.length === 0) return null
  return (
    <div className="chat-section" role="group" aria-label={title}>
      <div className="chat-section-header">
        <span>{title}</span>
        <span className="chat-section-count">{chats.length}</span>
      </div>
      {chats.map((chat) => (
        <ChatListItem key={chat.conversation_id} chat={chat} />
      ))}
    </div>
  )
}

export default function Sidebar() {
  const { profile, signOut, isEmployee, isGuest, updateStatus } = useAuth()
  const { chats, chatsLoading } = useChat()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // 'dm' | 'club' | 'browse' | 'settings' | 'print'
  const [statusMenu, setStatusMenu] = useState(false)
  const headerRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const handleOpenModal = (e) => setModal(e.detail)
    window.addEventListener('open-modal', handleOpenModal)
    return () => window.removeEventListener('open-modal', handleOpenModal)
  }, [])

  // Status menu: close on outside click / Escape (hover-out doesn't exist on touch).
  useEffect(() => {
    if (!statusMenu) return
    const onDown = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) setStatusMenu(false)
    }
    const onKey = (e) => e.key === 'Escape' && setStatusMenu(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [statusMenu])

  // "/" focuses chat search from anywhere outside a text field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.querySelector('.modal-card')) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const filtered = chats.filter((c) => c.title?.toLowerCase().includes(search.toLowerCase()))
  const myStatus = statusById(profile?.status)

  // Separate chats into sections for better organization
  const dms = filtered.filter((c) => c.type === 'dm' || c.type === 'admission')
  const academics = filtered.filter((c) => c.type === 'group_chat' || c.type === 'group_announcements')
  const communities = filtered.filter((c) => c.type === 'club_chat' || c.type === 'club_announcements')

  return (
    <aside className="sidebar" aria-label="Chats">
      <div className="sidebar-brand">
        <span className="brand-logo-badge" aria-hidden="true">AC</span>
        <span>AdraConnects</span>
      </div>
      <div className="sidebar-header" ref={headerRef}>
        <button
          className="status-trigger"
          aria-label="Set your status"
          onClick={() => setStatusMenu((v) => !v)}
        >
          <Avatar
            name={profile?.full_name}
            size={38}
            online
            status={profile?.status}
            url={profile?.avatar_url}
            color={profile?.avatar_color}
          />
        </button>
        <button
          className="sidebar-me-wrap"
          aria-haspopup="menu"
          aria-expanded={statusMenu}
          onClick={() => setStatusMenu((v) => !v)}
        >
          <span className="sidebar-me">
            {profile?.full_name || 'Member'}
            {isGuest && <span className="guest-tag">Guest</span>}
          </span>
          <span className="sidebar-status" style={{ color: myStatus.color }}>
            {myStatus.label}
            <Icon name="chevron-down" size={12} strokeWidth={2.5} />
          </span>
        </button>

        <div className="sidebar-actions">
          {isEmployee && (
            <button
              className="icon-btn"
              aria-label="Admin panel"
              data-tip="Admin panel"
              onClick={() => navigate('/admin')}
            >
              <Icon name="shield" size={18} />
            </button>
          )}
        </div>

        {statusMenu && (
          <div className="status-menu" role="menu">
            <div className="status-menu-label">Set status</div>
            {STATUSES.map((s) => (
              <button
                key={s.id}
                role="menuitemradio"
                aria-checked={profile?.status === s.id}
                className={`status-option${profile?.status === s.id ? ' selected' : ''}`}
                onClick={() => {
                  updateStatus(s.id)
                  setStatusMenu(false)
                }}
              >
                <span className="status-swatch" style={{ background: s.color }} />
                {s.label}
                {profile?.status === s.id && <Icon name="check" size={14} className="option-check" />}
              </button>
            ))}
            <div className="menu-divider" />
            <button
              role="menuitem"
              className="status-option"
              onClick={() => {
                setModal({ type: 'settings', initialTab: 'profile' })
                setStatusMenu(false)
              }}
            >
              <Icon name="settings" size={14} />
              Profile settings
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-search">
        <div className="search-field">
          <Icon name="search" size={15} />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search chats"
            placeholder="Search chats"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
                e.currentTarget.blur()
              }
            }}
          />
          {search ? (
            <button className="icon-btn search-clear" aria-label="Clear search" onClick={() => setSearch('')}>
              <Icon name="x" size={14} />
            </button>
          ) : (
            <kbd className="search-kbd" aria-hidden="true">/</kbd>
          )}
        </div>
      </div>

      <div className="chat-list">
        {chatsLoading && (
          <div aria-busy="true" aria-label="Loading chats">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-row" style={{ opacity: 1 - i * 0.16 }}>
                <span className="skeleton skeleton-avatar" />
                <span className="skeleton-lines">
                  <span className="skeleton skeleton-line" style={{ width: `${70 - i * 6}%` }} />
                  <span className="skeleton skeleton-line" style={{ width: `${45 + i * 5}%` }} />
                </span>
              </div>
            ))}
          </div>
        )}
        {!chatsLoading && (
          <>
            <ChatSection title="Direct messages" chats={dms} />
            <ChatSection title="Academics" chats={academics} />
            <ChatSection title="Communities" chats={communities} />
            {filtered.length === 0 && (
              <div className="sidebar-empty">
                <Icon name={search ? 'search' : 'inbox'} size={28} strokeWidth={1.6} />
                <strong>{search ? `No chats match “${search}”` : 'No chats yet'}</strong>
                <span>
                  {search
                    ? 'Try a different name, or browse communities.'
                    : 'Join a community or start a direct message to get going.'}
                </span>
                {!search && (
                  <button className="btn-small" onClick={() => setModal('browse')}>
                    <Icon name="compass" size={14} /> Browse communities
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <nav className="sidebar-footer" aria-label="Main">
        <button
          className="icon-btn"
          aria-label="Settings"
          data-tip="Settings"
          data-tip-pos="top"
          onClick={() => setModal({ type: 'settings', initialTab: 'profile' })}
        >
          <Icon name="settings" size={19} />
        </button>
        {!isGuest && (
          <button
            className="icon-btn"
            aria-label="New message"
            data-tip="New message"
            data-tip-pos="top"
            onClick={() => setModal('dm')}
          >
            <Icon name="chat" size={19} />
          </button>
        )}
        <button
          className="icon-btn"
          aria-label="Communities"
          data-tip="Communities"
          data-tip-pos="top"
          onClick={() => setModal('browse')}
        >
          <Icon name="users" size={19} />
        </button>
        <button
          className="icon-btn"
          aria-label="Campus services & alerts"
          data-tip="Services & alerts"
          data-tip-pos="top"
          onClick={() => setModal({ type: 'settings', initialTab: 'services' })}
        >
          <Icon name="bell" size={19} />
        </button>
        <button
          className="icon-btn"
          aria-label="Print"
          data-tip="Print"
          data-tip-pos="top"
          onClick={() => setModal('print')}
        >
          <Icon name="printer" size={19} />
        </button>
        <button
          className="icon-btn logout-btn"
          aria-label="Log out"
          data-tip="Log out"
          data-tip-pos="top"
          onClick={signOut}
        >
          <Icon name="logout" size={19} />
        </button>
      </nav>

      {modal === 'dm' && <NewDmModal onClose={() => setModal(null)} />}
      {modal === 'club' && <NewClubModal onClose={() => setModal(null)} />}
      {modal === 'browse' && (
        <BrowseClubsModal
          onClose={() => setModal(null)}
          onCreateClub={() => setModal('club')}
        />
      )}
      {(modal === 'settings' || modal?.type === 'settings' || modal === 'profile') && (
        <SettingsModal
          initialTab={typeof modal === 'object' ? modal.initialTab : 'profile'}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'print' && (
        <Modal title="Print" onClose={() => setModal(null)}>
          <div className="empty-box">
            <div className="empty-box-icon">
              <Icon name="printer" size={24} />
            </div>
            <p className="empty-box-text">Printing is on its way</p>
            <p className="empty-box-sub">
              We’re still building this feature. Printing will be available in a future update.
            </p>
            <button className="btn-primary" onClick={() => setModal(null)}>Got it</button>
          </div>
        </Modal>
      )}
    </aside>
  )
}
