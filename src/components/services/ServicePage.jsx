import { useNavigate } from 'react-router-dom'
import Icon from '../common/Icon.jsx'
import { SERVICES } from '../../lib/services.js'

// Campus service page (/shop, /canteen) shown in the main pane.

export default function ServicePage({ path }) {
  const navigate = useNavigate()
  const service = SERVICES[path]
  if (!service) return null

  return (
    <section className="notifications-page service-page" aria-labelledby="service-title">
      <header className="chat-header page-header">
        <button className="icon-btn mobile-back" aria-label="Back to chats" onClick={() => navigate('/')}>
          <Icon name="back" />
        </button>
        <span className="page-header-icon" aria-hidden="true">
          <Icon name={service.icon} size={18} />
        </span>
        <div className="chat-header-text">
          <h1 id="service-title" className="chat-header-title">
            {service.title}
          </h1>
          <span className="chat-header-sub">{service.subtitle}</span>
        </div>
      </header>

      <div className="notifications-scroll">
        <div className="notifications-inner service-inner">
          <div className="service-hero">
            <span className="service-hero-icon" aria-hidden="true">
              <Icon name={service.icon} size={30} strokeWidth={1.8} />
            </span>
            <span className="sidebar-soon-tag">Coming soon…</span>
            <h2>{service.title} is on its way</h2>
            <p>{service.text}</p>
          </div>

          <div className="service-planned">
            <div className="events-section">What’s planned</div>
            <div className="service-planned-grid">
              {service.planned.map((p) => (
                <div key={p.title} className="service-planned-card">
                  <span className="action-icon" aria-hidden="true">
                    <Icon name={p.icon} size={18} />
                  </span>
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="service-actions">
            <button className="btn-secondary" onClick={() => navigate('/')}>
              <Icon name="back" size={16} /> Back to chats
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
