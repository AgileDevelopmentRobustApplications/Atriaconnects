import Icon from '../common/Icon.jsx'

// Square cards, two per row: committees (Sidebar → Management) and student
// clubs with their logos (Sidebar → Communities). `items` comes from
// filterCommittees(); null while the directory loads.
export default function CommitteeGrid({ items, search = '', activeId, onOpen, showLabels = true }) {
  if (!items) {
    return (
      <div className="committee-grid" aria-busy="true" aria-label="Loading committees and clubs">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="skeleton committee-card-skeleton" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="sidebar-empty">
        <Icon name="search" size={28} strokeWidth={1.6} />
        <strong>Nothing matches “{search}”</strong>
        <span>Search by committee, club or a member’s name.</span>
      </div>
    )
  }

  const groups = [
    { title: 'Committees', list: items.filter((i) => i.committee.kind !== 'club') },
    { title: 'Clubs', list: items.filter((i) => i.committee.kind === 'club') },
  ].filter((g) => g.list.length > 0)

  return groups.map((g) => (
    <section key={g.title} className="committee-group" aria-label={g.title}>
      {showLabels && (
        <div className="committee-group-label">
          {g.title} <span>{g.list.length}</span>
        </div>
      )}
      <div className="committee-grid">
        {g.list.map(({ committee: c, people }) => (
          <button
            key={c.id}
            type="button"
            className={`committee-card${c.kind === 'club' ? ' is-club' : ''}${c.id === activeId ? ' active' : ''}`}
            aria-current={c.id === activeId ? 'page' : undefined}
            title={people.length ? `${c.name} — ${people.map((p) => p.name).join(', ')}` : c.name}
            onClick={() => onOpen(c.id)}
          >
            {c.kind === 'club' ? (
              <span
                className={`committee-card-logo${c.logoInset ? ' is-inset' : ''}`}
                style={c.logoBg ? { background: c.logoBg } : undefined}
              >
                <img src={c.logo} alt="" loading="lazy" decoding="async" />
              </span>
            ) : (
              <span className="committee-card-icon" aria-hidden="true">
                <Icon name={c.icon} size={20} />
              </span>
            )}
            <span className="committee-card-name">{c.short}</span>
            {c.kind !== 'club' && (
              <span className="committee-card-count">
                {people.length
                  ? `${people.length} match${people.length === 1 ? '' : 'es'}`
                  : `${c.members.length} people`}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  ))
}
