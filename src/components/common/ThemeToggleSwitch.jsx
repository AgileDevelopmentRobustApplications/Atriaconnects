import { useAuth } from '../../context/AuthContext.jsx'
import Icon from './Icon.jsx'

export default function ThemeToggleSwitch({ className = '' }) {
  const { theme, toggleTheme } = useAuth()
  const isDark = theme === 'dark'

  const handleToggle = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    toggleTheme(isDark ? 'light' : 'dark', {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      className={`theme-toggle-switch ${isDark ? 'is-dark' : 'is-light'}${className ? ` ${className}` : ''}`}
      onClick={handleToggle}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="switch-icon-wrap">
        {isDark ? (
          <Icon key="moon" name="moon" size={13} className="switch-icon moon" />
        ) : (
          <Icon key="sun" name="sun" size={13} className="switch-icon sun" />
        )}
      </span>
      <span className="switch-knob" />
    </button>
  )
}
