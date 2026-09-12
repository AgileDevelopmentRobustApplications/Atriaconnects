import { useState } from 'react'
import Modal from '../common/Modal.jsx'
import Icon from '../common/Icon.jsx'
import CustomSelect from '../common/CustomSelect.jsx'

export default function CustomizationModal({ item, options, onClose, onConfirm }) {
  const [selections, setSelections] = useState({})

  const handleSelect = (groupId, value, multiple = false) => {
    setSelections(prev => {
      if (multiple) {
        const current = prev[groupId] || []
        const next = current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value]
        return { ...prev, [groupId]: next }
      } else {
        return { ...prev, [groupId]: value }
      }
    })
  }

  const isComplete = () => {
    return options.every(group => {
      if (!group.required) return true
      return !!selections[group.id]
    })
  }

  const calculateExtraPrice = () => {
    let extra = 0
    Object.entries(selections).forEach(([groupId, value]) => {
      const group = options.find(g => g.id === groupId)
      if (!group) return
      if (Array.isArray(value)) {
        value.forEach(valId => {
          const opt = group.options.find(o => o.id === valId)
          if (opt) extra += opt.price || 0
        })
      } else {
        const opt = group.options.find(o => o.id === value)
        if (opt) extra += opt.price || 0
      }
    })
    return extra
  }

  return (
    <Modal title={`Customize ${item.name}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {options.map(group => (
          <div key={group.id} className="customization-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 14 }}>
                {group.name} {group.required && <span style={{ color: 'red' }}>*</span>}
              </label>
              {!group.required && <span className="picker-sub" style={{ fontSize: 11 }}>Optional</span>}
            </div>

            {group.multiple ? (
              <div className="customization-options-grid">
                {group.options.map(opt => {
                  const isSelected = (selections[group.id] || []).includes(opt.id)
                  return (
                    <button
                      key={opt.id}
                      className={`customization-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelect(group.id, opt.id, true)}
                    >
                      <span className="chip-name">{opt.name}</span>
                      <span className="chip-price">+{opt.price > 0 ? `₹${opt.price}` : 'Free'}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <CustomSelect
                options={group.options.map(o => ({ label: `${o.name} (+₹${o.price})`, value: o.id }))}
                value={selections[group.id]}
                onChange={(val) => handleSelect(group.id, val)}
                placeholder="Select an option"
              />
            )}
          </div>
        ))}

        <div className="customization-footer">
          <div className="total-price-row">
            <span>Base Price: ₹{Number(item.price).toFixed(2)}</span>
            <span>Extras: ₹{calculateExtraPrice().toFixed(2)}</span>
            <strong className="final-price">Total: ₹{(Number(item.price) + calculateExtraPrice()).toFixed(2)}</strong>
          </div>
          <button
            className="btn-primary btn-block"
            disabled={!isComplete()}
            onClick={() => onConfirm(selections)}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </Modal>
  )
}
