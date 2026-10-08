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
import NotificationsModal from './NotificationsModal.jsx'
import { readNewsSeenAt } from '../../lib/news.js'
import Modal from '../common/Modal.jsx'

// The chat list is split into three sections; only the selected one is shown.
const SECTIONS = [
  { id: 'dms', label: 'DMs', title: 'Direct messages', types: ['dm', 'admission'] },
  { id: 'academics', label: 'Academics', title: 'Academics', types: ['group_chat', 'group_announcements'] },
  { id: 'communities', label: 'Communities', title: 'Communities', types: ['club_chat', 'club_announcements'] },
]
const SECTION_KEY = 'sidebar-section'
const sectionOf = (chat) => SECTIONS.find((s) => s.types.includes(chat?.type))?.id

function readStoredSection() {
  try {
    const id = localStorage.getItem(SECTION_KEY)
    return SECTIONS.some((s) => s.id === id) ? id : 'dms'
  } catch {
    return 'dms'
  }
}

export default function Sidebar() {
  const { profile, signOut, isEmployee, isGuest, updateStatus } = useAuth()
  const { chats, chatsLoading, activeChat } = useChat()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // 'dm' | 'club' | 'browse' | 'settings' | 'print'
  const [statusMenu, setStatusMenu] = useState(false)
  const [section, setSectionState] = useState(readStoredSection)
  // Unseen college news → dot on the bell. Refreshed when Notifications opens.
  const [newsSeenAt, setNewsSeenAt] = useState(readNewsSeenAt)
  useEffect(() => {
    const onSeen = () => setNewsSeenAt(readNewsSeenAt())
    window.addEventListener('news-seen', onSeen)
    return () => window.removeEventListener('news-seen', onSeen)
  }, [])
  const setSection = (id) => {
    setSectionState(id)
    try {
      localStorage.setItem(SECTION_KEY, id)
    } catch {
      /* preference lasts for this session only */
    }
  }

  // When a chat in another section becomes active (e.g. a new DM was just
  // started from a modal), follow it so the open chat is always visible.
  const activeSection = sectionOf(activeChat)
  const [followedChat, setFollowedChat] = useState(activeChat?.conversation_id)
  if (activeChat?.conversation_id !== followedChat) {
    setFollowedChat(activeChat?.conversation_id)
    if (activeSection && activeSection !== section) setSectionState(activeSection)
  }
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

  const hasUnseenNews = chats.some(
    (c) =>
      (c.type === 'club_announcements' || c.type === 'group_announcements') &&
      c.last_message_at &&
      c.last_sender_id !== profile?.id &&
      new Date(c.last_message_at).getTime() > newsSeenAt
  )
  const current = SECTIONS.find((s) => s.id === section)
  const visible = filtered.filter((c) => current.types.includes(c.type))
  const stats = Object.fromEntries(
    SECTIONS.map((s) => [
      s.id,
      {
        unread: chats
          .filter((c) => s.types.includes(c.type))
          .reduce((n, c) => n + Number(c.unread_count || 0), 0),
        matches: filtered.filter((c) => s.types.includes(c.type)).length,
      },
    ])
  )
  const sectionIndex = SECTIONS.findIndex((s) => s.id === section)

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
          <button
            className="icon-btn"
            aria-label="Settings"
            data-tip="Settings"
            onClick={() => setModal({ type: 'settings', initialTab: 'profile' })}
          >
            <Icon name="settings" size={18} />
          </button>
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

      <div
        className="sidebar-tabs"
        role="tablist"
        aria-label="Chat sections"
        style={{ '--tab-index': sectionIndex }}
        onKeyDown={(e) => {
          const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
          if (!step) return
          e.preventDefault()
          const next = SECTIONS[(sectionIndex + step + SECTIONS.length) % SECTIONS.length]
          setSection(next.id)
          e.currentTarget.querySelector(`[data-section="${next.id}"]`)?.focus()
        }}
      >
        <span className="sidebar-tab-indicator" aria-hidden="true" />
        {SECTIONS.map((s) => {
          const { unread, matches } = stats[s.id]
          const selected = s.id === section
          return (
            <button
              key={s.id}
              role="tab"
              id={`section-tab-${s.id}`}
              aria-selected={selected}
              aria-controls="chat-list-panel"
              tabIndex={selected ? 0 : -1}
              data-section={s.id}
              className={`sidebar-tab${selected ? ' active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <span>{s.label}</span>
              {search ? (
                <span className="sidebar-tab-count">{matches}</span>
              ) : (
                unread > 0 && (
                  <span key={unread} className="sidebar-tab-unread" aria-label={`${unread} unread`}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                )
              )}
            </button>
          )
        })}
      </div>

      <div
        className="chat-list"
        id="chat-list-panel"
        role="tabpanel"
        aria-labelledby={`section-tab-${section}`}
      >
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
            <div className="chat-section" key={section}>
              {visible.map((chat) => (
                <ChatListItem key={chat.conversation_id} chat={chat} />
              ))}
            </div>
            {visible.length === 0 && (
              <div className="sidebar-empty">
                <Icon
                  name={search ? 'search' : section === 'dms' ? 'chat' : section === 'academics' ? 'book' : 'users'}
                  size={28}
                  strokeWidth={1.6}
                />
                <strong>
                  {search
                    ? `No ${current.title.toLowerCase()} match “${search}”`
                    : section === 'dms'
                    ? 'No direct messages yet'
                    : section === 'academics'
                    ? 'No academic groups yet'
                    : 'No communities yet'}
                </strong>
                <span>
                  {search
                    ? SECTIONS.filter((s) => s.id !== section && stats[s.id].matches > 0)
                        .map((s) => `${stats[s.id].matches} in ${s.label}`)
                        .join(' · ') || 'Try a different name.'
                    : section === 'dms'
                    ? 'Start a one-to-one conversation with anyone on campus.'
                    : section === 'academics'
                    ? 'Class groups you belong to will appear here. Staff add members, or you can request to join.'
                    : 'Clubs you join will appear here.'}
                </span>
                {!search && section === 'dms' && !isGuest && (
                  <button className="btn-small" onClick={() => setModal('dm')}>
                    <Icon name="plus" size={14} /> New message
                  </button>
                )}
                {!search && section !== 'dms' && (
                  <button
                    className="btn-small"
                    onClick={() =>
                      setModal({ type: 'browse', tab: section === 'academics' ? 'groups' : 'communities' })
                    }
                  >
                    <Icon name="compass" size={14} /> Browse {section === 'academics' ? 'groups' : 'communities'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <nav className="sidebar-footer" aria-label="Main">
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
          aria-label={hasUnseenNews ? 'Notifications — new college news' : 'Notifications'}
          data-tip="Notifications"
          data-tip-pos="top"
          onClick={() => setModal('notifications')}
        >
          <Icon name="bell" size={19} />
          {hasUnseenNews && <span className="icon-dot" aria-hidden="true" />}
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
      {(modal === 'browse' || modal?.type === 'browse') && (
        <BrowseClubsModal
          initialTab={modal?.tab}
          onClose={() => setModal(null)}
          onCreateClub={() => setModal('club')}
        />
      )}
      {(modal === 'settings' || modal?.type === 'settings' || modal === 'profile') && (
        <SettingsModal onClose={() => setModal(null)} />
      )}
      {modal === 'notifications' && <NotificationsModal onClose={() => setModal(null)} />}
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
