/** Matches AdminGate sessionStorage key — used for optional Edit links on cards when logged in as admin. */
export const ADMIN_SESSION_KEY = 'product-system-admin-auth'

export function isAdminSession() {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}
