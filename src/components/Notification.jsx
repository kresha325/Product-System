function Notification({ type = 'info', message }) {
  if (!message) {
    return null
  }

  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  }

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type] || styles.info}`}>
      {message}
    </div>
  )
}

export default Notification
