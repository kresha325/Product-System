import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import Notification from '../components/Notification'
import {
  deleteProductBySlug,
  listBusinessesFromRepo,
  listProductsFromRepo,
  mergeImportedProducts,
  saveProductWithImages,
  updateProductWithImages,
} from '../utils/github'
import { fetchUrlAsWebpBase64, fileToWebpBase64 } from '../utils/image'
import { dispatchCatalogChanged } from '../utils/catalogEvents'
import { getCurrentAdmin } from '../utils/adminSession'
import { DEFAULT_BUSINESS_SLUG, getBusinessSlug, getProductImages } from '../utils/product'
import { PRODUCT_OPTIONAL_FIELD_MAP } from '../utils/productFields'
import { toSlug } from '../utils/slug'

const INITIAL_FORM = {
  name: '',
  category: '',
  description: '',
  businessSlug: DEFAULT_BUSINESS_SLUG,
  details: {},
}

function makeId() {
  return `g-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

const MAX_GALLERY_ITEMS = 24
const MAX_IMAGE_FILE_BYTES = 12 * 1024 * 1024

function AdminPage() {
  const navigate = useNavigate()
  const { slug: editSlugParam } = useParams()

  const [form, setForm] = useState(INITIAL_FORM)
  const [galleryItems, setGalleryItems] = useState([])
  const [status, setStatus] = useState({ type: 'info', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [deletingSlug, setDeletingSlug] = useState('')
  const [isDraggingImages, setIsDraggingImages] = useState(false)
  const [galleryDragId, setGalleryDragId] = useState(null)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef(null)
  const currentAdmin = useMemo(() => getCurrentAdmin(), [])

  const derivedSlug = useMemo(() => toSlug(form.name), [form.name])
  const activeSlug = editSlugParam ?? derivedSlug
  const activeBusiness = businesses.find((business) => business.slug === form.businessSlug)
  const enabledOptionalFields = Array.isArray(activeBusiness?.enabledFields)
    ? activeBusiness.enabledFields
    : []

  async function fetchProducts() {
    return listProductsFromRepo()
  }

  async function loadProducts() {
    setIsLoadingProducts(true)
    try {
      const items = await fetchProducts()
      if (!currentAdmin || currentAdmin.role === 'super_admin') {
        setProducts(items)
      } else {
        setProducts(
          items.filter((product) =>
            businesses.some(
              (business) =>
                business.slug === getBusinessSlug(product) && business.createdBy === currentAdmin.username,
            ),
          ),
        )
      }
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
          if (!currentAdmin || currentAdmin.role === 'super_admin') {
            setProducts(items)
          } else {
            setProducts(
              items.filter((product) =>
                businesses.some(
                  (business) =>
                    business.slug === getBusinessSlug(product) &&
                    business.createdBy === currentAdmin.username,
                ),
              ),
            )
          }
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
  }, [businesses, currentAdmin])

  useEffect(() => {
    let cancelled = false

    async function loadBiz() {
      try {
        const list = await listBusinessesFromRepo()
        if (!cancelled) {
          if (!currentAdmin || currentAdmin.role === 'super_admin') {
            setBusinesses(list)
          } else {
            setBusinesses(list.filter((business) => business.createdBy === currentAdmin.username))
          }
        }
      } catch {
        if (!cancelled) {
          setBusinesses([])
        }
      }
    }

    loadBiz()

    return () => {
      cancelled = true
    }
  }, [currentAdmin])

  useEffect(() => {
    if (!editSlugParam) {
      return
    }

    let cancelled = false

    async function loadEdit() {
      setStatus({ type: 'info', message: '' })
      try {
        const items = await listProductsFromRepo()
        const found = items.find((p) => p.slug === editSlugParam)
        if (!found || cancelled) {
          if (!cancelled) {
            setStatus({ type: 'error', message: 'Product not found.' })
          }
          return
        }
        setForm({
          name: found.name,
          category: found.category,
          description: found.description,
          businessSlug: getBusinessSlug(found),
          details: found.details && typeof found.details === 'object' ? found.details : {},
        })
        const imgs = getProductImages(found)
        setGalleryItems(
          imgs.map((url) => ({
            id: makeId(),
            kind: 'existing',
            url,
          })),
        )
      } catch (err) {
        if (!cancelled) {
          setStatus({ type: 'error', message: err.message || 'Failed to load product.' })
        }
      }
    }

    loadEdit()

    return () => {
      cancelled = true
    }
  }, [editSlugParam])

  function updateField(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function updateDetailField(event) {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      details: {
        ...(prev.details || {}),
        [name]: value,
      },
    }))
  }

  function cleanEnabledDetails(details, enabledFieldIds) {
    const next = {}
    for (const fieldId of enabledFieldIds) {
      const raw = details?.[fieldId]
      if (raw === undefined || raw === null) {
        continue
      }
      const value = String(raw).trim()
      if (!value) {
        continue
      }
      if (fieldId === 'price') {
        const parsed = Number(value)
        if (!Number.isNaN(parsed)) {
          next[fieldId] = parsed
        }
        continue
      }
      if (fieldId === 'stockQuantity') {
        const parsed = parseInt(value, 10)
        if (!Number.isNaN(parsed)) {
          next[fieldId] = parsed
        }
        continue
      }
      if (fieldId === 'tags') {
        next[fieldId] = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
        continue
      }
      next[fieldId] = value
    }
    return next
  }

  function appendFiles(files) {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) {
      return
    }
    const oversized = imageFiles.filter((file) => file.size > MAX_IMAGE_FILE_BYTES)
    if (oversized.length > 0) {
      setStatus({
        type: 'error',
        message: `Some images exceed ${Math.round(MAX_IMAGE_FILE_BYTES / (1024 * 1024))}MB each.`,
      })
      return
    }
    setGalleryItems((prev) => {
      const room = MAX_GALLERY_ITEMS - prev.length
      if (room <= 0) {
        requestAnimationFrame(() =>
          setStatus({
            type: 'error',
            message: `Maximum ${MAX_GALLERY_ITEMS} images per product.`,
          }),
        )
        return prev
      }
      const slice = imageFiles.slice(0, room)
      if (slice.length < imageFiles.length) {
        requestAnimationFrame(() =>
          setStatus({
            type: 'info',
            message: `Added ${slice.length} image(s); limit is ${MAX_GALLERY_ITEMS} total.`,
          }),
        )
      }
      return [
        ...prev,
        ...slice.map((file) => ({
          id: makeId(),
          kind: 'pending',
          file,
          preview: URL.createObjectURL(file),
        })),
      ]
    })
  }

  function addFiles(event) {
    const files = Array.from(event.target.files || [])
    appendFiles(files)
    event.target.value = ''
  }

  function onDragOverImages(event) {
    event.preventDefault()
    setIsDraggingImages(true)
  }

  function onDragEnterImages(event) {
    event.preventDefault()
    setIsDraggingImages(true)
  }

  function onDragLeaveImages(event) {
    event.preventDefault()
    if (event.currentTarget.contains(event.relatedTarget)) {
      return
    }
    setIsDraggingImages(false)
  }

  function onDropImages(event) {
    event.preventDefault()
    setIsDraggingImages(false)
    const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
      file.type.startsWith('image/'),
    )
    appendFiles(files)
  }

  function removeGalleryItem(id) {
    setGalleryItems((prev) => {
      const item = prev.find((entry) => entry.id === id)
      if (item?.kind === 'pending' && item.preview) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter((entry) => entry.id !== id)
    })
  }

  function reorderGalleryDrop(targetId) {
    if (!galleryDragId || galleryDragId === targetId) {
      setGalleryDragId(null)
      return
    }
    setGalleryItems((prev) => {
      const from = prev.findIndex((entry) => entry.id === galleryDragId)
      const to = prev.findIndex((entry) => entry.id === targetId)
      if (from < 0 || to < 0) {
        return prev
      }
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setGalleryDragId(null)
  }

  function exportProductsJson() {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `products-export-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function onImportProductsFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !currentAdmin) {
      return
    }
    setImporting(true)
    setStatus({ type: 'info', message: '' })
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const rows = Array.isArray(data) ? data : data?.products
      if (!Array.isArray(rows)) {
        throw new Error('JSON must be an array of products or an object with a "products" array.')
      }
      const { added } = await mergeImportedProducts(rows, currentAdmin)
      setStatus({
        type: 'success',
        message: `Import complete: ${added} new product(s) added (duplicates and other businesses skipped).`,
      })
      await loadProducts()
      dispatchCatalogChanged()
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Import failed.',
      })
    } finally {
      setImporting(false)
    }
  }

  async function buildBase64Gallery() {
    const result = []
    for (const item of galleryItems) {
      if (item.kind === 'pending') {
        result.push(await fileToWebpBase64(item.file))
      } else {
        result.push(await fetchUrlAsWebpBase64(item.url))
      }
    }
    return result
  }

  async function onSubmit(event) {
    event.preventDefault()
    setStatus({ type: 'info', message: '' })

    if (!form.name || !form.category || !form.description) {
      setStatus({ type: 'error', message: 'Please complete all fields before submitting.' })
      return
    }
    if (!form.businessSlug || !businesses.some((business) => business.slug === form.businessSlug)) {
      setStatus({ type: 'error', message: 'Please select one of your businesses first.' })
      return
    }

    if (!galleryItems.length) {
      setStatus({ type: 'error', message: 'Please add at least one image.' })
      return
    }
    if (galleryItems.length > MAX_GALLERY_ITEMS) {
      setStatus({ type: 'error', message: `Too many images (max ${MAX_GALLERY_ITEMS}).` })
      return
    }

    if (!activeSlug) {
      setStatus({ type: 'error', message: 'Invalid product name. Please adjust it.' })
      return
    }

    if (!editSlugParam) {
      const existing = await listProductsFromRepo()
      if (existing.some((p) => p.slug === activeSlug)) {
        setStatus({ type: 'error', message: 'A product with this slug already exists.' })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const base64Images = await buildBase64Gallery()
      const bizLabel =
        businesses.find((business) => business.slug === form.businessSlug)?.name ?? form.businessSlug
      const cleanedDetails = cleanEnabledDetails(form.details, enabledOptionalFields)

      if (editSlugParam) {
        await updateProductWithImages(
          editSlugParam,
          {
            name: form.name.trim(),
            category: form.category.trim(),
            description: form.description.trim(),
            businessSlug: form.businessSlug,
            businessName: bizLabel,
            details: cleanedDetails,
          },
          base64Images,
        )
      } else {
        await saveProductWithImages(
          {
            name: form.name.trim(),
            slug: activeSlug,
            category: form.category.trim(),
            description: form.description.trim(),
            businessSlug: form.businessSlug,
            businessName: bizLabel,
            details: cleanedDetails,
          },
          base64Images,
        )
      }
      setForm({ ...INITIAL_FORM, businessSlug: form.businessSlug })
      galleryItems.forEach((item) => {
        if (item.kind === 'pending' && item.preview) {
          URL.revokeObjectURL(item.preview)
        }
      })
      setGalleryItems([])
      setStatus({ type: 'success', message: 'Product saved to GitHub successfully.' })
      await loadProducts()
      dispatchCatalogChanged()
      if (editSlugParam) {
        navigate('/admin')
      }
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
      dispatchCatalogChanged()
      if (editSlugParam === slugToDelete) {
        navigate('/admin')
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Failed to delete product.',
      })
    } finally {
      setDeletingSlug('')
    }
  }

  const heading = editSlugParam ? 'Edit Product' : 'Admin Panel'

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{heading}</h1>
          <p className="mt-1 text-slate-600">
            Add products directly to your GitHub repository with no database.
          </p>
          <Link
            to="/admin/businesses"
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Manage businesses →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {editSlugParam ? (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
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
              readOnly={Boolean(editSlugParam)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none read-only:bg-slate-50"
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
            <label className="text-sm font-medium text-slate-700" htmlFor="businessSlug">
              Business
            </label>
            <select
              id="businessSlug"
              name="businessSlug"
              value={form.businessSlug}
              onChange={updateField}
              disabled={businesses.length === 0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none disabled:bg-slate-100"
            >
              {businesses.map((business) => (
                <option key={business.slug} value={business.slug}>
                  {business.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Products are grouped per business for catalog and JSON APIs.</p>
          </div>

          {enabledOptionalFields.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Optional fields enabled by business</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {enabledOptionalFields
                  .map((fieldId) => PRODUCT_OPTIONAL_FIELD_MAP[fieldId])
                  .filter(Boolean)
                  .map((field) => (
                    <div key={field.id} className="space-y-1">
                      <label className="text-xs font-medium text-slate-700" htmlFor={`detail-${field.id}`}>
                        {field.label}
                      </label>
                      <input
                        id={`detail-${field.id}`}
                        name={field.id}
                        type={field.type}
                        step={field.step}
                        value={form.details?.[field.id] ?? ''}
                        onChange={updateDetailField}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="imageFiles">
              Product Images
            </label>
            <div
              onDragOver={onDragOverImages}
              onDragEnter={onDragEnterImages}
              onDragLeave={onDragLeaveImages}
              onDrop={onDropImages}
              className={`rounded-lg border-2 border-dashed p-3 transition ${
                isDraggingImages ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'
              }`}
            >
              <input
                id="imageFiles"
                name="imageFiles"
                type="file"
                accept="image/*"
                multiple
                onChange={addFiles}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700"
              />
              <p className="mt-2 text-xs text-slate-500">
                Drag & drop images here, or click to select multiple files. Max {MAX_GALLERY_ITEMS} images, up to{' '}
                {Math.round(MAX_IMAGE_FILE_BYTES / (1024 * 1024))}MB each (before WebP).
              </p>
            </div>
            {galleryItems.length > 0 && (
              <p className="text-xs text-slate-500">Drag thumbnails to change image order.</p>
            )}
            {galleryItems.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {galleryItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setGalleryDragId(item.id)}
                    onDragEnd={() => setGalleryDragId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => reorderGalleryDrop(item.id)}
                    className={`relative cursor-grab overflow-hidden rounded-lg border active:cursor-grabbing ${
                      galleryDragId === item.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={item.kind === 'pending' ? item.preview : item.url}
                      alt=""
                      className="aspect-square w-full object-cover"
                      draggable={false}
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(item.id)}
                      className="absolute right-1 top-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeSlug && (
            <p className="text-xs text-slate-500">
              Slug: <span className="font-mono">{activeSlug}</span>
              {editSlugParam ? <span className="ml-2">(cannot change slug)</span> : null}
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
        <p className="mt-1 text-sm text-slate-600">Edit or delete products in the repository.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportProductsJson}
            disabled={products.length === 0 || isLoadingProducts}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export JSON (visible list)
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing || !currentAdmin}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import JSON'}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportProductsFile}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Import expects <span className="font-mono">products[]</span> with slug, name, businessSlug, category,
          description; skips duplicates and businesses you cannot manage.
        </p>

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
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">
                    {product.slug}
                    <span className="text-slate-400"> · </span>
                    <span className="font-mono">{getBusinessSlug(product)}</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/admin/edit/${product.slug}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(product.slug)}
                    disabled={deletingSlug === product.slug}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                  >
                    {deletingSlug === product.slug ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminPage
