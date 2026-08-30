import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { supabase } from '../../lib/supabase.js'
import Sidebar from '../sidebar/Sidebar.jsx'
import ChatWindow from '../chat/ChatWindow.jsx'
import InfoPanel from '../common/InfoPanel.jsx'
import BrowseClubsModal from '../sidebar/BrowseClubsModal.jsx'
import SettingsModal from '../sidebar/SettingsModal.jsx'
import InstallPwaCard from '../common/InstallPwaCard.jsx'
import Icon from '../common/Icon.jsx'

function WelcomeDashboard() {
  const { profile } = useAuth()
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

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return d.toLocaleDateString()
  }

  const triggerModal = (name) => {
    window.dispatchEvent(new CustomEvent('open-modal', { detail: name }))
  }

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Member'

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="dashboard-container">
      {/* Header section */}
      <header className="dashboard-header animate-fade-in">
        <div className="dashboard-welcome">
          <span className="waving-hand">👋</span>
          <div>
            <h1>{greeting()}, {firstName}</h1>
            <p className="dashboard-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
      </header>

      {/* Grid Content */}
      <div className="dashboard-grid">
        {/* Events Card */}
        <section className="dashboard-card events-card animate-fade-in delay-1">
          <div className="card-header-wrap">
            <Icon name="calendar" size={20} />
            <h2>Upcoming Campus Events</h2>
          </div>
          {loading ? (
            <div className="dashboard-loading">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="dashboard-empty-state">No upcoming events scheduled.</div>
          ) : (
            <div className="dashboard-list">
              {events.map((ev) => (
                <div key={ev.id} className="dashboard-item-row">
                  <div className="item-badge">{ev.club?.name || 'Community'}</div>
                  <div className="item-details">
                    <h3>{ev.title}</h3>
                    <p className="item-meta">
                      <span>📍 {ev.location}</span>
                      <span>📅 {formatDate(ev.starts_at)}</span>
                    </p>
                    {ev.description && <p className="item-desc">{ev.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions Card */}
        <section className="dashboard-card actions-card animate-fade-in delay-3">
          <div className="card-header-wrap">
            <Icon name="compass" size={20} />
            <h2>Quick Actions</h2>
          </div>
          <div className="actions-button-grid">
            <button className="action-card-btn" onClick={() => triggerModal('browse')}>
              <span className="action-icon">🔍</span>
              <div>
                <h3>Explore Clubs</h3>
                <p>Find new communities</p>
              </div>
            </button>
            <button className="action-card-btn" onClick={() => triggerModal('profile')}>
              <span className="action-icon">⚙️</span>
              <div>
                <h3>Settings</h3>
                <p>Update photo & password</p>
              </div>
            </button>
          </div>
        </section>
      </div>

      <div className="dashboard-footer animate-fade-in delay-4">
        <InstallPwaCard />
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { activeChat } = useChat()
  const [panel, setPanel] = useState(null)
  const [modal, setModal] = useState(null) // 'browse' | 'settings'

  useEffect(() => {
    const handleOpenModal = (e) => {
      if (e.detail === 'browse') setModal('browse')
      else if (e.detail === 'settings' || e.detail === 'profile') setModal('settings')
    }
    window.addEventListener('open-modal', handleOpenModal)
    return () => window.removeEventListener('open-modal', handleOpenModal)
  }, [])

  return (
    <div className={`app${activeChat ? ' chat-open' : ''}`}>
      <Sidebar />
      <div className="main-pane">
        {activeChat ? (
          <ChatWindow key={activeChat.conversation_id} openPanel={setPanel} />
        ) : (
          <WelcomeDashboard />
        )}
      </div>
      {panel && (
        <InfoPanel
          clubId={panel.clubId}
          clubName=""
          groupId={panel.groupId}
          initialTab={panel.tab}
          onClose={() => setPanel(null)}
        />
      )}
      {modal === 'browse' && <BrowseClubsModal onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
    </div>
  )
}