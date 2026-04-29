const MAX_IMAGE_WIDTH = 1600
const WEBP_QUALITY = 0.8

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read the uploaded image.'))
    }
    img.src = url
  })
}

export async function fileToWebpBase64(file) {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width)
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not process image canvas.')
  }
  context.drawImage(img, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/webp', WEBP_QUALITY)
  return dataUrl.split(',')[1]
}
