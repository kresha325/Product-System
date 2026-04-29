import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import Notification from '../components/Notification'
import ProductCard from '../components/ProductCard'
import { getBusinessesDataUrl, getProductsDataUrl } from '../utils/github'
import { getBusinessSlug } from '../utils/product'

function ProductsPage() {
  const { businessSlug } = useParams()
  const [products, setProducts] = useState([])
  const [businessTitle, setBusinessTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      setError('')
      try {
        const url = new URL(getProductsDataUrl())
        url.searchParams.set('t', Date.now().toString())
        const response = await fetch(url.toString(), { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Unable to fetch products list.')
        }
        const data = await response.json()
        const list = Array.isArray(data) ? data : []
        const filtered = businessSlug ? list.filter((p) => getBusinessSlug(p) === businessSlug) : list
        setProducts(filtered)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [businessSlug])

  useEffect(() => {
    let cancelled = false

    async function loadBusinessTitle() {
      if (!businessSlug) {
        setBusinessTitle('')
        return
      }
      try {
        const url = new URL(getBusinessesDataUrl())
        url.searchParams.set('t', Date.now().toString())
        const response = await fetch(url.toString(), { cache: 'no-store' })
        if (!response.ok) {
          return
        }
        const list = await response.json()
        const entry = Array.isArray(list) ? list.find((b) => b.slug === businessSlug) : null
        if (!cancelled) {
          setBusinessTitle(entry?.name ?? businessSlug)
        }
      } catch {
        if (!cancelled) {
          setBusinessTitle(businessSlug)
        }
      }
    }

    loadBusinessTitle()

    return () => {
      cancelled = true
    }
  }, [businessSlug])

  const heading = businessSlug ? `Products · ${businessTitle}` : 'Products'

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{heading}</h1>
        <p className="mt-1 text-slate-600">
          {businessSlug
            ? `Showing products for this business only. `
            : 'Browse all products from your GitHub-powered catalog.'}
          {businessSlug ? (
            <Link to="/products" className="font-medium text-blue-600 hover:text-blue-700">
              Show all products
            </Link>
          ) : null}
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading products..." />}
      {!loading && error && <Notification type="error" message={error} />}
      {!loading && !error && products.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      ) : null}
      {!loading && !error && products.length === 0 ? (
        <p className="text-sm text-slate-500">No products to show.</p>
      ) : null}
    </section>
  )
}

export default ProductsPage
