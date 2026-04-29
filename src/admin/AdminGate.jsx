import { useState } from 'react'
import AdminPage from './AdminPage'

const SESSION_KEY = 'product-system-admin-auth'

function AdminGate() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true',
  )

  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'kresha325.'

  function handleSubmit(event) {
    event.preventDefault()
    const normalizedExpectedPassword = expectedPassword?.trim()
    const normalizedPassword = password.trim()

    if (normalizedPassword !== normalizedExpectedPassword) {
      setError('Password gabim.')
      return
    }

    sessionStorage.setItem(SESSION_KEY, 'true')
    setIsUnlocked(true)
    setError('')
  }

  if (isUnlocked) {
    return <AdminPage />
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Admin Access</h1>
      <p className="mt-2 text-sm text-slate-600">Vendos password-in per te hyre te paneli i adminit.</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
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
