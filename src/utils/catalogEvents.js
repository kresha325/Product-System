/** Dispatched after catalog data changes on GitHub so public views can refetch immediately. */
export const CATALOG_CHANGED_EVENT = 'product-system-catalog-changed'

export function dispatchCatalogChanged() {
  window.dispatchEvent(new Event(CATALOG_CHANGED_EVENT))
}
