import { useState } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import Sidebar from '../sidebar/Sidebar.jsx'
import ChatWindow from '../chat/ChatWindow.jsx'
import ClubInfoPanel from '../club/ClubInfoPanel.jsx'
import BrowseClubsModal from '../sidebar/BrowseClubsModal.jsx'
import SettingsModal from '../sidebar/SettingsModal.jsx'
import Icon from '../common/Icon.jsx'

export default function AppLayout() {
  const { profile } = useAuth()
  const { activeChat } = useChat()
  // { clubId, tab: 'members' | 'events' | 'resources' } or null
  const [panel, setPanel] = useState(null)
  const [modal, setModal] = useState(null) // 'browse' | 'settings'

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'User'

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className={`app${activeChat ? ' chat-open' : ''}`}>
      <Sidebar />
      <div className="main-pane">
        {activeChat ? (
          <ChatWindow
            key={activeChat.conversation_id}
            openPanel={(clubId, tab = 'members') => setPanel({ clubId, tab })}
          />
        ) : (
          <div className="welcome-landing-container">
            <div className="welcome-landing-card">
              <div className="welcome-badge">
                <span className="live-pulse" />
                <span>Campus Realtime Hub</span>
              </div>
              <h1 className="welcome-title">Welcome back, {firstName}</h1>
              <p className="welcome-date">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
              <p className="welcome-sub">
                Agile Development & Robust Automations — connect with college clubs, announcements, and your campus community.
              </p>

              <div className="welcome-actions">
                <button className="btn-primary" onClick={() => setModal('settings')}>
                  <Icon name="settings" size={18} />
                  <span>Open Campus Services & Settings</span>
                </button>
                <button className="btn-google" onClick={() => setModal('browse')}>
                  <Icon name="compass" size={18} />
                  <span>Explore Clubs</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {panel && (
        <ClubInfoPanel clubId={panel.clubId} initialTab={panel.tab} onClose={() => setPanel(null)} />
      )}
      {modal === 'browse' && <BrowseClubsModal onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
    </div>
  )
}
