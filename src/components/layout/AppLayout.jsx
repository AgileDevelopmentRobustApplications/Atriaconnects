import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { supabase } from '../../lib/supabase.js'
import Sidebar from '../sidebar/Sidebar.jsx'
import ChatWindow from '../chat/ChatWindow.jsx'
import InfoPanel from '../common/InfoPanel.jsx'
import InstallPwaCard from '../common/InstallPwaCard.jsx'
import Icon from '../common/Icon.jsx'
import Avatar from '../common/Avatar.jsx'
import { useJoinRequests } from '../../context/JoinRequestsContext.jsx'
import { formatChatTime } from '../../lib/format.js'

// Requests this user can approve, surfaced on the home screen.
function PendingRequestsCard() {
  const { pending, decide } = useJoinRequests()
  const [busyId, setBusyId] = useState(null)
  if (pending.length === 0) return null

  async function handleDecide(id, approve) {
    setBusyId(id)
    await decide(id, approve)
    setBusyId(null)
  }

  return (
    <section className="dashboard-card requests-card animate-fade-in" aria-label="Pending join requests">
      <div className="card-header-wrap">
        <Icon name="user" size={18} />
        <h2>Waiting for your approval</h2>
        <span className="tab-badge">{pending.length}</span>
      </div>
      <div className="picker-list">
        {pending.slice(0, 6).map((r) => (
          <div key={r.id} className="picker-item no-click request-row">
            <Avatar name={r.profile?.full_name} size={40} />
            <div className="picker-grow">
              <div className="picker-name">{r.profile?.full_name ?? 'Unknown user'}</div>
              <div className="picker-sub">
                wants to join <strong>{r.club?.name ?? r.group?.name}</strong> ·{' '}
                {formatChatTime(r.requested_at)}
              </div>
            </div>
            <div className="picker-actions">
              <button className="btn-small" disabled={busyId === r.id} onClick={() => handleDecide(r.id, true)}>
                <Icon name="check" size={14} /> Approve
              </button>
              <button
                className="btn-small danger"
                disabled={busyId === r.id}
                onClick={() => handleDecide(r.id, false)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
      {pending.length > 6 && (
        <p className="side-note">
          +{pending.length - 6} more — open the community’s info panel to review them all.
        </p>
      )}
    </section>
  )
}

function DateTile({ date }) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return (
    <div className="date-tile" aria-hidden="true">
      <span className="date-tile-month">{format(d, 'MMM')}</span>
      <span className="date-tile-day">{format(d, 'd')}</span>
    </div>
  )
}

function WelcomeDashboard() {
  const { profile, isGuest } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      try {
        const [eventsRes] = await Promise.all([
          supabase
            .from('events')
            .select('*, club:clubs(name)')
            .gt('starts_at', new Date().toISOString())
            .order('starts_at', { ascending: true })
            .limit(3),
        ])

        if (active) {
          setEvents(eventsRes?.data ?? [])
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => { active = false }
  }, [])

  const formatWhen = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return format(d, 'EEE · h:mm a')
  }

  // Sidebar owns these modals; it listens for this event.
  const triggerModal = (name) => {
    window.dispatchEvent(new CustomEvent('open-modal', { detail: name }))
  }

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'there'

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const actions = [
    { id: 'browse', icon: 'compass', title: 'Explore communities', sub: 'Find clubs and academic groups' },
    ...(!isGuest
      ? [{ id: 'dm', icon: 'chat', title: 'New message', sub: 'Start a direct conversation' }]
      : []),
    { id: 'profile', icon: 'settings', title: 'Settings', sub: 'Photo, status and appearance' },
  ]

  return (
    <div className="dashboard-container">
      <div className="dashboard-inner">
        <header className="dashboard-header animate-fade-in">
          <div>
            <div className="dashboard-eyebrow">
              <span className="live-pulse" aria-hidden="true" />
              {format(new Date(), 'EEEE, MMMM d')}
            </div>
            <h1>
              {greeting()}, <span className="greeting-name">{firstName}</span>
            </h1>
            <p className="dashboard-subtitle">
              Pick a chat from the sidebar, or catch up on what&apos;s coming up.
            </p>
          </div>
        </header>

        <PendingRequestsCard />

        <div className="dashboard-grid">
          <section className="dashboard-card events-card animate-fade-in delay-1">
            <div className="card-header-wrap">
              <Icon name="calendar" size={18} />
              <h2>Upcoming events</h2>
              {!loading && events.length > 0 && (
                <span className="card-header-count">Next {events.length}</span>
              )}
            </div>
            {loading ? (
              <div className="dashboard-list" aria-busy="true" aria-label="Loading events">
                {[0, 1].map((i) => (
                  <div key={i} className="dashboard-item-row">
                    <span className="skeleton" style={{ width: 48, height: 50, borderRadius: 10 }} />
                    <div className="skeleton-lines">
                      <span className="skeleton skeleton-line" style={{ width: '30%' }} />
                      <span className="skeleton skeleton-line" style={{ width: '70%', height: 13 }} />
                      <span className="skeleton skeleton-line" style={{ width: '45%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="dashboard-empty-state">
                <div className="empty-box-icon">
                  <Icon name="calendar" size={20} />
                </div>
                <div>
                  <strong>Nothing on the calendar</strong>
                  When your communities schedule events, they&apos;ll show up here.
                </div>
              </div>
            ) : (
              <div className="dashboard-list">
                {events.map((ev) => (
                  <div key={ev.id} className="dashboard-item-row">
                    <DateTile date={ev.starts_at} />
                    <div className="item-details">
                      <div className="item-badge">{ev.club?.name || 'Community'}</div>
                      <h3>{ev.title}</h3>
                      <p className="item-meta">
                        <span>
                          <Icon name="clock" size={12} /> {formatWhen(ev.starts_at)}
                        </span>
                        {ev.location && (
                          <span>
                            <Icon name="pin" size={12} /> {ev.location}
                          </span>
                        )}
                      </p>
                      {ev.description && <p className="item-desc">{ev.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-card actions-card animate-fade-in delay-2">
            <div className="card-header-wrap">
              <Icon name="compass" size={18} />
              <h2>Quick actions</h2>
            </div>
            <div className="actions-button-grid">
              {actions.map((a) => (
                <button key={a.id} className="action-card-btn" onClick={() => triggerModal(a.id)}>
                  <span className="action-icon">
                    <Icon name={a.icon} size={18} />
                  </span>
                  <div>
                    <h3>{a.title}</h3>
                    <p>{a.sub}</p>
                  </div>
                  <Icon name="arrow-right" size={16} className="action-arrow" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="dashboard-footer animate-fade-in delay-3">
          <InstallPwaCard />
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { activeChat } = useChat()
  const [openPanel, setPanel] = useState(null) // { conversationId, clubId, groupId, tab }
  // The panel belongs to the conversation it was opened from; switching chats hides it.
  const panel = openPanel?.conversationId === activeChat?.conversation_id ? openPanel : null

  return (
    <div className={`app${activeChat ? ' chat-open' : ''}`}>
      <Sidebar />
      <main className="main-pane">
        {activeChat ? (
          <ChatWindow
            key={activeChat.conversation_id}
            openPanel={({ clubId, groupId }, tab) =>
              setPanel({ conversationId: activeChat.conversation_id, clubId, groupId, tab })
            }
          />
        ) : (
          <WelcomeDashboard />
        )}
      </main>
      {panel && (
        <InfoPanel
          key={`${panel.clubId ?? panel.groupId}:${panel.tab}`}
          clubId={panel.clubId}
          clubName=""
          groupId={panel.groupId}
          initialTab={panel.tab}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}
