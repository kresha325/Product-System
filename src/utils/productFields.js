export const PRODUCT_OPTIONAL_FIELDS = [
  { id: 'price', label: 'Price', type: 'number', step: '0.01', placeholder: '129.99' },
  { id: 'currency', label: 'Currency', type: 'text', placeholder: 'EUR' },
  { id: 'sku', label: 'SKU', type: 'text', placeholder: 'SKU-001' },
  { id: 'brand', label: 'Brand', type: 'text', placeholder: 'Nike' },
  { id: 'barcode', label: 'Barcode', type: 'text', placeholder: 'EAN/UPC/ISBN' },
  { id: 'stockQuantity', label: 'Stock quantity', type: 'number', step: '1', placeholder: '25' },
  { id: 'weight', label: 'Weight', type: 'text', placeholder: '1.2kg' },
  { id: 'tags', label: 'Tags (comma separated)', type: 'text', placeholder: 'running, men' },
]

export const PRODUCT_OPTIONAL_FIELD_MAP = PRODUCT_OPTIONAL_FIELDS.reduce((acc, field) => {
  acc[field.id] = field
  return acc
}, {})

