import { Link } from 'react-router-dom'
import ImageWithFallback from './ImageWithFallback'

function ProductCard({ product }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-video bg-slate-100">
          <ImageWithFallback src={product.image} alt={product.name} />
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
