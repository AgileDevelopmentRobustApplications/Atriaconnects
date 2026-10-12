import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadCommittees, splitMembers } from '../../lib/committees.js'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Avatar from '../common/Avatar.jsx'
import ClubChatButton from './ClubChatButton.jsx'
import Icon from '../common/Icon.jsx'

// /management/:id — everyone assigned to one committee, leadership first.
export default function CommitteePage({ committeeId }) {
  const navigate = useNavigate()
  const [committees, setCommittees] = useState(null)
  const [query, setQuery] = useState('')
  const { user, isGuest } = useAuth()
  const { refreshChats, openConversation } = useChat()
  const { showToast } = useToast()
  // directory email (lowercase) -> AdraConnects profile id; null while looking up
  const [accounts, setAccounts] = useState(null)
  const [openingEmail, setOpeningEmail] = useState(null)

  useEffect(() => {
    let active = true
    loadCommittees().then((list) => active && setCommittees(list))
    return () => {
      active = false
    }
  }, [])

  const committee = committees?.find((c) => c.id === committeeId)

  // Match directory people to app accounts by email so "Message" can open a DM.
  const emailKey = committee
    ? [...new Set(committee.members.map((m) => m.email?.toLowerCase()).filter(Boolean))].sort().join(',')
    : ''
  useEffect(() => {
    if (!emailKey) return
    let active = true
    const emails = emailKey.split(',')
    supabase
      .from('profiles')
      .select('id, email')
      .in('email', emails)
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error('Committee: failed to match accounts', error)
        setAccounts(new Map((data ?? []).map((p) => [p.email.toLowerCase(), p.id])))
      })
    return () => {
      active = false
    }
  }, [emailKey])

  // What the Message button can do for one person.
  function dmFor(person) {
    const email = person.email?.toLowerCase()
    const profileId = email ? accounts?.get(email) : null
    if (accounts === null) return null
    if (profileId && profileId === user?.id) return { state: 'self' }
    if (!profileId) return { state: 'none' }
    if (isGuest) return { state: 'guest' }
    return {
      state: 'ready',
      busy: openingEmail === email,
      open: async () => {
        if (openingEmail) return
        setOpeningEmail(email)
        try {
          const { data: convId, error } = await supabase.rpc('get_or_create_dm', { _other: profileId })
          if (error) throw error
          await refreshChats()
          openConversation(convId)
          navigate('/')
        } catch (err) {
          showToast(err.message || 'Could not open the conversation', 'error')
          setOpeningEmail(null)
        }
      },
    }
  }
  const back = () => navigate('/')

  const header = (
    <header className="chat-header page-header">
      <button
        className="icon-btn mobile-back"
        aria-label={committee?.kind === 'club' ? 'Back to communities' : 'Back to committees'}
        onClick={back}
      >
        <Icon name="back" />
      </button>
      <span
        className={`page-header-icon${committee?.logo ? ' has-logo' : ''}${committee?.logoInset ? ' is-inset' : ''}`}
        style={committee?.logoBg ? { background: committee.logoBg } : undefined}
        aria-hidden="true"
      >
        {committee?.logo ? <img src={committee.logo} alt="" /> : <Icon name={committee?.icon ?? 'briefcase'} size={18} />}
      </span>
      <div className="chat-header-text">
        <h1 id="committee-title" className="chat-header-title">
          {committee?.name ?? 'Management'}
        </h1>
        <span className="chat-header-sub">
          {committee?.kind === 'club'
            ? `Club · @${committee.handle}`
            : committee
            ? `${committee.members.length} assigned · Management`
            : 'College committees'}
        </span>
      </div>
    </header>
  )

  if (committees && !committee) {
    return (
      <section className="notifications-page" aria-labelledby="committee-title">
        {header}
        <div className="empty-box" style={{ margin: 'auto' }}>
          <div className="empty-box-icon">
            <Icon name="search" size={22} />
          </div>
          <p className="empty-box-text">Committee not found</p>
          <p className="empty-box-sub">Pick a committee from Management in the sidebar.</p>
        </div>
      </section>
    )
  }

  if (committee?.kind === 'club') {
    return (
      <section className="notifications-page committee-page" aria-labelledby="committee-title">
        {header}
        <div className="notifications-scroll">
          <div className="notifications-inner club-profile">
            <div className="club-hero">
              <span
                className={`club-hero-logo${committee.logoInset ? ' is-inset' : ''}`}
                style={committee.logoBg ? { background: committee.logoBg } : undefined}
              >
                <img src={committee.logo} alt={`${committee.name} logo`} />
              </span>
              <h2>{committee.name}</h2>
              <span className="club-hero-handle">@{committee.handle}</span>
              <p>{committee.description}</p>
              <div className="club-hero-actions">
                <ClubChatButton directoryId={committee.id} clubName={committee.name} />
                <a
                  className="btn-secondary"
                  href={`https://www.instagram.com/${encodeURIComponent(committee.handle)}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Instagram <Icon name="arrow-right" size={15} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const q = query.trim().toLowerCase()
  const match = (m) =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    m.designation.toLowerCase().includes(q) ||
    m.role.toLowerCase().includes(q)
  const { leads, rest } = committee ? splitMembers(committee.members) : { leads: [], rest: [] }
  const shownLeads = leads.filter(match)
  const shownRest = rest.filter(match)

  return (
    <section className="notifications-page committee-page" aria-labelledby="committee-title">
      {header}
      <div className="notifications-scroll">
        <div className="notifications-inner committee-inner">
          {!committee ? (
            <div className="committee-people" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="skeleton" style={{ height: 76, borderRadius: 14 }} />
              ))}
            </div>
          ) : (
            <>
              <div className="committee-toolbar">
                <div className="search-field committee-search">
                  <Icon name="search" size={15} />
                  <input
                    type="search"
                    aria-label="Search people in this committee"
                    placeholder="Search by name, designation or role"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              {shownLeads.length > 0 && (
                <>
                  <div className="events-section">Leadership</div>
                  <div className="committee-leads">
                    {shownLeads.map((m) => (
                      <PersonCard key={m._i} person={m} lead dm={dmFor(m)} />
                    ))}
                  </div>
                </>
              )}

              {shownRest.length > 0 && (
                <>
                  <div className="events-section">
                    Members · {shownRest.length}
                  </div>
                  <div className="committee-people">
                    {shownRest.map((m) => (
                      <PersonCard key={m._i} person={m} dm={dmFor(m)} />
                    ))}
                  </div>
                </>
              )}

              {shownLeads.length + shownRest.length === 0 && (
                <div className="empty-box">
                  <div className="empty-box-icon">
                    <Icon name="search" size={22} />
                  </div>
                  <p className="empty-box-text">No one matches “{query}”</p>
                </div>
              )}

              <p className="committee-source">
                Source: Atria Institute of Technology committees page. Verify details before official use.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

const DM_UNAVAILABLE = {
  none: { label: 'Not on AdraConnects yet', hint: 'No AdraConnects account uses this person’s email yet.' },
  guest: { label: 'Members only', hint: 'Guest accounts can only message the Admissions Office.' },
}

function DmButton({ person, dm }) {
  if (!dm) return null
  if (dm.state === 'self') return <span className="person-dm is-self">You</span>
  if (dm.state === 'ready') {
    return (
      <button
        type="button"
        className="person-dm"
        disabled={dm.busy}
        onClick={dm.open}
        aria-label={`Message ${person.name}`}
      >
        <Icon name="chat" size={14} />
        {dm.busy ? 'Opening…' : 'Message'}
      </button>
    )
  }
  const info = DM_UNAVAILABLE[dm.state]
  return (
    <button type="button" className="person-dm" disabled title={info.hint} aria-label={`${person.name}: ${info.hint}`}>
      <Icon name="chat" size={14} />
      {info.label}
    </button>
  )
}

function PersonCard({ person, lead = false, dm }) {
  const { name, designation, role, email, phone } = person
  return (
    <article className={`person-card${lead ? ' is-lead' : ''}`}>
      <Avatar name={name.replace(/^(dr|mr|mrs|ms|prof|sri|smt)\.?\s+/i, '')} size={lead ? 44 : 40} />
      <div className="person-main">
        <div className="person-top">
          <span className="person-name">{name}</span>
          {role && !/^member$/i.test(role) && <span className="person-role">{role}</span>}
        </div>
        {designation && <span className="person-designation">{designation}</span>}
        {(email || phone) && (
          <div className="person-contact">
            {email && (
              <a href={`mailto:${email}`} title={`Email ${name}`}>
                <Icon name="mail" size={13} /> <span>{email}</span>
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\s+/g, '')}`} title={`Call ${name}`}>
                <Icon name="phone" size={13} /> <span>{phone}</span>
              </a>
            )}
          </div>
        )}
        <DmButton person={person} dm={dm} />
      </div>
    </article>
  )
}
