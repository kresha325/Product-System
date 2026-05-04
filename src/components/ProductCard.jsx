import { Link } from 'react-router-dom'
import ImageWithFallback from './ImageWithFallback'
import { getBusinessSlug, getImageCacheKey, getProductImages } from '../utils/product'

function ProductCard({
  product,
  showAdminEdit = false,
  onDeleteProduct,
  deletingSlug = '',
}) {
  const cover = getProductImages(product)[0]
  const imageCacheKey = getImageCacheKey(product)

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-video bg-slate-100">
          <ImageWithFallback src={cover} alt={product.name} cacheKey={imageCacheKey} />
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
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Link
            to={`/admin/edit/${product.slug}`}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            Edit
          </Link>
          {typeof onDeleteProduct === 'function' ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                onDeleteProduct(product.slug)
              }}
              disabled={deletingSlug === product.slug}
              className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingSlug === product.slug ? 'Deleting…' : 'Delete'}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export default ProductCard
