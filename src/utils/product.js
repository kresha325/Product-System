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
