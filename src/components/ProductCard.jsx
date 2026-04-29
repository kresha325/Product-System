import { Link } from 'react-router-dom'
import ImageWithFallback from './ImageWithFallback'
import { getBusinessSlug, getProductImages } from '../utils/product'

function ProductCard({ product, showAdminEdit = false }) {
  const cover = getProductImages(product)[0]

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-video bg-slate-100">
          <ImageWithFallback src={cover} alt={product.name} />
        </div>
        <div className="space-y-2 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {product.businessName || getBusinessSlug(product)}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{product.category}</p>
          <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
          <p className="text-sm text-slate-600">{product.description}</p>
        </div>
      </Link>
      {showAdminEdit ? (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
          <Link
            to={`/admin/edit/${product.slug}`}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            Edit product
          </Link>
        </div>
      ) : null}
    </article>
  )
}

export default ProductCard
