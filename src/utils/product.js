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
