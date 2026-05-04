import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import Notification from '../components/Notification'
import ProductCard from '../components/ProductCard'
import { CATALOG_CHANGED_EVENT, dispatchCatalogChanged } from '../utils/catalogEvents'
import { deleteProductBySlug, fetchPublicRepoJson } from '../utils/github'
import { getCurrentAdmin, isAdminSession } from '../utils/adminSession'
import { getBusinessSlug } from '../utils/product'

function ProductsPage() {
  const { businessSlug: routeBusinessSlug } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingSlug, setDeletingSlug] = useState('')
  const [adminNotice, setAdminNotice] = useState({ type: 'info', message: '' })
  const currentAdmin = useMemo(() => getCurrentAdmin(), [])
  const isAdmin = isAdminSession()
  const selectedBusinessSlug = routeBusinessSlug || searchParams.get('business') || ''

  const reloadProducts = useCallback(async () => {
    const data = await fetchPublicRepoJson('data/products.json')
    if (!Array.isArray(data)) {
      throw new Error('Unable to fetch products list.')
    }
    setProducts(data)
  }, [])

  const reloadBusinesses = useCallback(async () => {
    try {
      const list = await fetchPublicRepoJson('data/businesses.json')
      setBusinesses(Array.isArray(list) ? list : [])
    } catch {
      setBusinesses([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function initialLoad() {
      setLoading(true)
      setError('')
      try {
        await reloadProducts()
        await reloadBusinesses()
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
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
  }, [reloadProducts, reloadBusinesses])

  useEffect(() => {
    function onCatalogChanged() {
      reloadProducts().catch(() => {})
      reloadBusinesses().catch(() => {})
    }

    window.addEventListener(CATALOG_CHANGED_EVENT, onCatalogChanged)
    return () => window.removeEventListener(CATALOG_CHANGED_EVENT, onCatalogChanged)
  }, [reloadProducts, reloadBusinesses])

  const visibleBusinesses = useMemo(() => {
    if (!isAdmin || !currentAdmin || currentAdmin.role === 'super_admin') {
      return businesses
    }
    return businesses.filter((business) => business.createdBy === currentAdmin.username)
  }, [businesses, currentAdmin, isAdmin])

  const visibleProducts = useMemo(() => {
    if (!isAdmin || !currentAdmin || currentAdmin.role === 'super_admin') {
      return products
    }
    const ownedSlugs = new Set(visibleBusinesses.map((business) => business.slug))
    return products.filter((product) => ownedSlugs.has(getBusinessSlug(product)))
  }, [products, visibleBusinesses, currentAdmin, isAdmin])

  const filteredProducts = useMemo(() => {
    if (!selectedBusinessSlug) {
      return visibleProducts
    }
    return visibleProducts.filter((product) => getBusinessSlug(product) === selectedBusinessSlug)
  }, [visibleProducts, selectedBusinessSlug])

  const selectedBusinessName = useMemo(() => {
    if (!selectedBusinessSlug) {
      return ''
    }
    const business = visibleBusinesses.find((entry) => entry.slug === selectedBusinessSlug)
    return business?.name || selectedBusinessSlug
  }, [visibleBusinesses, selectedBusinessSlug])

  const heading = selectedBusinessSlug ? `Products · ${selectedBusinessName}` : 'Products'

  function onBusinessChange(event) {
    const nextSlug = event.target.value
    if (!nextSlug) {
      navigate('/products')
      return
    }
    navigate(`/products?business=${encodeURIComponent(nextSlug)}`)
  }

  function canManageProduct(product) {
    if (!isAdmin || !currentAdmin) {
      return false
    }
    if (currentAdmin.role === 'super_admin') {
      return true
    }
    return visibleBusinesses.some(
      (business) =>
        business.slug === getBusinessSlug(product) && business.createdBy === currentAdmin.username,
    )
  }

  async function handleDeleteProduct(slug) {
    if (!slug || !window.confirm('Delete this product? This removes data and gallery images from the repository.')) {
      return
    }
    setAdminNotice({ type: 'info', message: '' })
    setDeletingSlug(slug)
    try {
      await deleteProductBySlug(slug)
      setAdminNotice({ type: 'success', message: 'Product deleted.' })
      await reloadProducts()
      dispatchCatalogChanged()
    } catch (err) {
      setAdminNotice({
        type: 'error',
        message: err.message || 'Failed to delete product.',
      })
    } finally {
      setDeletingSlug('')
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">{heading}</h1>
        <div className="max-w-xs space-y-1">
          <label htmlFor="business-filter" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Filter by business
          </label>
          <select
            id="business-filter"
            value={selectedBusinessSlug}
            onChange={onBusinessChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="">All businesses</option>
            {visibleBusinesses.map((business) => (
              <option key={business.slug} value={business.slug}>
                {business.name}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-slate-600">
          {selectedBusinessSlug
            ? `Showing products for this business only. `
            : 'Browse all products from your GitHub-powered catalog.'}
          {selectedBusinessSlug ? (
            <Link to="/products" className="font-medium text-blue-600 hover:text-blue-700">
              Show all products
            </Link>
          ) : null}
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading products..." />}
      {!loading && error && <Notification type="error" message={error} />}
      {!loading && adminNotice.message ? (
        <Notification type={adminNotice.type} message={adminNotice.message} />
      ) : null}
      {!loading && !error && filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.slug}
              product={product}
              showAdminEdit={canManageProduct(product)}
              onDeleteProduct={canManageProduct(product) ? handleDeleteProduct : undefined}
              deletingSlug={deletingSlug}
            />
          ))}
        </div>
      ) : null}
      {!loading && !error && filteredProducts.length === 0 ? (
        <p className="text-sm text-slate-500">No products to show.</p>
      ) : null}
    </section>
  )
}

export default ProductsPage
