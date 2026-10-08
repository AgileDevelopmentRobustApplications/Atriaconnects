// When the user last opened Notifications; posts newer than this count as
// unseen college news (bell dot, "New" markers).
const NEWS_SEEN_KEY = 'news-seen-at'

export function readNewsSeenAt() {
  try {
    return Number(localStorage.getItem(NEWS_SEEN_KEY)) || 0
  } catch {
    return 0
  }
}

export function markNewsSeen() {
  try {
    localStorage.setItem(NEWS_SEEN_KEY, String(Date.now()))
  } catch {
    /* unavailable — the dot just stays until next visit */
  }
  window.dispatchEvent(new Event('news-seen'))
}
