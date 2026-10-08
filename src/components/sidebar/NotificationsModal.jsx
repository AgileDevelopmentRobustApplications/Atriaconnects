import { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { supabase } from '../../lib/supabase.js'
import { useChat } from '../../context/ChatContext.jsx'
import { formatChatTime } from '../../lib/format.js'
import Modal from '../common/Modal.jsx'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import DateTile from '../common/DateTile.jsx'
import { markNewsSeen, readNewsSeenAt } from '../../lib/news.js'

// Two parts: upcoming events from the user's communities/groups, and college
// news — recent posts in the announcement channels they belong to (including
// staff broadcasts from Admin → Announcements).

const ANNOUNCEMENT_TYPES = ['club_announcements', 'group_announcements']
const BROADCAST_WINDOW_MS = 2 * 60 * 1000

export default function NotificationsModal({ onClose }) {
  const { chats, openConversation } = useChat()
  // Captured on open, so items that were new stay marked while the window is up.
  const [seenAt] = useState(readNewsSeenAt)

  const channels = useMemo(
    () => chats.filter((c) => ANNOUNCEMENT_TYPES.includes(c.type)),
    [chats]
  )
  const channelIds = channels.map((c) => c.conversation_id).join(',')
  const hasNewNews = channels.some(
    (c) => c.last_message_at && new Date(c.last_message_at).getTime() > seenAt
  )
  const [tab, setTab] = useState(hasNewNews ? 'news' : 'events')

  const [events, setEvents] = useState(null) // null = loading
  const [news, setNews] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    supabase
      .from('events')
      .select('id, title, starts_at, location, description, club:clubs(id, name), group:academic_groups(id, name)')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(25)
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) {
          console.error('Notifications: failed to load events', err)
          setError(err.message)
        }
        setEvents(data ?? [])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const ids = channelIds ? channelIds.split(',') : []
    if (ids.length === 0) {
      Promise.resolve().then(() => active && setNews([]))
      return () => {
        active = false
      }
    }
    supabase
      .from('messages')
      .select(
        'id, conversation_id, content, created_at, sender_id, attachment_name, sender:profiles!sender_id(id, full_name, avatar_url, avatar_color)'
      )
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) {
          console.error('Notifications: failed to load news', err)
          setError(err.message)
        }
        setNews(data ?? [])
      })
    return () => {
      active = false
    }
  }, [channelIds])

  // Opening the window counts as having seen the news.
  useEffect(() => {
    markNewsSeen()
  }, [])

  const channelById = useMemo(
    () => new Map(channels.map((c) => [c.conversation_id, c])),
    [channels]
  )

  // The same post sent to several channels at once reads as one news item.
  const newsItems = useMemo(() => {
    const out = []
    for (const m of news ?? []) {
      const last = out[out.length - 1]
      if (
        last &&
        last.sender_id === m.sender_id &&
        last.content === m.content &&
        Math.abs(new Date(last.created_at) - new Date(m.created_at)) < BROADCAST_WINDOW_MS
      ) {
        last.channels.push(m.conversation_id)
      } else {
        out.push({ ...m, channels: [m.conversation_id] })
      }
    }
    return out
  }, [news])

  const now = new Date()
  const thisWeek = (events ?? []).filter((e) => differenceInCalendarDays(new Date(e.starts_at), now) < 7)
  const later = (events ?? []).filter((e) => differenceInCalendarDays(new Date(e.starts_at), now) >= 7)
  const newCount = newsItems.filter((n) => new Date(n.created_at).getTime() > seenAt).length

  function openChannel(conversationId) {
    openConversation(conversationId)
    onClose()
  }

  const renderEvent = (ev) => (
    <div key={ev.id} className="dashboard-item-row notif-event">
      <DateTile date={ev.starts_at} />
      <div className="item-details">
        <div className="item-badge">{ev.club?.name ?? ev.group?.name ?? 'Community'}</div>
        <h3>{ev.title}</h3>
        <p className="item-meta">
          <span>
            <Icon name="clock" size={12} /> {format(new Date(ev.starts_at), 'EEE, MMM d · h:mm a')}
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
  )

  return (
    <Modal title="Notifications" onClose={onClose} wide className="notifications-modal">
      <div className="notif-tabs club-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'events'}
          className={`club-tab${tab === 'events' ? ' active' : ''}`}
          onClick={() => setTab('events')}
        >
          <Icon name="calendar" size={15} /> Upcoming events
          {events?.length > 0 && <span className="notif-count">{events.length}</span>}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'news'}
          className={`club-tab${tab === 'news' ? ' active' : ''}`}
          onClick={() => setTab('news')}
        >
          <Icon name="megaphone" size={15} /> College news
          {newCount > 0 && <span className="tab-badge">{newCount} new</span>}
        </button>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 12 }}>Some items couldn’t load: {error}</div>}

      <div className="notif-pane" key={tab} role="tabpanel">
        {tab === 'events' &&
          (events === null ? (
            <NotifSkeleton />
          ) : events.length === 0 ? (
            <div className="empty-box">
              <div className="empty-box-icon">
                <Icon name="calendar" size={22} />
              </div>
              <p className="empty-box-text">Nothing on the calendar</p>
              <p className="empty-box-sub">
                Events scheduled in your communities and academic groups will show up here.
              </p>
            </div>
          ) : (
            <>
              {thisWeek.length > 0 && <div className="events-section">This week</div>}
              <div className="dashboard-list">{thisWeek.map(renderEvent)}</div>
              {later.length > 0 && <div className="events-section">Later</div>}
              <div className="dashboard-list">{later.map(renderEvent)}</div>
            </>
          ))}

        {tab === 'news' &&
          (news === null ? (
            <NotifSkeleton />
          ) : newsItems.length === 0 ? (
            <div className="empty-box">
              <div className="empty-box-icon">
                <Icon name="megaphone" size={22} />
              </div>
              <p className="empty-box-text">No college news yet</p>
              <p className="empty-box-sub">
                Announcements from your communities, academic groups and college staff will appear here.
              </p>
            </div>
          ) : (
            <div className="announce-feed">
              {newsItems.map((n) => {
                const chans = n.channels.map((id) => channelById.get(id)).filter(Boolean)
                const isNew = new Date(n.created_at).getTime() > seenAt
                return (
                  <article key={n.id} className={`announce-card notif-news${isNew ? ' is-new' : ''}`}>
                    <header className="announce-card-head">
                      <Avatar
                        name={n.sender?.full_name}
                        url={n.sender?.avatar_url}
                        color={n.sender?.avatar_color}
                        size={34}
                      />
                      <div className="picker-grow">
                        <span className="picker-name">{n.sender?.full_name ?? 'Unknown'}</span>
                        <span className="picker-sub">{formatChatTime(n.created_at)}</span>
                      </div>
                      {isNew && <span className="pill-badge green">New</span>}
                    </header>
                    {n.content && <p className="announce-body">{n.content}</p>}
                    {n.attachment_name && (
                      <p className="announce-attachment">
                        <Icon name="paperclip" size={13} /> {n.attachment_name}
                      </p>
                    )}
                    <div className="chip-row">
                      {chans.slice(0, 4).map((c) => (
                        <button
                          key={c.conversation_id}
                          type="button"
                          className="club-chip announce-target notif-open"
                          title={`Open ${c.title} announcements`}
                          onClick={() => openChannel(c.conversation_id)}
                        >
                          <Icon name={c.type === 'club_announcements' ? 'users' : 'book'} size={11} />
                          {c.title}
                          <Icon name="arrow-right" size={11} />
                        </button>
                      ))}
                      {chans.length > 4 && (
                        <span className="club-chip announce-target">+{chans.length - 4} more</span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ))}
      </div>
    </Modal>
  )
}

function NotifSkeleton() {
  return (
    <div className="dashboard-list" aria-busy="true">
      {[0, 1, 2].map((i) => (
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
  )
}
