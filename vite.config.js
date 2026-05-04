import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Serve `data/products.json` & `data/businesses.json` at `/data/*` (dev + copied into dist for Pages — same-origin, no CORS). */
function repoDataCatalogPlugin() {
  const names = ['products.json', 'businesses.json']
  return {
    name: 'repo-data-catalog',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0]
        const m = pathname.match(/\/data\/(products|businesses)\.json$/)
        if (!m) {
          return next()
        }
        const fp = path.join(__dirname, 'data', `${m[1]}.json`)
        if (!fs.existsSync(fp)) {
          return next()
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        fs.createReadStream(fp).pipe(res)
      })
    },
    writeBundle() {
      const destDir = path.join(__dirname, 'dist', 'data')
      fs.mkdirSync(destDir, { recursive: true })
      for (const name of names) {
        const src = path.join(__dirname, 'data', name)
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(destDir, name))
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), repoDataCatalogPlugin()],
  base: mode === 'production' ? '/Product-System/' : '/',
}))
