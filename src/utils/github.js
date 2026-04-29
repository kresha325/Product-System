const API_BASE = 'https://api.github.com'
const DEFAULT_BRANCH = 'main'
const DEFAULT_OWNER = 'kresha325'
const DEFAULT_REPO = 'Product-System'

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
  return response.json()
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

export function getGitHubPagesImageUrl(slug) {
  const { owner, repo } = config()
  return `https://${owner}.github.io/${repo}/images/${slug}.webp`
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

  return githubRequest(`/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encoded,
      branch: DEFAULT_BRANCH,
      sha,
    }),
  })
}

export async function appendProduct(product) {
  const filePath = 'data/products.json'
  const file = await getRepoFile(filePath)
  const products = JSON.parse(file.content)
  products.push(product)
  await putRepoFile({
    path: filePath,
    content: JSON.stringify(products, null, 2),
    message: `Add product: ${product.name}`,
    sha: file.sha,
  })
}

export async function listProductsFromRepo() {
  const file = await getRepoFile('data/products.json')
  const products = JSON.parse(file.content)
  return Array.isArray(products) ? products : []
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
  const filePath = 'data/products.json'
  const file = await getRepoFile(filePath)
  const products = JSON.parse(file.content)
  const filtered = products.filter((product) => product.slug !== slug)

  if (filtered.length === products.length) {
    throw new Error('Product not found for deletion.')
  }

  await putRepoFile({
    path: filePath,
    content: JSON.stringify(filtered, null, 2),
    message: `Delete product: ${slug}`,
    sha: file.sha,
  })

  try {
    await deleteRepoFile({
      path: `public/images/${slug}.webp`,
      message: `Delete product image: ${slug}`,
    })
  } catch {
    // Ignore missing images, product record is already removed.
  }
}

export async function uploadProductImage(slug, base64Image) {
  const imagePath = `public/images/${slug}.webp`
  let existingSha
  try {
    const existing = await getRepoFile(imagePath)
    existingSha = existing.sha
  } catch {
    existingSha = undefined
  }
  await putRepoFile({
    path: imagePath,
    content: base64Image,
    message: `Upload product image: ${slug}`,
    sha: existingSha,
    contentBase64: true,
  })
}

export async function saveProductWithImage(productInput, imageBase64) {
  const slug = productInput.slug
  const imageUrl = getGitHubPagesImageUrl(slug)
  await uploadProductImage(slug, imageBase64)
  await appendProduct({
    ...productInput,
    image: imageUrl,
  })
}

export function getProductsDataUrl() {
  const owner = import.meta.env.VITE_GITHUB_OWNER || DEFAULT_OWNER
  const repo = import.meta.env.VITE_GITHUB_REPO || DEFAULT_REPO
  return `https://raw.githubusercontent.com/${owner}/${repo}/${DEFAULT_BRANCH}/data/products.json`
}
