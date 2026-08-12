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
      supabase.from('canteen_items').select('*').eq('shop_id', shopId).order('name'),
      supabase.from('canteen_announcements').select('*, profile:profiles(full_name)').eq('shop_id', shopId).order('created_at', { ascending: false })
    ])
    setMenuItems(itemsRes.data ?? [])
    setAnnouncements(annRes.data ?? [])
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
      supabase.from('canteen_items').select('*').eq('shop_id', dashboardShop.id).order('name')
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

      // 3. Insert order items and decrement inventory
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

      // Update inventory counts
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

                <div className="canteen-menu-columns">
                  {/* Menu List */}
                  <div className="canteen-menu-list">
                    <h3>Menu</h3>
                    {menuItems.length === 0 && <div className="side-note">No menu items found.</div>}
                    <div className="picker-list">
                      {menuItems.map(item => {
                        const qty = cart[item.id] || 0
                        const outOfStock = item.inventory_count <= 0 || !item.is_available
                        return (
                          <div key={item.id} className={`picker-item no-click ${outOfStock ? 'item-disabled' : ''}`}>
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
                            {!outOfStock && selectedShop.is_open && (
                              <div className="cart-item-controls">
                                {qty > 0 ? (
                                  <>
                                    <button className="btn-small" onClick={() => removeFromCart(item.id)}>-</button>
                                    <span className="cart-qty">{qty}</span>
                                    <button className="btn-small" onClick={() => addToCart(item.id)} disabled={qty >= item.inventory_count}>+</button>
                                  </>
                                ) : (
                                  <button className="btn-small" onClick={() => addToCart(item.id)}>Add</button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Cart Summary */}
                  {Object.keys(cart).length > 0 && (
                    <div className={`canteen-cart-card ${animateCart ? 'cart-bounce' : ''}`}>
                      <h3>Your Cart</h3>
                      <div className="cart-items-review">
                        {Object.entries(cart).map(([itemId, qty]) => {
                          const item = menuItems.find(i => i.id === itemId)
                          if (!item) return null
                          return (
                            <div key={itemId} className="cart-review-row">
                              <span>{item.name} x {qty}</span>
                              <span>₹{(item.price * qty).toFixed(2)}</span>
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
                      <span className={`tier-tag status-${order.status}`}>
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

                    {/* Inventory counts */}
                    <h3>Inventory Management</h3>
                    <div className="picker-list" style={{ gap: 4 }}>
                      {dashboardItems.map(item => (
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
