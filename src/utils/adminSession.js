/** Matches AdminGate sessionStorage key — used for optional Edit links on cards when logged in as admin. */
export const ADMIN_SESSION_KEY = 'product-system-admin-auth'
export const ADMIN_PROFILE_KEY = 'product-system-admin-profile'
export const ADMIN_SESSION_CHANGED_EVENT = 'product-system-admin-session-changed'

export function setCurrentAdmin(admin) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
  sessionStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(admin))
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGED_EVENT))
}

export function clearCurrentAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
  sessionStorage.removeItem(ADMIN_PROFILE_KEY)
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGED_EVENT))
}

export function getCurrentAdmin() {
  try {
    const raw = sessionStorage.getItem(ADMIN_PROFILE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isAdminSession() {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true' && !!getCurrentAdmin()
  } catch {
    return false
  }
}
