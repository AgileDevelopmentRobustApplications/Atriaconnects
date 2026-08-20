import { useAuth } from '../../context/AuthContext.jsx'
import Icon from './Icon.jsx'

export default function ThemeToggleSwitch({ className = '' }) {
  const { theme, toggleTheme } = useAuth()
  const isDark = theme === 'dark'

  const handleToggle = () => {
    toggleTheme(isDark ? 'light' : 'dark')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  return (
    <div
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme mode"
      tabIndex={0}
      className={`theme-toggle-switch ${isDark ? 'is-dark' : 'is-light'}${className ? ` ${className}` : ''}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
    >
      {/* Icon positioning */}
      <div className="switch-icon-wrap">
        {isDark ? (
          <Icon name="moon-stars" size={13} className="switch-icon moon" />
        ) : (
          <Icon name="sun" size={13} className="switch-icon sun" />
        )}
      </div>

      {/* Sliding Knob */}
      <span className="switch-knob" />
    </div>
  )
}
