export const DEFAULT_BUSINESS_SLUG = 'default'

/** Prefer explicit businessSlug; legacy products fall back to default business. */
export function getBusinessSlug(product) {
  if (!product || !product.businessSlug) {
    return DEFAULT_BUSINESS_SLUG
  }
  return product.businessSlug
}

/** Normalize legacy single `image` into `images[]` for display and saves. */
export function getProductImages(product) {
  if (!product) {
    return []
  }
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images
  }
  if (product.image) {
    return [product.image]
  }
  return []
}

/** Changes when product metadata/images update — used to bust browser/CDN cache on stable asset URLs. */
export function getImageCacheKey(product) {
  if (!product) {
    return ''
  }
  if (product.updatedAt) {
    return String(product.updatedAt)
  }
  const imgs = getProductImages(product)
  return `${product.slug}:${imgs.join('|')}`.slice(0, 512)
}

export function imageUrlWithCacheBust(url, cacheKey) {
  if (!url) {
    return ''
  }
  if (!cacheKey) {
    return url
  }
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url
  }
  const lower = url.toLowerCase()
  if (lower.includes('fallback.svg')) {
    return url
  }
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${encodeURIComponent(cacheKey)}`
}
