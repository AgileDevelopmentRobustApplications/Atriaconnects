import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useClub } from '../../hooks/useClub.js'
import { useAcademicGroup } from '../../hooks/useAcademicGroup.js'
import { useChat } from '../../context/ChatContext.jsx'
import { supabase } from '../../lib/supabase.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import MembersTab from '../club/MembersTab.jsx'
import EventsTab from '../club/EventsTab.jsx'
import ResourcesTab from '../club/ResourcesTab.jsx'
import RequestsTab from '../club/RequestsTab.jsx'
import GroupMembersTab from '../academic/GroupMembersTab.jsx'
import NewClubModal from '../sidebar/NewClubModal.jsx'

// Polymorphic info panel — renders a club or academic group's info depending
// on the props. Both panels share Members + Events (where applicable); groups
// have no Resources tab or join requests (members are staff-managed).
export default function InfoPanel({ clubId, groupId, initialTab = 'members', onClose }) {
  const { isEmployee } = useAuth()
  const clubState = useClub(clubId)
  const groupState = useAcademicGroup(groupId)
  const { refreshChats, closeConversation } = useChat()
  const [tab, setTab] = useState(initialTab)
  const [subClubOpen, setSubClubOpen] = useState(false)

  const isClub = Boolean(clubId)
  const isGroup = Boolean(groupId)

  const club = clubState.club
  const group = groupState.group
  const myRole = isClub ? clubState.myRole : groupState.myRole
  const memberCount = isClub ? clubState.members.length : groupState.members.length

  const canModerate = myRole === 'admin' || isEmployee

  let TABS
  if (isClub) {
    TABS = [
      { id: 'members', label: 'Members' },
      { id: 'events', label: 'Events' },
      { id: 'resources', label: 'Resources' },
      ...(canModerate ? [{ id: 'requests', label: 'Requests' }] : []),
    ]
  } else {
    TABS = [
      { id: 'members', label: 'Members' },
      { id: 'events', label: 'Events' },
    ]
  }

  async function handleLeave() {
    const name = isClub ? club?.name : group?.name
    if (!confirm(`Leave ${name}?`)) return
    if (isClub) {
      await clubState.leaveClub()
    } else {
      await supabase
        .from('academic_group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', (await supabase.auth.getUser()).data.user.id)
      await groupState.reload()
    }
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
        <span>{isGroup ? 'Group info' : 'Club info'}</span>
      </div>

      <div className="club-panel-hero">
        <Avatar
          name={isClub ? club?.name : group?.name}
          color={isClub ? club?.avatar_color : group?.avatar_color}
          size={72}
        />
        <h3>{isClub ? club?.name : group?.name}</h3>
        {isClub ? (
          club?.description && <p className="club-desc">{club.description}</p>
        ) : (
          group?.description && <p className="club-desc">{group.description}</p>
        )}
        <p className="picker-sub">
          {memberCount} member{memberCount === 1 ? '' : 's'}
          {myRole === 'admin' ? ' · You are an admin' : ''}
        </p>
        {isClub && myRole === 'admin' && (
          <button className="btn-small" style={{ marginTop: 8 }} onClick={() => setSubClubOpen(true)}>
            + Create Sub-group
          </button>
        )}
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
        {tab === 'members' &&
          (isClub ? (
            <MembersTab clubState={clubState} />
          ) : (
            <GroupMembersTab groupState={groupState} isAdmin={canModerate} />
          ))}
        {tab === 'events' && (
          <EventsTab
            clubId={clubId}
            groupId={groupId}
            isAdmin={canModerate}
          />
        )}
        {tab === 'resources' && isClub && <ResourcesTab clubId={clubId} />}
        {tab === 'requests' && isClub && canModerate && (
          <RequestsTab clubId={clubId} onDecided={() => clubState.refresh()} />
        )}
      </div>

      <div className="club-panel-footer">
        <button className="btn-danger" onClick={handleLeave}>
          {isGroup ? 'Leave group' : 'Leave club'}
        </button>
      </div>

      {subClubOpen && (
        <NewClubModal
          parentId={club.id}
          parentName={club.name}
          onClose={() => setSubClubOpen(false)}
        />
      )}
    </div>
  )
}