import { NavLink } from 'react-router-dom'

const baseLinkClass = 'rounded-md px-3 py-2 text-sm font-medium transition'

function linkClass({ isActive }) {
  return isActive
    ? `${baseLinkClass} bg-blue-600 text-white`
    : `${baseLinkClass} text-slate-700 hover:bg-slate-100`
}

function Navbar() {
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
            Admin
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
