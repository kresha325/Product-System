import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ImageWithFallback from '../components/ImageWithFallback'
import LoadingSpinner from '../components/LoadingSpinner'
import Notification from '../components/Notification'
import { getProductsDataUrl } from '../utils/github'
import { getBusinessSlug, getProductImages } from '../utils/product'

function ProductDetailPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProduct() {
      setLoading(true)
      setError('')
      try {
        const url = new URL(getProductsDataUrl())
        url.searchParams.set('t', Date.now().toString())
        const response = await fetch(url.toString(), { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Unable to fetch product data.')
        }
        const data = await response.json()
        const item = Array.isArray(data) ? data.find((entry) => entry.slug === slug) : null
        if (!item) {
          throw new Error('Product not found.')
        }
        setProduct(item)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [slug])

  if (loading) {
    return <LoadingSpinner label="Loading product..." />
  }

  if (error) {
    return <Notification type="error" message={error} />
  }

  return (
    <article className="space-y-5">
      <Link to="/products" className="text-sm font-medium text-blue-600 hover:text-blue-700">
        Back to products
      </Link>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          {getProductImages(product).map((src, index) => (
            <div key={`${product.slug}-${index}`} className="aspect-video bg-slate-100">
              <ImageWithFallback
                src={src}
                alt={`${product.name} ${index + 1}`}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {product.businessName || getBusinessSlug(product)}
          </p>
          <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {product.category}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
          <p className="leading-relaxed text-slate-700">{product.description}</p>
        </div>
      </div>
    </article>
  )
}

export default ProductDetailPage
