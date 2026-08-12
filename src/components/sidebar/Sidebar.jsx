import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { STATUSES, statusById } from '../../lib/status.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import ChatListItem from './ChatListItem.jsx'
import NewDmModal from './NewDmModal.jsx'
import NewClubModal from './NewClubModal.jsx'
import BrowseModal from './BrowseModal.jsx'
import ProfileSettingsModal from '../auth/ProfileSettingsModal.jsx'
import CanteenModal from '../canteen/CanteenModal.jsx'

export default function Sidebar() {
  const { profile, signOut, isEmployee, isGuest, updateStatus } = useAuth()
  const { chats, chatsLoading } = useChat()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // 'dm' | 'club' | 'browse' | 'profile' | 'canteen'
  const [statusMenu, setStatusMenu] = useState(false)

  useEffect(() => {
    const handleOpenModal = (e) => setModal(e.detail)
    window.addEventListener('open-modal', handleOpenModal)
    return () => window.removeEventListener('open-modal', handleOpenModal)
  }, [])

  const filtered = chats.filter((c) => c.title?.toLowerCase().includes(search.toLowerCase()))
  const myStatus = statusById(profile?.status)

  // Separate chats into sections for better organization
  const dms = filtered.filter((c) => c.type === 'dm' || c.type === 'admission')
  const academics = filtered.filter((c) => c.type === 'group_chat' || c.type === 'group_announcements')
  const communities = filtered.filter((c) => c.type === 'club_chat' || c.type === 'club_announcements')

  return (
    <div className="sidebar">
      <div className="sidebar-brand">AdraConnects</div>
      <div className="sidebar-header">
        <button
          className="status-trigger"
          title="Set your status"
          onClick={() => setStatusMenu((v) => !v)}
        >
          <Avatar name={profile?.full_name} url={profile?.avatar_url} size={38} online status={profile?.status} />
        </button>
        <div className="sidebar-me-wrap" onClick={() => setStatusMenu((v) => !v)}>
          <span className="sidebar-me">
            {profile?.full_name}
            {isGuest && <span className="guest-tag">Guest</span>}
          </span>
          <span className="sidebar-status" style={{ color: myStatus.color }}>
            {myStatus.label} ▾
          </span>
        </div>
        <div className="sidebar-actions">
          {isEmployee && (
            <button className="icon-btn" title="Admin panel" onClick={() => navigate('/admin')}>
              <Icon name="shield" />
            </button>
          )}
          {!isGuest && (
            <button className="icon-btn" title="New direct message" onClick={() => setModal('dm')}>
              <Icon name="chat" />
            </button>
          )}
          <button className="icon-btn" title="Browse" onClick={() => setModal('browse')}>
            <Icon name="compass" />
          </button>
          <button className="icon-btn" title="Canteen" onClick={() => setModal('canteen')}>
            <Icon name="coffee" />
          </button>
          {!isGuest && (
            <button className="icon-btn" title="Create community" onClick={() => setModal('club')}>
              <Icon name="plus" />
            </button>
          )}
          <button className="icon-btn" title="Log out" onClick={signOut}>
            <Icon name="logout" />
          </button>
        </div>
        {statusMenu && (
          <div className="status-menu" onMouseLeave={() => setStatusMenu(false)}>
            {STATUSES.map((s) => (
              <button
                key={s.id}
                className={`status-option${profile?.status === s.id ? ' selected' : ''}`}
                onClick={() => {
                  updateStatus(s.id)
                  setStatusMenu(false)
                }}
              >
                <span className="status-swatch" style={{ background: s.color }} />
                {s.label}
              </button>
            ))}
            <div className="menu-divider" />
            <button
              className="status-option"
              onClick={() => {
                setModal('profile')
                setStatusMenu(false)
              }}
            >
              <Icon name="smartphone" size={14} style={{ marginRight: 8 }} />
              Profile settings
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-search">
        <input
          placeholder="Search chats"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="chat-list">
        {chatsLoading && <div className="side-note">Loading chats…</div>}
        {!chatsLoading && (
          <>
            {dms.length > 0 && (
              <div className="chat-section">
                <div className="chat-section-header">Direct Messages</div>
                {dms.map((chat) => (
                  <ChatListItem key={chat.conversation_id} chat={chat} />
                ))}
              </div>
            )}
            {academics.length > 0 && (
              <div className="chat-section">
                <div className="chat-section-header">Academics</div>
                {academics.map((chat) => (
                  <ChatListItem key={chat.conversation_id} chat={chat} />
                ))}
              </div>
            )}
            {communities.length > 0 && (
              <div className="chat-section">
                <div className="chat-section-header">Communities</div>
                {communities.map((chat) => (
                  <ChatListItem key={chat.conversation_id} chat={chat} />
                ))}
              </div>
            )}
            {filtered.length === 0 && (
              <div className="side-note">
                No chats found. Browse communities or start a direct message.
              </div>
            )}
          </>
        )}
      </div>

      {modal === 'dm' && <NewDmModal onClose={() => setModal(null)} />}
      {modal === 'club' && <NewClubModal onClose={() => setModal(null)} />}
      {modal === 'browse' && <BrowseModal onClose={() => setModal(null)} />}
      {modal === 'profile' && <ProfileSettingsModal onClose={() => setModal(null)} />}
      {modal === 'canteen' && <CanteenModal onClose={() => setModal(null)} />}
    </div>
  )
}
