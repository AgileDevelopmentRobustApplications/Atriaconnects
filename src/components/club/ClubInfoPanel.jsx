import { useState } from 'react'
import { useClub } from '../../hooks/useClub.js'
import { useChat } from '../../context/ChatContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import MembersTab from './MembersTab.jsx'
import EventsTab from './EventsTab.jsx'
import ResourcesTab from './ResourcesTab.jsx'

const TABS = [
  { id: 'members', label: 'Members' },
  { id: 'events', label: 'Events' },
  { id: 'resources', label: 'Resources' },
]

export default function ClubInfoPanel({ clubId, initialTab = 'members', onClose }) {
  const [tab, setTab] = useState(initialTab)
  const clubState = useClub(clubId)
  const { club, members, myRole, leaveClub } = clubState
  const { refreshChats, closeConversation } = useChat()

  async function handleLeave() {
    if (!confirm(`Leave ${club?.name}?`)) return
    await leaveClub()
    closeConversation()
    await refreshChats()
    onClose()
  }

  return (
    <div className="club-panel">
      <div className="club-panel-header">
        <button className="icon-btn" onClick={onClose} title="Close">
          <Icon name="x" />
        </button>
        <span>Club info</span>
      </div>

      <div className="club-panel-hero">
        <Avatar name={club?.name} color={club?.avatar_color} size={72} />
        <h3>{club?.name}</h3>
        {club?.description && <p className="club-desc">{club.description}</p>}
        <p className="picker-sub">
          {members.length} member{members.length === 1 ? '' : 's'}
          {myRole === 'admin' ? ' · You are an admin' : ''}
        </p>
      </div>

      <div className="club-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`club-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="club-panel-body">
        {tab === 'members' && <MembersTab clubState={clubState} />}
        {tab === 'events' && <EventsTab clubId={clubId} isAdmin={myRole === 'admin'} />}
        {tab === 'resources' && <ResourcesTab clubId={clubId} />}
      </div>

      <div className="club-panel-footer">
        <button className="btn-danger" onClick={handleLeave}>
          Leave club
        </button>
      </div>
    </div>
  )
}
