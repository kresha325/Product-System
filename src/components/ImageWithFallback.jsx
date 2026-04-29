import { useState } from 'react'

const FALLBACK_IMAGE = '/images/fallback.svg'

function ImageWithFallback({ src, alt, className = 'h-full w-full object-cover', loading = 'lazy' }) {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK_IMAGE)

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setImageSrc(FALLBACK_IMAGE)}
    />
  )
}

export default ImageWithFallback
