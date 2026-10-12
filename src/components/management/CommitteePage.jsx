import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadCommittees, splitMembers } from '../../lib/committees.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'

// /management/:id — everyone assigned to one committee, leadership first.
export default function CommitteePage({ committeeId }) {
  const navigate = useNavigate()
  const [committees, setCommittees] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    loadCommittees().then((list) => active && setCommittees(list))
    return () => {
      active = false
    }
  }, [])

  const committee = committees?.find((c) => c.id === committeeId)
  const back = () => navigate('/')

  const header = (
    <header className="chat-header page-header">
      <button className="icon-btn mobile-back" aria-label="Back to committees" onClick={back}>
        <Icon name="back" />
      </button>
      <span className="page-header-icon" aria-hidden="true">
        <Icon name={committee?.icon ?? 'briefcase'} size={18} />
      </span>
      <div className="chat-header-text">
        <h1 id="committee-title" className="chat-header-title">
          {committee?.name ?? 'Management'}
        </h1>
        <span className="chat-header-sub">
          {committee ? `${committee.members.length} assigned · Management` : 'College committees'}
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
                      <PersonCard key={m._i} person={m} lead />
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
                      <PersonCard key={m._i} person={m} />
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

function PersonCard({ person, lead = false }) {
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
      </div>
    </article>
  )
}
