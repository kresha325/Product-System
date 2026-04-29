import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  ADMIN_SESSION_CHANGED_EVENT,
  getCurrentAdmin,
  isAdminSession,
} from '../utils/adminSession'

const baseLinkClass = 'rounded-md px-3 py-2 text-sm font-medium transition'

function linkClass({ isActive }) {
  return isActive
    ? `${baseLinkClass} bg-blue-600 text-white`
    : `${baseLinkClass} text-slate-700 hover:bg-slate-100`
}

function Navbar() {
  const [adminLabel, setAdminLabel] = useState('Admin')

  useEffect(() => {
    function syncAdminLabel() {
      if (isAdminSession()) {
        const admin = getCurrentAdmin()
        setAdminLabel(admin?.username || 'Admin')
        return
      }
      setAdminLabel('Admin')
    }

    syncAdminLabel()
    window.addEventListener(ADMIN_SESSION_CHANGED_EVENT, syncAdminLabel)
    window.addEventListener('storage', syncAdminLabel)
    return () => {
      window.removeEventListener(ADMIN_SESSION_CHANGED_EVENT, syncAdminLabel)
      window.removeEventListener('storage', syncAdminLabel)
    }
  }, [])

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/products" className="text-lg font-bold text-slate-900">
          Product System
        </NavLink>
        <nav className="flex items-center gap-2">
          <NavLink to="/businesses" className={linkClass}>
            Businesses
          </NavLink>
          <NavLink to="/products" className={linkClass}>
            Products
          </NavLink>
          <NavLink to="/admin" end className={linkClass}>
            {adminLabel}
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
