import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoadingSpinner from './components/LoadingSpinner'
import Navbar from './components/Navbar'

const AdminGate = lazy(() => import('./admin/AdminGate'))
const BusinessesPage = lazy(() => import('./pages/BusinessesPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <LoadingSpinner label="Loading page..." />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Navigate replace to="/products" />} />
            <Route path="/admin/*" element={<AdminGate />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/business/:businessSlug" element={<ProductsPage />} />
            <Route path="/businesses" element={<BusinessesPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default App
