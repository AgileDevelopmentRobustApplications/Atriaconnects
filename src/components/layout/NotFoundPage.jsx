import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../common/Icon.jsx'

export default function NotFoundPage() {
  useEffect(() => {
    // Set descriptive Title Tag for SEO & browser tab
    document.title = '404 - Page Not Found | AdraConnects'

    // Update meta description if it exists
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Oops! The page you are looking for does not exist on AdraConnects. Return to the homepage to access your chats, groups, and clubs.'
      )
    }
  }, [])

  return (
    <main className="not-found-page" id="not-found-container">
      <div className="not-found-card">
        <div className="not-found-icon-wrap" aria-hidden="true">
          <Icon name="coffee" size={40} strokeWidth={1.8} />
        </div>
        
        <div className="not-found-code">404</div>
        <h1 className="not-found-title" id="not-found-title">
          Page Not Found
        </h1>
        
        <p className="not-found-text">
          We couldn’t find the page you are looking for. It might have been moved, deleted, or never existed.
        </p>

        <div className="not-found-actions">
          <Link
            to="/"
            className="btn-primary btn-not-found-home"
            id="btn-go-home"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    </main>
  )
}
