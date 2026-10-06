import { useState, useRef, useEffect, useId } from 'react'
import Icon from './Icon.jsx'

export default function CustomSelect({ value, onChange, options, placeholder = 'Select option' }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef(null)
  const listId = useId()

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value))
  const selectedOption = options[selectedIndex]

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function openList() {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function choose(opt) {
    onChange(opt.value)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (options[activeIndex]) choose(options[activeIndex])
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className={`custom-select-wrap${open ? ' is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className={`custom-select-text${selectedOption?.value ? '' : ' is-placeholder'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="custom-select-chevron">
          <Icon name="chevron-down" size={16} />
        </span>
      </button>

      {open && (
        <div className="custom-select-dropdown" role="listbox" id={listId}>
          {options.map((opt, i) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                className={`custom-select-option${isSelected ? ' selected' : ''}${
                  i === activeIndex ? ' is-active' : ''
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(opt)}
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
