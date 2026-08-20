import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Modal from '../common/Modal.jsx'
import Icon from '../common/Icon.jsx'
import { formatChatTime } from '../../lib/format.js'

export default function CanteenModal({ onClose }) {
  const { user, isEmployee } = useAuth()
  const [view, setView] = useState('shops') // 'shops' | 'shop-detail' | 'my-orders' | 'dashboard'
  const [shops, setShops] = useState([])
  const [selectedShop, setSelectedShop] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [cart, setCart] = useState({}) // item_id -> quantity
  const [myOrders, setMyOrders] = useState([])
  const [dashboardShop, setDashboardShop] = useState(null)
  const [dashboardOrders, setDashboardOrders] = useState([])
  const [dashboardItems, setDashboardItems] = useState([])
  const [newAnn, setNewAnn] = useState('')
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [mockCard, setMockCard] = useState('')
  const [mockUpi, setMockUpi] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [showPaymentPortal, setShowPaymentPortal] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null) // for category tab filter
  const [newItemForm, setNewItemForm] = useState({ name: '', description: '', price: '', category: '', inventory_count: 10 })
  const [showAddItem, setShowAddItem] = useState(false)
  const [addingItem, setAddingItem] = useState(false)

  // Load shops
  const loadShops = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('canteen_shops').select('*').order('name')
    const allShops = data ?? []
    setShops(allShops)

    // Check if user is shopkeeper for any shop
    const myShop = allShops.find(s => s.shopkeeper_id === user.id)
    if (myShop) {
      setDashboardShop(myShop)
    } else if (isEmployee && allShops.length > 0) {
      // Principal / IT Dept can oversee the first shop as a fallback or mock HOD role
      setDashboardShop(allShops[0])
    }
    setLoading(false)
  }, [user.id, isEmployee])

  useEffect(() => {
    loadShops()
  }, [loadShops])

  // Load menu items and announcements for a shop
  const loadShopDetails = useCallback(async (shopId) => {
    const [itemsRes, annRes] = await Promise.all([
      supabase.from('canteen_items').select('*').eq('shop_id', shopId).order('category').order('name'),
      supabase.from('canteen_announcements').select('*, profile:profiles(full_name)').eq('shop_id', shopId).order('created_at', { ascending: false })
    ])
    setMenuItems(itemsRes.data ?? [])
    setAnnouncements(annRes.data ?? [])
    setActiveCategory(null) // reset category filter on new shop
  }, [])

  useEffect(() => {
    if (selectedShop) {
      loadShopDetails(selectedShop.id)
    }
  }, [selectedShop, loadShopDetails])

  // Load my orders
  const loadMyOrders = useCallback(async () => {
    const { data } = await supabase
      .from('canteen_orders')
      .select('*, shop:canteen_shops(name), items:canteen_order_items(quantity, price, item:canteen_items(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMyOrders(data ?? [])
  }, [user.id])

  useEffect(() => {
    if (view === 'my-orders') {
      loadMyOrders()
    }
  }, [view, loadMyOrders])

  // Load dashboard details (orders, items) for shopkeeper
  const loadDashboardDetails = useCallback(async () => {
    if (!dashboardShop) return
    const [ordersRes, itemsRes] = await Promise.all([
      supabase
        .from('canteen_orders')
        .select('*, profile:profiles(full_name, email), items:canteen_order_items(quantity, price, item:canteen_items(name))')
        .eq('shop_id', dashboardShop.id)
        .order('created_at', { ascending: false }),
      supabase.from('canteen_items').select('*').eq('shop_id', dashboardShop.id).order('category').order('name')
    ])
    setDashboardOrders(ordersRes.data ?? [])
    setDashboardItems(itemsRes.data ?? [])
  }, [dashboardShop])

  useEffect(() => {
    if (view === 'dashboard') {
      loadDashboardDetails()
    }
  }, [view, loadDashboardDetails])

  // Realtime subscription for canteen updates
  useEffect(() => {
    const channel = supabase
      .channel('canteen-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'canteen_orders' },
        () => {
          loadMyOrders()
          loadDashboardDetails()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'canteen_items' },
        () => {
          if (selectedShop) {
            loadShopDetails(selectedShop.id)
          }
          loadDashboardDetails()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadMyOrders, loadDashboardDetails, loadShopDetails, selectedShop])

  // Cart actions
  const [animateCart, setAnimateCart] = useState(false)

  const triggerCartBounce = () => {
    setAnimateCart(true)
    setTimeout(() => setAnimateCart(false), 350)
  }

  const addToCart = (itemId) => {
    setCart(c => ({ ...c, [itemId]: (c[itemId] || 0) + 1 }))
    triggerCartBounce()
  }

  const removeFromCart = (itemId) => {
    setCart(c => {
      const next = { ...c }
      if (next[itemId] > 1) next[itemId]--
      else delete next[itemId]
      return next
    })
    triggerCartBounce()
  }

  const clearCart = () => setCart({})

  const cartTotal = () => {
    return Object.entries(cart).reduce((total, [itemId, qty]) => {
      const item = menuItems.find(i => i.id === itemId)
      return total + (item ? item.price * qty : 0)
    }, 0)
  }

  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0)

  // Checkout process
  const triggerCheckout = () => {
    setShowPaymentPortal(true)
  }

  const handlePayment = async () => {
    setPaying(true)
    try {
      const shopId = selectedShop.id
      const total = cartTotal()

      // 1. Get today's order count for token generation
      const todayStart = new Date()
      todayStart.setHours(0,0,0,0)
      const { count } = await supabase
        .from('canteen_orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .gte('created_at', todayStart.toISOString())

      const tokenNumber = (count || 0) + 1

      // 2. Create the order
      const { data: order, error: orderErr } = await supabase
        .from('canteen_orders')
        .insert({
          user_id: user.id,
          shop_id: shopId,
          total_amount: total,
          token_number: tokenNumber,
          payment_status: 'paid',
          payment_method: paymentMethod,
          status: 'pending'
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      // 3. Insert order items into canteen_order_items
      const orderItems = Object.entries(cart).map(([itemId, qty]) => {
        const item = menuItems.find(i => i.id === itemId)
        return {
          order_id: order.id,
          item_id: itemId,
          quantity: qty,
          price: item.price
        }
      })

      const { error: itemsErr } = await supabase.from('canteen_order_items').insert(orderItems)
      if (itemsErr) throw itemsErr

      // 4. Decrement inventory counts
      for (const [itemId, qty] of Object.entries(cart)) {
        const item = menuItems.find(i => i.id === itemId)
        if (item && item.inventory_count >= qty) {
          await supabase
            .from('canteen_items')
            .update({ inventory_count: item.inventory_count - qty })
            .eq('id', itemId)
        }
      }

      alert(`Payment Successful! Your order token is #${tokenNumber}`)
      clearCart()
      setShowPaymentPortal(false)
      setView('my-orders')
    } catch (err) {
      alert(`Checkout failed: ${err.message}`)
    } finally {
      setPaying(false)
    }
  }

  // Dashboard shopkeeper actions
  const toggleShopStatus = async () => {
    if (!dashboardShop) return
    const nextState = !dashboardShop.is_open
    const { error } = await supabase
      .from('canteen_shops')
      .update({ is_open: nextState })
      .eq('id', dashboardShop.id)

    if (error) alert(error.message)
    else setDashboardShop(prev => ({ ...prev, is_open: nextState }))
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('canteen_orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) alert(error.message)
    else loadDashboardDetails()
  }

  const makeAnnouncement = async (e) => {
    e.preventDefault()
    if (!newAnn.trim() || !dashboardShop) return

    const { error } = await supabase
      .from('canteen_announcements')
      .insert({
        shop_id: dashboardShop.id,
        content: newAnn.trim(),
        created_by: user.id
      })

    if (error) alert(error.message)
    else {
      setNewAnn('')
      alert('Announcement posted!')
      loadDashboardDetails()
    }
  }

  const updateInventory = async (itemId, newCount) => {
    const { error } = await supabase
      .from('canteen_items')
      .update({ inventory_count: Math.max(0, newCount), is_available: newCount > 0 })
      .eq('id', itemId)

    if (error) alert(error.message)
    else loadDashboardDetails()
  }

  // Add a new menu item (shopkeeper)
  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!dashboardShop) return
    setAddingItem(true)
    try {
      const { error } = await supabase.from('canteen_items').insert({
        shop_id: dashboardShop.id,
        name: newItemForm.name.trim(),
        description: newItemForm.description.trim(),
        price: parseFloat(newItemForm.price),
        category: newItemForm.category.trim() || 'Other',
        inventory_count: parseInt(newItemForm.inventory_count, 10) || 10,
        is_available: true,
      })
      if (error) throw error
      setNewItemForm({ name: '', description: '', price: '', category: '', inventory_count: 10 })
      setShowAddItem(false)
      loadDashboardDetails()
    } catch (err) {
      alert('Failed to add item: ' + err.message)
    } finally {
      setAddingItem(false)
    }
  }

  // Derived: unique categories for the selected shop's menu
  const categories = [...new Set(menuItems.map(i => i.category).filter(Boolean))]
  const displayedItems = activeCategory
    ? menuItems.filter(i => i.category === activeCategory)
    : menuItems

  // Group dashboard items by category
  const dashboardItemsByCategory = dashboardItems.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const orderStatusColor = {
    pending: '#f39c12',
    preparing: '#3498db',
    ready: '#2ecc71',
    completed: '#95a5a6',
    cancelled: '#e74c3c',
  }

  return (
    <Modal title="College Canteen" onClose={onClose} wide>
      <div className="club-tabs" style={{ marginBottom: 16 }}>
        <button className={`club-tab${view === 'shops' || view === 'shop-detail' ? ' active' : ''}`} onClick={() => setView('shops')}>
          Shops
        </button>
        <button className={`club-tab${view === 'my-orders' ? ' active' : ''}`} onClick={() => setView('my-orders')}>
          My Orders
        </button>
        {dashboardShop && (
          <button className={`club-tab${view === 'dashboard' ? ' active' : ''}`} onClick={() => setView('dashboard')}>
            Shopkeeper Panel
          </button>
        )}
      </div>

      <div className="canteen-body">
        {loading ? (
          <div className="side-note center">Loading Canteen…</div>
        ) : (
          <>
            {/* 1. SHOPS DIRECTORY VIEW */}
            {view === 'shops' && (
              <div className="picker-list">
                {shops.length === 0 && <div className="side-note">No shops registered.</div>}
                {shops.map(s => (
                  <div key={s.id} className="picker-item" onClick={() => {
                    setSelectedShop(s)
                    setView('shop-detail')
                    clearCart()
                  }}>
                    <Avatar name={s.name} size={44} icon={<Icon name="coffee" />} />
                    <div className="picker-grow">
                      <div className="picker-name">{s.name}</div>
                      <div className="picker-sub">
                        {s.description || 'College food shop'} ·{' '}
                        <span className={s.is_open ? 'status-active-text' : 'status-dnd-text'}>
                          {s.is_open ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    </div>
                    <button className="btn-small">Browse Menu</button>
                  </div>
                ))}
              </div>
            )}

            {/* 2. SHOP DETAIL / MENU VIEW */}
            {view === 'shop-detail' && selectedShop && (
              <div className="shop-details-container">
                <div className="shop-header-banner">
                  <button className="icon-btn" onClick={() => setView('shops')}>
                    <Icon name="back" size={16} /> Back to shops
                  </button>
                  <h2>{selectedShop.name}</h2>
                  <p className="picker-sub">{selectedShop.description}</p>
                </div>

                {/* Announcement Banner */}
                {announcements.length > 0 && (
                  <div className="canteen-announcement-banner">
                    <div className="ann-banner-title">
                      <Icon name="megaphone" size={14} /> Shop announcement:
                    </div>
                    <div className="ann-banner-content">{announcements[0].content}</div>
                  </div>
                )}

                {/* Category filter tabs */}
                {categories.length > 1 && (
                  <div className="canteen-category-tabs">
                    <button
                      className={`canteen-cat-tab${!activeCategory ? ' active' : ''}`}
                      onClick={() => setActiveCategory(null)}
                    >
                      All
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        className={`canteen-cat-tab${activeCategory === cat ? ' active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div className="canteen-menu-columns">
                  {/* Menu List */}
                  <div className="canteen-menu-list">
                    <h3>
                      Menu
                      {activeCategory && <span className="picker-sub" style={{ fontWeight: 400, marginLeft: 8 }}>— {activeCategory}</span>}
                    </h3>

                    {displayedItems.length === 0 && <div className="side-note">No items in this category.</div>}

                    {/* Group by category when showing All */}
                    {!activeCategory
                      ? categories.map(cat => {
                          const catItems = menuItems.filter(i => i.category === cat)
                          return (
                            <div key={cat} className="canteen-category-group">
                              <div className="canteen-category-label">{cat}</div>
                              <div className="picker-list">
                                {catItems.map(item => {
                                  const qty = cart[item.id] || 0
                                  const outOfStock = item.inventory_count <= 0 || !item.is_available
                                  return (
                                    <MenuItemRow
                                      key={item.id}
                                      item={item}
                                      qty={qty}
                                      outOfStock={outOfStock}
                                      shopOpen={selectedShop.is_open}
                                      onAdd={() => addToCart(item.id)}
                                      onRemove={() => removeFromCart(item.id)}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })
                      : (
                        <div className="picker-list">
                          {displayedItems.map(item => {
                            const qty = cart[item.id] || 0
                            const outOfStock = item.inventory_count <= 0 || !item.is_available
                            return (
                              <MenuItemRow
                                key={item.id}
                                item={item}
                                qty={qty}
                                outOfStock={outOfStock}
                                shopOpen={selectedShop.is_open}
                                onAdd={() => addToCart(item.id)}
                                onRemove={() => removeFromCart(item.id)}
                              />
                            )
                          })}
                        </div>
                      )
                    }
                  </div>

                  {/* Cart Summary */}
                  {Object.keys(cart).length > 0 && (
                    <div className={`canteen-cart-card ${animateCart ? 'cart-bounce' : ''}`}>
                      <h3>
                        Your Cart
                        <span className="cart-count-badge">{cartCount()}</span>
                      </h3>
                      <div className="cart-items-review">
                        {Object.entries(cart).map(([itemId, qty]) => {
                          const item = menuItems.find(i => i.id === itemId)
                          if (!item) return null
                          return (
                            <div key={itemId} className="cart-review-row">
                              <div className="cart-review-item-info">
                                <span className="cart-review-name">{item.name}</span>
                                <span className="cart-review-category">{item.category}</span>
                              </div>
                              <div className="cart-review-right">
                                <div className="cart-item-controls" style={{ gap: 4 }}>
                                  <button className="btn-small" style={{ padding: '1px 6px' }} onClick={() => removeFromCart(item.id)}>-</button>
                                  <span className="cart-qty">{qty}</span>
                                  <button className="btn-small" style={{ padding: '1px 6px' }} onClick={() => addToCart(item.id)} disabled={qty >= item.inventory_count}>+</button>
                                </div>
                                <span className="cart-review-price">₹{(item.price * qty).toFixed(2)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="cart-review-total">
                        <strong>Total:</strong>
                        <strong>₹{cartTotal().toFixed(2)}</strong>
                      </div>
                      <button className="btn-primary btn-block" onClick={triggerCheckout}>
                        Proceed to Pay
                      </button>
                      <button className="btn-small btn-block" style={{ marginTop: 6 }} onClick={clearCart}>
                        Clear Cart
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. MY ORDERS VIEW */}
            {view === 'my-orders' && (
              <div className="orders-list">
                <h3>My Orders</h3>
                {myOrders.length === 0 && <div className="side-note">You have not placed any orders yet.</div>}
                <div className="picker-list">
                  {myOrders.map(order => (
                    <div key={order.id} className="picker-item no-click">
                      <div className="picker-grow">
                        <div className="picker-name">{order.shop?.name}</div>
                        <div className="picker-sub">
                          Token: <strong>#{order.token_number}</strong> · ₹{order.total_amount.toFixed(2)}
                          <br />
                          Items:{' '}
                          {order.items.map(i => `${i.item?.name} (x${i.quantity})`).join(', ')}
                        </div>
                      </div>
                      <span
                        className="tier-tag"
                        style={{
                          background: orderStatusColor[order.status] + '22',
                          color: orderStatusColor[order.status],
                          border: `1px solid ${orderStatusColor[order.status]}44`,
                          fontWeight: 600,
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 20,
                        }}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SHOPKEEPER PANEL (DASHBOARD) */}
            {view === 'dashboard' && dashboardShop && (
              <div className="shopkeeper-dashboard">
                <div className="dashboard-header-row">
                  <div>
                    <h2>{dashboardShop.name} Panel</h2>
                    <span className="picker-sub">Manage your shop operations</span>
                  </div>
                  <button
                    className={`btn-small ${dashboardShop.is_open ? 'danger' : 'success'}`}
                    onClick={toggleShopStatus}
                  >
                    {dashboardShop.is_open ? 'Close Shop' : 'Open Shop'}
                  </button>
                </div>

                <div className="canteen-menu-columns">
                  {/* Active Orders */}
                  <div className="canteen-menu-list">
                    <h3>Incoming Orders</h3>
                    {dashboardOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length === 0 && (
                      <div className="side-note">No active orders.</div>
                    )}
                    <div className="picker-list">
                      {dashboardOrders
                        .filter(o => o.status !== 'completed' && o.status !== 'cancelled')
                        .map(order => (
                          <div key={order.id} className="picker-item no-click">
                            <div className="picker-grow">
                              <div className="picker-name">
                                Token #{order.token_number} · {order.profile?.full_name}
                              </div>
                              <div className="picker-sub">
                                Items: {order.items.map(i => `${i.item?.name} (x${i.quantity})`).join(', ')}
                                <br />
                                Order placed: {formatChatTime(order.created_at)}
                              </div>
                            </div>
                            <div className="dashboard-order-actions">
                              {order.status === 'pending' && (
                                <button className="btn-small" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                                  Prepare
                                </button>
                              )}
                              {order.status === 'preparing' && (
                                <button className="btn-small" onClick={() => updateOrderStatus(order.id, 'ready')}>
                                  Mark Ready
                                </button>
                              )}
                              {order.status === 'ready' && (
                                <button className="btn-small" onClick={() => updateOrderStatus(order.id, 'completed')}>
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Operational Settings */}
                  <div className="canteen-cart-card">
                    <h3>Shop Operations</h3>

                    {/* Announcement Form */}
                    <form onSubmit={makeAnnouncement} className="modal-form" style={{ padding: 0, marginBottom: 20 }}>
                      <label>
                        Post Announcement Banner:
                        <input
                          placeholder="e.g. Hot Samosas ready now!"
                          value={newAnn}
                          onChange={(e) => setNewAnn(e.target.value)}
                        />
                      </label>
                      <button className="btn-small btn-block" type="submit">Post Announcement</button>
                    </form>

                    {/* Add new menu item */}
                    <div style={{ marginBottom: 16 }}>
                      <button
                        className="btn-small btn-block"
                        onClick={() => setShowAddItem(v => !v)}
                      >
                        {showAddItem ? 'Cancel' : '+ Add Menu Item'}
                      </button>
                      {showAddItem && (
                        <form onSubmit={handleAddItem} className="modal-form" style={{ padding: '12px 0 0', gap: 8 }}>
                          <input
                            placeholder="Item name *"
                            value={newItemForm.name}
                            onChange={e => setNewItemForm(f => ({ ...f, name: e.target.value }))}
                            required
                          />
                          <input
                            placeholder="Description"
                            value={newItemForm.description}
                            onChange={e => setNewItemForm(f => ({ ...f, description: e.target.value }))}
                          />
                          <input
                            placeholder="Category (e.g. Snacks)"
                            value={newItemForm.category}
                            onChange={e => setNewItemForm(f => ({ ...f, category: e.target.value }))}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              placeholder="Price (₹) *"
                              type="number"
                              min="0"
                              step="0.5"
                              value={newItemForm.price}
                              onChange={e => setNewItemForm(f => ({ ...f, price: e.target.value }))}
                              required
                              style={{ flex: 1 }}
                            />
                            <input
                              placeholder="Stock qty"
                              type="number"
                              min="0"
                              value={newItemForm.inventory_count}
                              onChange={e => setNewItemForm(f => ({ ...f, inventory_count: e.target.value }))}
                              style={{ flex: 1 }}
                            />
                          </div>
                          <button className="btn-primary btn-block" type="submit" disabled={addingItem}>
                            {addingItem ? 'Adding…' : 'Add Item'}
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Inventory counts grouped by category */}
                    <h3>Inventory Management</h3>
                    {Object.entries(dashboardItemsByCategory).map(([cat, items]) => (
                      <div key={cat} style={{ marginBottom: 12 }}>
                        <div className="canteen-category-label" style={{ marginBottom: 4 }}>{cat}</div>
                        <div className="picker-list" style={{ gap: 4 }}>
                          {items.map(item => (
                            <div key={item.id} className="picker-item no-click" style={{ padding: '6px 4px' }}>
                              <span className="picker-grow picker-name" style={{ fontSize: 13 }}>{item.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button className="btn-small" style={{ padding: '2px 6px' }} onClick={() => updateInventory(item.id, item.inventory_count - 5)}>-5</button>
                                <span style={{ fontSize: 13, minWidth: 20, textAlign: 'center', fontWeight: 'bold' }}>{item.inventory_count}</span>
                                <button className="btn-small" style={{ padding: '2px 6px' }} onClick={() => updateInventory(item.id, item.inventory_count + 5)}>+5</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Simulated Payment Portal */}
      {showPaymentPortal && (
        <div className="payment-portal-overlay">
          <div className="payment-portal-card">
            <div className="payment-portal-header">
              <Icon name="shield" size={24} />
              <span>AdraPay simulated portal</span>
            </div>
            <p>You are paying <strong>₹{cartTotal().toFixed(2)}</strong> to <strong>{selectedShop.name}</strong></p>

            {/* Order summary in payment portal */}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
              {Object.entries(cart).map(([itemId, qty]) => {
                const item = menuItems.find(i => i.id === itemId)
                if (!item) return null
                return (
                  <div key={itemId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.name} × {qty}</span>
                    <span>₹{(item.price * qty).toFixed(2)}</span>
                  </div>
                )
              })}
            </div>

            <div className="payment-method-selector">
              <label>
                <input
                  type="radio"
                  name="pm"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                />
                UPI (GPay / PhonePe)
              </label>
              <label>
                <input
                  type="radio"
                  name="pm"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                Credit/Debit Card
              </label>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
              {paymentMethod === 'upi' ? (
                <input
                  placeholder="Enter UPI ID (e.g. user@okaxis)"
                  value={mockUpi}
                  onChange={(e) => setMockUpi(e.target.value)}
                  required
                />
              ) : (
                <input
                  placeholder="Card number (16 digits)"
                  maxLength={16}
                  value={mockCard}
                  onChange={(e) => setMockCard(e.target.value)}
                  required
                />
              )}

              <div className="portal-buttons">
                <button type="button" className="btn-small danger" onClick={() => setShowPaymentPortal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={paying}>
                  {paying ? 'Authorizing…' : 'Pay Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Reusable menu item row component ──────────────────────────────────────────
function MenuItemRow({ item, qty, outOfStock, shopOpen, onAdd, onRemove }) {
  return (
    <div className={`picker-item no-click ${outOfStock ? 'item-disabled' : ''}`}>
      <div className="picker-grow">
        <div className="picker-name">{item.name}</div>
        <div className="picker-sub">
          {item.description}
          <br />
          <strong>₹{item.price}</strong> ·{' '}
          {outOfStock ? (
            <span className="status-dnd-text">Out of stock</span>
          ) : (
            <span className="picker-sub">{item.inventory_count} remaining</span>
          )}
        </div>
      </div>
      {!outOfStock && shopOpen && (
        <div className="cart-item-controls">
          {qty > 0 ? (
            <>
              <button className="btn-small" onClick={onRemove}>-</button>
              <span className="cart-qty">{qty}</span>
              <button className="btn-small" onClick={onAdd} disabled={qty >= item.inventory_count}>+</button>
            </>
          ) : (
            <button className="btn-small" onClick={onAdd}>Add</button>
          )}
        </div>
      )}
    </div>
  )
}
