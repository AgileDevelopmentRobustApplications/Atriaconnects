// Campus services that open as pages in the main pane (/shop, /canteen).
// Both are placeholders for now: a header, a "coming soon" hero and a short
// preview of what's planned. Add `live: true` + real content when built.
export const SERVICES = {
  '/shop': {
    title: 'Shop',
    subtitle: 'College store',
    icon: 'store',
    text: 'Stationery, merchandise and campus essentials — order from the college store right here.',
    planned: [
      { icon: 'book', title: 'Stationery & lab supplies', text: 'Notebooks, record books, lab coats and kits.' },
      { icon: 'shopping-bag', title: 'College merchandise', text: 'Hoodies, tees and accessories in college colours.' },
      { icon: 'clock', title: 'Order ahead, pick up', text: 'Reserve online and collect at the counter.' },
    ],
  },
  '/canteen': {
    title: 'Canteen',
    subtitle: 'Food & beverages',
    icon: 'utensils',
    text: 'Browse the menu, order ahead and pick up your token without waiting in line.',
    planned: [
      { icon: 'file', title: "Today's menu", text: 'Daily specials and what’s available right now.' },
      { icon: 'clock', title: 'Order ahead', text: 'Skip the queue — order before your break.' },
      { icon: 'check', title: 'Pickup tokens', text: 'Get notified the moment your order is ready.' },
    ],
  },
}
