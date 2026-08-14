import { useState, useRef, useEffect } from 'react'
import Icon from './Icon.jsx'

export default function CustomSelect({ value, onChange, options, placeholder = 'Select option' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selectedOption = options.find((o) => String(o.value) === String(value))

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`custom-select-wrap${open ? ' is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="custom-select-text">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="custom-select-chevron">
          <Icon name="back" size={14} className="chevron-icon" />
        </span>
      </button>

      {open && (
        <div className="custom-select-dropdown">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <button
                key={opt.value}
                type="button"
                className={`custom-select-option${isSelected ? ' selected' : ''}`}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Icon name="check" size={14} className="option-check" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
