import { useState } from 'react'
import { useChat } from '../../context/ChatContext.jsx'
import Sidebar from '../sidebar/Sidebar.jsx'
import ChatWindow from '../chat/ChatWindow.jsx'
import ClubInfoPanel from '../club/ClubInfoPanel.jsx'
import Icon from '../common/Icon.jsx'

export default function AppLayout() {
  const { activeChat } = useChat()
  // { clubId, tab: 'members' | 'events' | 'resources' } or null
  const [panel, setPanel] = useState(null)

  return (
    <div className="app">
      <Sidebar />
      <div className="main-pane">
        {activeChat ? (
          <ChatWindow
            key={activeChat.conversation_id}
            openPanel={(clubId, tab = 'members') => setPanel({ clubId, tab })}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-mark">
              <Icon name="chat" size={56} strokeWidth={1.4} />
            </div>
            <h2>ClubConnect</h2>
            <p>
              Direct messages, club chats, announcements,
              <br />
              events and shared resources — all in one place.
            </p>
            <p className="empty-hint">Select a chat to start messaging</p>
          </div>
        )}
      </div>
      {panel && (
        <ClubInfoPanel clubId={panel.clubId} initialTab={panel.tab} onClose={() => setPanel(null)} />
      )}
    </div>
  )
}
