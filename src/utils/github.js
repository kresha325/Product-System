import { getBusinessSlug } from './product.js'

const API_BASE = 'https://api.github.com'
const DEFAULT_BRANCH = 'main'
const DEFAULT_OWNER = 'kresha325'
const DEFAULT_REPO = 'Product-System'
/** Version for generated API JSON payloads (bump when shape changes). */
export const API_SCHEMA_VERSION = 1
const AUDIT_PATH = 'data/audit.json'
const MAX_AUDIT_ENTRIES = 150

function env(name, fallback = '') {
  const value = import.meta.env[name]
  if (!value && !fallback) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value || fallback
}

function config({ requireToken = true } = {}) {
  const owner = env('VITE_GITHUB_OWNER', DEFAULT_OWNER)
  const repo = env('VITE_GITHUB_REPO', DEFAULT_REPO)
  const token = requireToken
    ? env(
        'VITE_GITHUB_TOKEN',
        '',
      )
    : import.meta.env.VITE_GITHUB_TOKEN
  if (requireToken && !token) {
    throw new Error(
      'Missing VITE_GITHUB_TOKEN. Vendose ne .env (lokal) ose te GitHub Actions Secrets (deploy).',
    )
  }
  return { owner, repo, token }
}

async function githubRequest(path, options = {}) {
  const { owner, repo, token } = config({ requireToken: true })
  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${text}`)
  }
  if (response.status === 204) {
    return null
  }
  const raw = await response.text()
  return raw ? JSON.parse(raw) : null
}

function decodeContent(content) {
  const binary = atob(content.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeContent(content) {
  const utf8 = new TextEncoder().encode(content)
  const binary = utf8.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
  return btoa(binary)
}

function toCategorySlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

function buildGalleryPageUrl(businessSlug, slug, index) {
  const { owner, repo } = config()
  return `https://${owner}.github.io/${repo}/images/${businessSlug}/${slug}/${index}.webp`
}

async function deleteGalleryFolderContents(businessSlug, slug) {
  const folderPath = `public/images/${businessSlug}/${slug}`
  try {
    const data = await githubRequest(`/contents/${folderPath}`)
    if (!Array.isArray(data)) {
      return
    }
    for (const item of data) {
      await deleteRepoFile({ path: item.path, message: `Remove ${item.path}` })
    }
  } catch {
    // Folder missing or empty.
  }
}

async function deleteLegacySingleImage(slug) {
  try {
    await deleteRepoFile({
      path: `public/images/${slug}.webp`,
      message: `Remove legacy image: ${slug}`,
    })
  } catch {
    // Missing file.
  }
}

export async function replaceProductGallery(businessSlug, slug, base64Images) {
  if (!base64Images.length) {
    throw new Error('At least one image is required.')
  }
  await deleteGalleryFolderContents(businessSlug, slug)
  await deleteLegacySingleImage(slug)
  const urls = []
  for (let i = 0; i < base64Images.length; i++) {
    const path = `public/images/${businessSlug}/${slug}/${i + 1}.webp`
    await putRepoFile({
      path,
      content: base64Images[i],
      message: `Upload gallery ${slug} ${i + 1}`,
      contentBase64: true,
    })
    urls.push(buildGalleryPageUrl(businessSlug, slug, i + 1))
  }
  return urls
}

export async function getRepoFile(path) {
  const data = await githubRequest(`/contents/${path}`)
  return {
    sha: data.sha,
    content: decodeContent(data.content),
  }
}

export async function putRepoFile({ path, content, message, sha, contentBase64 = false }) {
  const encoded = contentBase64
    ? String(content).replace(/\s/g, '')
    : encodeContent(content)

  const body = {
    message,
    content: encoded,
    branch: DEFAULT_BRANCH,
  }
  if (sha) {
    body.sha = sha
  }

  return githubRequest(`/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

async function putJsonFile(path, data, message) {
  const content = JSON.stringify(data, null, 2)
  let sha
  try {
    const file = await getRepoFile(path)
    sha = file.sha
  } catch {
    sha = undefined
  }
  await putRepoFile({
    path,
    content,
    message,
    sha,
  })
}

async function appendAudit(entry) {
  let list = []
  try {
    const file = await getRepoFile(AUDIT_PATH)
    const parsed = JSON.parse(file.content)
    if (Array.isArray(parsed)) {
      list = parsed
    }
  } catch {
    // First run or missing file.
  }
  list.unshift({
    at: new Date().toISOString(),
    schemaVersion: API_SCHEMA_VERSION,
    ...entry,
  })
  list = list.slice(0, MAX_AUDIT_ENTRIES)
  await putJsonFile(AUDIT_PATH, list, `Audit: ${entry.action || 'event'}`)
}

async function deleteStaleCategoryApiFiles(businessSlug, categoryNames) {
  const expectedSlugs = new Set(categoryNames.map((name) => toCategorySlug(name)))
  const folderPath = `public/api/${businessSlug}/category`
  try {
    const data = await githubRequest(`/contents/${folderPath}`)
    if (!Array.isArray(data)) {
      return
    }
    for (const item of data) {
      if (item.type !== 'file' || !item.name.toLowerCase().endsWith('.json')) {
        continue
      }
      const slug = item.name.slice(0, -'.json'.length)
      if (!expectedSlugs.has(slug)) {
        await deleteRepoFile({
          path: item.path,
          message: `Remove stale category API ${businessSlug}/${slug}`,
        })
      }
    }
  } catch {
    // Folder missing or empty.
  }
}

async function deleteCategoryApiFolder(businessSlug) {
  const folderPath = `public/api/${businessSlug}/category`
  try {
    const data = await githubRequest(`/contents/${folderPath}`)
    if (!Array.isArray(data)) {
      return
    }
    for (const item of data) {
      if (item.type === 'file') {
        await deleteRepoFile({
          path: item.path,
          message: `Remove category API ${businessSlug}/${item.name}`,
        })
      }
    }
  } catch {
    // Folder missing.
  }
}

async function syncBusinessApiArtifacts(products, businesses) {
  const bundlePayload = {
    schemaVersion: API_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    businesses: businesses.map((business) => ({
      slug: business.slug,
      name: business.name,
      description: business.description ?? '',
      enabledFields: Array.isArray(business.enabledFields) ? business.enabledFields : [],
      productCount: products.filter((product) => getBusinessSlug(product) === business.slug).length,
    })),
  }

  await putJsonFile('public/api/businesses.json', bundlePayload, 'Sync businesses API index')

  for (const business of businesses) {
    const filtered = products.filter((product) => getBusinessSlug(product) === business.slug)
    const categories = Array.from(
      new Set(filtered.map((product) => String(product.category || '').trim()).filter(Boolean)),
    )
    await deleteStaleCategoryApiFiles(business.slug, categories)
    const payload = {
      schemaVersion: API_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      business: {
        slug: business.slug,
        name: business.name,
        description: business.description ?? '',
        enabledFields: Array.isArray(business.enabledFields) ? business.enabledFields : [],
      },
      categories,
      products: filtered,
    }
    await putJsonFile(
      `public/api/${business.slug}.json`,
      payload,
      `Sync API bundle ${business.slug}`,
    )
    await putJsonFile(
      `public/business/${business.slug}/products.json`,
      payload,
      `Sync business products ${business.slug}`,
    )

    for (const categoryName of categories) {
      const categorySlug = toCategorySlug(categoryName)
      const categoryProducts = filtered.filter(
        (product) => String(product.category || '').trim() === categoryName,
      )
      await putJsonFile(
        `public/api/${business.slug}/category/${categorySlug}.json`,
        {
          schemaVersion: API_SCHEMA_VERSION,
          generatedAt: new Date().toISOString(),
          business: {
            slug: business.slug,
            name: business.name,
          },
          category: {
            name: categoryName,
            slug: categorySlug,
          },
          products: categoryProducts,
        },
        `Sync category API ${business.slug}/${categorySlug}`,
      )
    }

    const indexPayload = {
      schemaVersion: API_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      business: {
        slug: business.slug,
        name: business.name,
      },
      endpoints: {
        bundleUrl: getRawRepoUrl(`public/api/${business.slug}.json`),
        productsUrl: getRawRepoUrl(`public/business/${business.slug}/products.json`),
        businessesIndexUrl: getRawRepoUrl('public/api/businesses.json'),
        categories: categories.map((categoryName) => {
          const categorySlug = toCategorySlug(categoryName)
          return {
            name: categoryName,
            slug: categorySlug,
            url: getRawRepoUrl(`public/api/${business.slug}/category/${categorySlug}.json`),
          }
        }),
      },
    }
    await putJsonFile(
      `public/api/${business.slug}/index.json`,
      indexPayload,
      `Sync API index ${business.slug}`,
    )
  }
}

async function writeProductsAndSync(products, message) {
  const file = await getRepoFile('data/products.json')
  await putRepoFile({
    path: 'data/products.json',
    content: JSON.stringify(products, null, 2),
    message,
    sha: file.sha,
  })
  await appendAudit({
    action: 'products_write',
    commitMessage: message,
    productCount: products.length,
  })
  const businesses = await listBusinessesFromRepo()
  await syncBusinessApiArtifacts(products, businesses)
}

export async function appendProduct(product) {
  const products = await listProductsFromRepo()
  products.push({
    ...product,
    updatedAt: new Date().toISOString(),
  })
  await writeProductsAndSync(products, `Add product: ${product.name}`)
}

export async function listProductsFromRepo() {
  const file = await getRepoFile('data/products.json')
  const products = JSON.parse(file.content)
  return Array.isArray(products) ? products : []
}

/**
 * Merge new product rows from JSON import. Skips slugs that already exist or businesses the actor cannot access.
 */
export async function mergeImportedProducts(rows, actor) {
  if (!actor) {
    throw new Error('Not authenticated.')
  }
  if (!Array.isArray(rows)) {
    throw new Error('Import file must contain a JSON array of products.')
  }
  const businesses = await listBusinessesFromRepo()
  const allowedSlugs = new Set(
    actor.role === 'super_admin'
      ? businesses.map((b) => b.slug)
      : businesses.filter((b) => b.createdBy === actor.username).map((b) => b.slug),
  )
  const existing = await listProductsFromRepo()
  const existingSlugs = new Set(existing.map((p) => p.slug))
  const merged = [...existing]
  let added = 0
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') {
      continue
    }
    const slug = String(raw.slug || '').trim()
    const name = String(raw.name || '').trim()
    if (!slug || !name) {
      continue
    }
    if (existingSlugs.has(slug)) {
      continue
    }
    const businessSlug = raw.businessSlug ? String(raw.businessSlug).trim() : getBusinessSlug(raw)
    if (!allowedSlugs.has(businessSlug)) {
      continue
    }
    const biz = businesses.find((b) => b.slug === businessSlug)
    const images =
      Array.isArray(raw.images) && raw.images.length > 0
        ? raw.images
        : raw.image
          ? [raw.image]
          : []
    merged.push({
      name,
      slug,
      businessSlug,
      businessName: raw.businessName || biz?.name || businessSlug,
      category: String(raw.category || 'General').trim(),
      description: String(raw.description || '').trim(),
      details: raw.details && typeof raw.details === 'object' ? raw.details : {},
      images,
      updatedAt: raw.updatedAt || new Date().toISOString(),
    })
    existingSlugs.add(slug)
    added += 1
  }
  await writeProductsAndSync(merged, `Bulk import products (+${added})`)
  return { added, total: merged.length }
}

export async function listBusinessesFromRepo() {
  try {
    const file = await getRepoFile('data/businesses.json')
    const businesses = JSON.parse(file.content)
    return Array.isArray(businesses)
      ? businesses.map((business) => ({
          ...business,
          enabledFields: Array.isArray(business.enabledFields) ? business.enabledFields : [],
          createdBy: business.createdBy || (business.slug === 'default' ? 'system' : ''),
        }))
      : []
  } catch {
    return [
      {
        slug: 'default',
        name: 'Default business',
        description: '',
        enabledFields: [],
        createdBy: 'system',
      },
    ]
  }
}

async function writeBusinessesAndSync(businesses, message) {
  let sha
  try {
    sha = (await getRepoFile('data/businesses.json')).sha
  } catch {
    sha = undefined
  }
  await putRepoFile({
    path: 'data/businesses.json',
    content: JSON.stringify(businesses, null, 2),
    message,
    sha,
  })
  await appendAudit({
    action: 'businesses_write',
    commitMessage: message,
    businessCount: businesses.length,
  })
  const products = await listProductsFromRepo()
  await syncBusinessApiArtifacts(products, businesses)
}

function canManageBusiness(business, actor) {
  if (!actor) {
    return false
  }
  if (actor.role === 'super_admin') {
    return true
  }
  return business.createdBy === actor.username
}

export async function saveBusiness({ slug, name, description, enabledFields = [] }, actor) {
  const businesses = await listBusinessesFromRepo()
  if (businesses.some((business) => business.slug === slug)) {
    throw new Error('A business with this slug already exists.')
  }
  const createdBy = actor?.username || 'system'
  businesses.push({
    slug,
    name,
    description: description ?? '',
    enabledFields: Array.isArray(enabledFields) ? enabledFields : [],
    createdBy,
  })
  await writeBusinessesAndSync(businesses, `Add business ${slug}`)
}

export async function updateBusiness(slug, updates, actor) {
  const businesses = await listBusinessesFromRepo()
  const idx = businesses.findIndex((business) => business.slug === slug)
  if (idx === -1) {
    throw new Error('Business not found.')
  }
  if (!canManageBusiness(businesses[idx], actor)) {
    throw new Error('You are not allowed to update this business.')
  }

  businesses[idx] = {
    ...businesses[idx],
    name: updates.name?.trim() || businesses[idx].name,
    description: updates.description?.trim() ?? businesses[idx].description ?? '',
    enabledFields: Array.isArray(updates.enabledFields)
      ? updates.enabledFields
      : businesses[idx].enabledFields ?? [],
  }

  const products = await listProductsFromRepo()
  const nextProducts = products.map((product) =>
    getBusinessSlug(product) === slug
      ? { ...product, businessName: businesses[idx].name }
      : product,
  )

  const file = await getRepoFile('data/products.json')
  await putRepoFile({
    path: 'data/products.json',
    content: JSON.stringify(nextProducts, null, 2),
    message: `Sync products businessName: ${slug}`,
    sha: file.sha,
  })

  await writeBusinessesAndSync(businesses, `Update business ${slug}`)
}

export async function deleteBusiness(slug, actor) {
  if (slug === 'default') {
    throw new Error('Cannot delete the default business.')
  }
  const allBusinesses = await listBusinessesFromRepo()
  const target = allBusinesses.find((business) => business.slug === slug)
  if (!target) {
    throw new Error('Business not found.')
  }
  if (!canManageBusiness(target, actor)) {
    throw new Error('You are not allowed to delete this business.')
  }
  const products = await listProductsFromRepo()
  if (products.some((product) => getBusinessSlug(product) === slug)) {
    throw new Error('Cannot delete a business that still has products.')
  }
  const businesses = allBusinesses.filter((business) => business.slug !== slug)
  await writeBusinessesAndSync(businesses, `Delete business ${slug}`)
  try {
    await deleteRepoFile({
      path: `public/api/${slug}.json`,
      message: `Remove API bundle for ${slug}`,
    })
  } catch {
    // Missing file is fine.
  }
  await deleteCategoryApiFolder(slug)
  try {
    await deleteRepoFile({
      path: `public/api/${slug}/index.json`,
      message: `Remove API index for ${slug}`,
    })
  } catch {
    // Missing file is fine.
  }
  try {
    await deleteRepoFile({
      path: `public/business/${slug}/products.json`,
      message: `Remove business products bundle for ${slug}`,
    })
  } catch {
    // Missing file is fine.
  }
}

export async function deleteRepoFile({ path, message }) {
  const existing = await getRepoFile(path)
  await githubRequest(`/contents/${path}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message,
      sha: existing.sha,
      branch: DEFAULT_BRANCH,
    }),
  })
}

export async function deleteProductBySlug(slug) {
  const products = await listProductsFromRepo()
  const target = products.find((product) => product.slug === slug)
  const filtered = products.filter((product) => product.slug !== slug)

  if (filtered.length === products.length) {
    throw new Error('Product not found for deletion.')
  }

  await writeProductsAndSync(filtered, `Delete product: ${slug}`)

  await deleteGalleryFolderContents(getBusinessSlug(target), slug)
  await deleteLegacySingleImage(slug)
}

export async function saveProductWithImages(productInput, base64Images) {
  const slug = productInput.slug
  const businessSlug = productInput.businessSlug || 'default'
  const urls = await replaceProductGallery(businessSlug, slug, base64Images)
  await appendProduct({
    name: productInput.name,
    slug,
    businessSlug: productInput.businessSlug,
    businessName: productInput.businessName,
    category: productInput.category,
    description: productInput.description,
    details: productInput.details ?? {},
    images: urls,
  })
}

export async function updateProductWithImages(slug, fields, base64Images) {
  const products = await listProductsFromRepo()
  const idx = products.findIndex((product) => product.slug === slug)

  if (idx === -1) {
    throw new Error('Product not found.')
  }
  const previousBusinessSlug = getBusinessSlug(products[idx])
  const nextBusinessSlug = fields.businessSlug || previousBusinessSlug

  if (previousBusinessSlug !== nextBusinessSlug) {
    await deleteGalleryFolderContents(previousBusinessSlug, slug)
  }

  const urls = await replaceProductGallery(nextBusinessSlug, slug, base64Images)

  products[idx] = {
    ...products[idx],
    ...fields,
    slug,
    images: urls,
    updatedAt: new Date().toISOString(),
  }
  delete products[idx].image

  await writeProductsAndSync(products, `Update product: ${slug}`)
}

export function getRawRepoUrl(filePath) {
  const owner = import.meta.env.VITE_GITHUB_OWNER || DEFAULT_OWNER
  const repo = import.meta.env.VITE_GITHUB_REPO || DEFAULT_REPO
  return `https://raw.githubusercontent.com/${owner}/${repo}/${DEFAULT_BRANCH}/${filePath}`
}

export function getProductsDataUrl() {
  return getRawRepoUrl('data/products.json')
}

export function getBusinessesDataUrl() {
  return getRawRepoUrl('data/businesses.json')
}

export function getBusinessApiBundleUrl(businessSlug) {
  return getRawRepoUrl(`public/api/${businessSlug}.json`)
}

export function getBusinessCategoryApiUrl(businessSlug, categorySlug) {
  return getRawRepoUrl(`public/api/${businessSlug}/category/${categorySlug}.json`)
}

export function getBusinessIndexUrl(businessSlug) {
  return getRawRepoUrl(`public/api/${businessSlug}/index.json`)
}
