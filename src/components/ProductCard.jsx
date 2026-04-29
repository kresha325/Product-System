import { Link } from 'react-router-dom'
import ImageWithFallback from './ImageWithFallback'
import { getProductImages } from '../utils/product'

function ProductCard({ product }) {
  const cover = getProductImages(product)[0]

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-video bg-slate-100">
          <ImageWithFallback src={cover} alt={product.name} />
        </div>
        <div className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{product.category}</p>
          <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
          <p className="text-sm text-slate-600">{product.description}</p>
        </div>
      </Link>
    </article>
  )
}

export default ProductCard
