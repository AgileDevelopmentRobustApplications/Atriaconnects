import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import ChatListItem from './ChatListItem.jsx'
import NewDmModal from './NewDmModal.jsx'
import NewClubModal from './NewClubModal.jsx'
import BrowseClubsModal from './BrowseClubsModal.jsx'

export default function Sidebar() {
  const { profile, signOut, isEmployee } = useAuth()
  const { chats, chatsLoading } = useChat()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // 'dm' | 'club' | 'browse'

  const filtered = chats.filter((c) => c.title?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="sidebar">
      <div className="sidebar-brand">AdraConnects</div>
      <div className="sidebar-header">
        <Avatar name={profile?.full_name} size={38} />
        <span className="sidebar-me">{profile?.full_name}</span>
        <div className="sidebar-actions">
          {isEmployee && (
            <button className="icon-btn" title="Admin panel" onClick={() => navigate('/admin')}>
              <Icon name="shield" />
            </button>
          )}
          <button className="icon-btn" title="New direct message" onClick={() => setModal('dm')}>
            <Icon name="chat" />
          </button>
          <button className="icon-btn" title="Browse clubs" onClick={() => setModal('browse')}>
            <Icon name="compass" />
          </button>
          <button className="icon-btn" title="Create club" onClick={() => setModal('club')}>
            <Icon name="plus" />
          </button>
          <button className="icon-btn" title="Log out" onClick={signOut}>
            <Icon name="logout" />
          </button>
        </div>
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
        {!chatsLoading && filtered.length === 0 && (
          <div className="side-note">
            No chats yet. Create a club, browse clubs or start a direct message from the buttons
            above.
          </div>
        )}
        {filtered.map((chat) => (
          <ChatListItem key={chat.conversation_id} chat={chat} />
        ))}
      </div>

      {modal === 'dm' && <NewDmModal onClose={() => setModal(null)} />}
      {modal === 'club' && <NewClubModal onClose={() => setModal(null)} />}
      {modal === 'browse' && <BrowseClubsModal onClose={() => setModal(null)} />}
    </div>
  )
}
