import { useState } from 'react'
import { useChat } from '../../context/ChatContext.jsx'
import Sidebar from '../sidebar/Sidebar.jsx'
import ChatWindow from '../chat/ChatWindow.jsx'
import InfoPanel from '../common/InfoPanel.jsx'
import InstallPwaCard from '../common/InstallPwaCard.jsx'
import Icon from '../common/Icon.jsx'

export default function AppLayout() {
  const { activeChat } = useChat()
  // panel: { clubId?, groupId?, tab } | null
  const [panel, setPanel] = useState(null)

  return (
    <div className={`app${activeChat ? ' chat-open' : ''}`}>
      <Sidebar />
      <div className="main-pane">
        {activeChat ? (
          <ChatWindow key={activeChat.conversation_id} openPanel={setPanel} />
        ) : (
          <div className="empty-state">
            <div className="empty-mark">
              <Icon name="chat" size={56} strokeWidth={1.4} />
            </div>
            <h2>AdraConnects</h2>
            <p className="empty-tagline">Agile Development · Robust Automations</p>
            <p>
              Direct messages, club chats, announcements,
              <br />
              events and shared resources — all in one place.
            </p>
            <p className="empty-hint">Select a chat to start messaging</p>
            <InstallPwaCard />
          </div>
        )}
      </div>
      {panel && (
        <InfoPanel
          clubId={panel.clubId}
          groupId={panel.groupId}
          initialTab={panel.tab}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}