import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import Notification from '../components/Notification'
import { deleteProductBySlug, listProductsFromRepo, saveProductWithImage } from '../utils/github'
import { fileToWebpBase64 } from '../utils/image'
import { toSlug } from '../utils/slug'

const INITIAL_FORM = {
  name: '',
  category: '',
  description: '',
  imageFile: null,
}

function AdminPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [previewUrl, setPreviewUrl] = useState('')
  const [status, setStatus] = useState({ type: 'info', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [deletingSlug, setDeletingSlug] = useState('')

  const slug = useMemo(() => toSlug(form.name), [form.name])

  async function fetchProducts() {
    const items = await listProductsFromRepo()
    return items
  }

  async function loadProducts() {
    setIsLoadingProducts(true)
    try {
      const items = await fetchProducts()
      setProducts(items)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function initialLoad() {
      try {
        const items = await fetchProducts()
        if (mounted) {
          setProducts(items)
        }
      } catch (err) {
        if (mounted) {
          setStatus({
            type: 'error',
            message: err.message || 'Failed to load products.',
          })
        }
      } finally {
        if (mounted) {
          setIsLoadingProducts(false)
        }
      }
    }

    initialLoad()

    return () => {
      mounted = false
    }
  }, [])

  function updateField(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function updateImage(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setForm((prev) => ({ ...prev, imageFile: file }))
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setStatus({ type: 'info', message: '' })

    if (!form.name || !form.category || !form.description || !form.imageFile) {
      setStatus({ type: 'error', message: 'Please complete all fields before submitting.' })
      return
    }

    if (!slug) {
      setStatus({ type: 'error', message: 'Invalid product name. Please adjust it.' })
      return
    }

    setIsSubmitting(true)
    try {
      const imageBase64 = await fileToWebpBase64(form.imageFile)
      await saveProductWithImage(
        {
          name: form.name.trim(),
          slug,
          category: form.category.trim(),
          description: form.description.trim(),
        },
        imageBase64,
      )
      setForm(INITIAL_FORM)
      setPreviewUrl('')
      setStatus({ type: 'success', message: 'Product saved to GitHub successfully.' })
      await loadProducts()
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Failed to save product.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onDelete(slugToDelete) {
    setDeletingSlug(slugToDelete)
    setStatus({ type: 'info', message: '' })
    try {
      await deleteProductBySlug(slugToDelete)
      setStatus({ type: 'success', message: 'Product deleted successfully.' })
      await loadProducts()
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Failed to delete product.',
      })
    } finally {
      setDeletingSlug('')
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
        <p className="mt-1 text-slate-600">
          Add products directly to your GitHub repository with no database.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Product Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={updateField}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="e.g. Smart Backpack"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="category">
              Category
            </label>
            <input
              id="category"
              name="category"
              type="text"
              value={form.category}
              onChange={updateField}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="Accessories"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={form.description}
              onChange={updateField}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="Describe your product..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="imageFile">
              Product Image
            </label>
            <input
              id="imageFile"
              name="imageFile"
              type="file"
              accept="image/*"
              onChange={updateImage}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700"
            />
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="mt-2 h-44 w-full rounded-lg border border-slate-200 object-cover"
              />
            )}
          </div>

          {slug && (
            <p className="text-xs text-slate-500">
              Generated slug: <span className="font-mono">{slug}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? <LoadingSpinner label="Saving..." /> : 'Save Product'}
          </button>
        </form>
      </div>

      <Notification type={status.type} message={status.message} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Manage Products</h2>
        <p className="mt-1 text-sm text-slate-600">Delete products and their images from the repository.</p>

        {isLoadingProducts ? (
          <div className="mt-4">
            <LoadingSpinner label="Loading products..." />
          </div>
        ) : products.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No products found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {products.map((product) => (
              <div
                key={product.slug}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(product.slug)}
                  disabled={deletingSlug === product.slug}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {deletingSlug === product.slug ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminPage
