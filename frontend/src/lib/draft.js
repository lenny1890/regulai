const KEY_TEXT = 'jc_draft_text'
const KEY_TS   = 'jc_draft_timestamp'
const KEY_CHAN = 'jc_draft_channel'
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours

export function saveDraft(text, channel) {
  try {
    localStorage.setItem(KEY_TEXT, text)
    localStorage.setItem(KEY_TS, Date.now().toString())
    localStorage.setItem(KEY_CHAN, channel ?? '')
  } catch {
    // localStorage unavailable (private mode, storage full) — silently skip
  }
}

export function loadDraft() {
  try {
    const ts = parseInt(localStorage.getItem(KEY_TS) ?? '0', 10)
    if (!ts || Date.now() - ts > EXPIRY_MS) {
      clearDraft()
      return null
    }
    const text = localStorage.getItem(KEY_TEXT) ?? ''
    const channel = localStorage.getItem(KEY_CHAN) || null
    return text ? { text, channel } : null
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY_TEXT)
    localStorage.removeItem(KEY_TS)
    localStorage.removeItem(KEY_CHAN)
  } catch {
    // localStorage unavailable — silently skip
  }
}
