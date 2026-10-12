import Icon from '../common/Icon.jsx'

// Sidebar → Management: one small square card per committee.
// `items` comes from filterCommittees(); null while the directory loads.
export default function CommitteeGrid({ items, search = '', activeId, onOpen }) {
  if (!items) {
    return (
      <div className="committee-grid" aria-busy="true" aria-label="Loading committees">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="skeleton committee-card-skeleton" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="sidebar-empty">
        <Icon name="search" size={28} strokeWidth={1.6} />
        <strong>No committees match “{search}”</strong>
        <span>Search by committee or by a member’s name.</span>
      </div>
    )
  }

  return (
    <div className="committee-grid">
      {items.map(({ committee: c, people }) => (
        <button
          key={c.id}
          type="button"
          className={`committee-card${c.id === activeId ? ' active' : ''}`}
          aria-current={c.id === activeId ? 'page' : undefined}
          title={people.length ? `${c.name} — ${people.map((p) => p.name).join(', ')}` : c.name}
          onClick={() => onOpen(c.id)}
        >
          <span className="committee-card-icon" aria-hidden="true">
            <Icon name={c.icon} size={18} />
          </span>
          <span className="committee-card-name">{c.short}</span>
          <span className="committee-card-count">
            {people.length
              ? `${people.length} match${people.length === 1 ? '' : 'es'}`
              : `${c.members.length} people`}
          </span>
        </button>
      ))}
    </div>
  )
}
