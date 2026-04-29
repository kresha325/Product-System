function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-slate-600" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      <span>{label}</span>
    </div>
  )
}

export default LoadingSpinner
