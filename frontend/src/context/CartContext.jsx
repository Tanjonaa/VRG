import React, { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vrg_cart')) || [] } catch { return [] }
  })

  const save = (newItems) => {
    setItems(newItems)
    localStorage.setItem('vrg_cart', JSON.stringify(newItems))
  }

  const addItem = (product) => {
    const existing = items.find(i => i.id === product.id)
    if (existing) {
      save(items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i))
    } else {
      save([...items, { ...product, qty: 1 }])
    }
  }

  const removeItem = (id) => save(items.filter(i => i.id !== id))

  const updateQty = (id, qty) => {
    if (qty < 1) { removeItem(id); return }
    save(items.map(i => i.id === id ? { ...i, qty } : i))
  }

  const clearCart = () => save([])

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const count = items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
