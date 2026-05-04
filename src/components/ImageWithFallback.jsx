import { imageUrlWithCacheBust } from '../utils/product'

const FALLBACK_IMAGE = `${import.meta.env.BASE_URL}images/fallback.svg`

function ImageWithFallback({
  src,
  alt,
  className = 'h-full w-full object-cover',
  loading = 'lazy',
  cacheKey,
}) {
  const busted = imageUrlWithCacheBust(src, cacheKey)
  const displaySrc = busted || FALLBACK_IMAGE

  return (
    <img
      key={displaySrc}
      src={displaySrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={(e) => {
        if (e.currentTarget.src.endsWith('fallback.svg')) {
          return
        }
        e.currentTarget.onerror = null
        e.currentTarget.src = FALLBACK_IMAGE
      }}
    />
  )
}

export default ImageWithFallback
