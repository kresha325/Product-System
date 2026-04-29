import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import Notification from '../components/Notification'
import { getBusinessesDataUrl } from '../utils/github'

function BusinessesPage() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const url = new URL(getBusinessesDataUrl())
        url.searchParams.set('t', Date.now().toString())
        const response = await fetch(url.toString(), { cache: 'no-store' })
        if (response.status === 404) {
          setBusinesses([])
          return
        }
        if (!response.ok) {
          throw new Error('Unable to fetch businesses.')
        }
        const data = await response.json()
        setBusinesses(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Businesses</h1>
        <p className="mt-1 text-slate-600">Pick a business to see its products.</p>
      </div>

      {loading && <LoadingSpinner label="Loading businesses..." />}
      {!loading && error && <Notification type="error" message={error} />}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <Link
              key={b.slug}
              to={`/business/${b.slug}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-900">{b.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{b.description || '—'}</p>
              <p className="mt-2 text-xs font-mono text-slate-400">{b.slug}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default BusinessesPage
