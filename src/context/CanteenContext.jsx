import { createContext, useContext, useState, useEffect } from 'react'

const CanteenContext = createContext()

export function CanteenProvider({ children }) {
  const [cart, setCart] = useState({}) // item_id -> quantity

  // Persist cart to localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('canteen_cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error('Failed to parse saved canteen cart', e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('canteen_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (itemId) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }))
  }

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const next = { ...prev }
      if (next[itemId] > 1) next[itemId]--
      else delete next[itemId]
      return next
    })
  }

  const clearCart = () => setCart({})

  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0)

  return (
    <CanteenContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartCount }}>
      {children}
    </CanteenContext.Provider>
  )
}

export function useCanteen() {
  const context = useContext(CanteenContext)
  if (!context) {
    throw new Error('useCanteen must be used within a CanteenProvider')
  }
  return context
}
