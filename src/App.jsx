import { Navigate, Route, Routes } from 'react-router-dom'
import AdminGate from './admin/AdminGate'
import Navbar from './components/Navbar'
import NotFoundPage from './pages/NotFoundPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProductsPage from './pages/ProductsPage'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Navigate replace to="/products" />} />
          <Route path="/admin/*" element={<AdminGate />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
