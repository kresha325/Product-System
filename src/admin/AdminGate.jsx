import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import AdminPage from './AdminPage'
import BusinessAdminPage from './BusinessAdminPage'
import { clearCurrentAdmin, getCurrentAdmin, setCurrentAdmin } from '../utils/adminSession'

function AdminGate() {
  const currentAdmin = getCurrentAdmin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(() => !!getCurrentAdmin())
  const superAdminUsername = (import.meta.env.VITE_SUPERADMIN_USERNAME || '').trim()
  const superAdminPassword = (import.meta.env.VITE_SUPERADMIN_PASSWORD || '').trim()

  const credentials = (import.meta.env.VITE_ADMIN_CREDENTIALS || 'erblin:erblin325.,enes:enes325.')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, pass] = entry.split(':')
      return {
        username: (name || '').trim(),
        password: (pass || '').trim(),
      }
    })
    .filter((entry) => entry.username && entry.password)

  function handleSubmit(event) {
    event.preventDefault()
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedPassword = password.trim()
    const isSuperAdminMatch =
      !!superAdminUsername &&
      !!superAdminPassword &&
      superAdminUsername.toLowerCase() === normalizedUsername &&
      superAdminPassword === normalizedPassword

    if (isSuperAdminMatch) {
      setCurrentAdmin({
        username: superAdminUsername,
        role: 'super_admin',
      })
      setIsUnlocked(true)
      setError('')
      return
    }

    const matched = credentials.find(
      (entry) =>
        entry.username.toLowerCase() === normalizedUsername &&
        entry.password === normalizedPassword,
    )

    if (!matched) {
      setError('Password gabim.')
      return
    }

    setCurrentAdmin({
      username: matched.username,
      role: 'admin',
    })
    setIsUnlocked(true)
    setError('')
  }

  function handleLogout() {
    clearCurrentAdmin()
    setUsername('')
    setPassword('')
    setShowPassword(false)
    setError('')
    setIsUnlocked(false)
  }

  if (isUnlocked) {
    return (
      <div className="space-y-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-600">
            Signed in as <span className="font-semibold text-slate-900">{currentAdmin?.username}</span>
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
        <Routes>
          <Route index element={<AdminPage />} />
          <Route path="businesses" element={<BusinessAdminPage />} />
          <Route path="edit/:slug" element={<AdminPage />} />
        </Routes>
      </div>
    )
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Admin Access</h1>
      <p className="mt-2 text-sm text-slate-600">Vendos password-in per te hyre te paneli i adminit.</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="admin-username" className="text-sm font-medium text-slate-700">
            Username
          </label>
          <input
            id="admin-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            placeholder="binisoft"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="admin-password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-blue-400">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full bg-transparent text-sm outline-none"
              placeholder="********"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
              aria-label={showPassword ? 'Fsheh password' : 'Shfaq password'}
            >
              {showPassword ? 'Fsheh' : 'Shfaq'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Hyr ne Admin
        </button>
      </form>
    </section>
  )
}

export default AdminGate
