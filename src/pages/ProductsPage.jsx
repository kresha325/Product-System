import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import Notification from '../components/Notification'
import ProductCard from '../components/ProductCard'
import { getProductsDataUrl } from '../utils/github'

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(getProductsDataUrl())
        if (!response.ok) {
          throw new Error('Unable to fetch products list.')
        }
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Products</h1>
        <p className="mt-1 text-slate-600">Browse all products from your GitHub-powered catalog.</p>
      </div>

      {loading && <LoadingSpinner label="Loading products..." />}
      {!loading && error && <Notification type="error" message={error} />}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}

export default ProductsPage
