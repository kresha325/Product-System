import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import Notification from '../components/Notification'
import { deleteBusiness, listBusinessesFromRepo, saveBusiness, updateBusiness } from '../utils/github'
import { PRODUCT_OPTIONAL_FIELDS } from '../utils/productFields'
import { toSlug } from '../utils/slug'

const INITIAL = {
  name: '',
  description: '',
  enabledFields: [],
}

function BusinessAdminPage() {
  const [form, setForm] = useState(INITIAL)
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: 'info', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState('')
  const [editingSlug, setEditingSlug] = useState('')

  const previewSlug = useMemo(() => toSlug(form.name), [form.name])

  useEffect(() => {
    let cancelled = false

    async function initialLoad() {
      try {
        const list = await listBusinessesFromRepo()
        if (!cancelled) {
          setBusinesses(list)
        }
      } catch (err) {
        if (!cancelled) {
          setStatus({ type: 'error', message: err.message || 'Failed to load businesses.' })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initialLoad()

    return () => {
      cancelled = true
    }
  }, [])

  function updateField(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function toggleField(fieldId) {
    setForm((prev) => {
      const exists = prev.enabledFields.includes(fieldId)
      return {
        ...prev,
        enabledFields: exists
          ? prev.enabledFields.filter((id) => id !== fieldId)
          : [...prev.enabledFields, fieldId],
      }
    })
  }

  async function refreshBusinesses() {
    const list = await listBusinessesFromRepo()
    setBusinesses(list)
  }

  async function onSubmit(event) {
    event.preventDefault()
    setStatus({ type: 'info', message: '' })
    if (!form.name.trim() || (!previewSlug && !editingSlug)) {
      setStatus({ type: 'error', message: 'Please enter a valid business name.' })
      return
    }
    setSubmitting(true)
    try {
      if (editingSlug) {
        await updateBusiness(editingSlug, {
          name: form.name,
          description: form.description,
          enabledFields: form.enabledFields,
        })
      } else {
        await saveBusiness({
          slug: previewSlug,
          name: form.name.trim(),
          description: form.description.trim(),
          enabledFields: form.enabledFields,
        })
      }
      setForm(INITIAL)
      setEditingSlug('')
      setStatus({ type: 'success', message: editingSlug ? 'Business updated.' : 'Business saved to GitHub.' })
      await refreshBusinesses()
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to save business.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete(slug) {
    setDeleting(slug)
    setStatus({ type: 'info', message: '' })
    try {
      await deleteBusiness(slug)
      setStatus({ type: 'success', message: 'Business deleted.' })
      await refreshBusinesses()
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to delete.' })
    } finally {
      setDeleting('')
    }
  }

  function startEdit(business) {
    setEditingSlug(business.slug)
    setForm({
      name: business.name || '',
      description: business.description || '',
      enabledFields: Array.isArray(business.enabledFields) ? business.enabledFields : [],
    })
    setStatus({ type: 'info', message: '' })
  }

  function cancelEdit() {
    setEditingSlug('')
    setForm(INITIAL)
    setStatus({ type: 'info', message: '' })
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Businesses</h1>
          <p className="mt-1 text-slate-600">
            Manage businesses. Each product belongs to one business. API JSON is published under{' '}
            <code className="rounded bg-slate-100 px-1 text-xs">public/api/&#123;slug&#125;.json</code>.
          </p>
        </div>
        <Link
          to="/admin"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Products admin
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="biz-name">
              Business name
            </label>
            <input
              id="biz-name"
              name="name"
              value={form.name}
              onChange={updateField}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="e.g. Acme Store"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Active product fields for this business</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PRODUCT_OPTIONAL_FIELDS.map((field) => (
                <label key={field.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.enabledFields.includes(field.id)}
                    onChange={() => toggleField(field.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {field.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Only selected fields will appear while creating products for this business.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="biz-desc">
              Description
            </label>
            <textarea
              id="biz-desc"
              name="description"
              rows={3}
              value={form.description}
              onChange={updateField}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="Short description"
            />
          </div>
          {previewSlug ? (
            <p className="text-xs text-slate-500">
              Slug: <span className="font-mono">{editingSlug || previewSlug}</span>
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {submitting ? <LoadingSpinner label="Saving..." /> : editingSlug ? 'Update business' : 'Save business'}
            </button>
            {editingSlug ? (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <Notification type={status.type} message={status.message} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">All businesses</h2>
        {loading ? (
          <div className="mt-4">
            <LoadingSpinner label="Loading..." />
          </div>
        ) : businesses.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No businesses.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {businesses.map((b) => (
              <li
                key={b.slug}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{b.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{b.slug}</p>
                  <p className="text-xs text-slate-500">
                    Fields: {Array.isArray(b.enabledFields) && b.enabledFields.length > 0 ? b.enabledFields.join(', ') : 'none'}
                  </p>
                </div>
                {b.slug !== 'default' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deleting === b.slug}
                      onClick={() => onDelete(b.slug)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
                    >
                      {deleting === b.slug ? '...' : 'Delete'}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Protected</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default BusinessAdminPage
