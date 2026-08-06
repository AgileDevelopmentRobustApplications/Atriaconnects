// Client-side image compression using HTML5 Canvas

/**
 * Compresses an image file. If it's not an image, returns the file as-is.
 * Resizes the image if its width/height exceeds maxDimension.
 * @param {File} file - The file to compress.
 * @param {number} maxDimension - Max width or height in pixels.
 * @param {number} quality - Compression quality between 0 and 1.
 * @returns {Promise<File|Blob>}
 */
export function compressImage(file, maxDimension = 1600, quality = 0.8) {
  if (!file.type.startsWith('image/')) {
    // Return videos/other files as-is
    return Promise.resolve(file)
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate new dimensions if they exceed maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            // Create a new File object from the blob, keeping the original name but jpeg type
            const newName = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg'
            const compressedFile = new File([blob], newName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            // If the compressed file is actually larger (can happen for tiny PNGs), keep the original
            if (compressedFile.size > file.size) {
              resolve(file)
            } else {
              resolve(compressedFile)
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => resolve(file)
    }
    reader.onerror = () => resolve(file)
  })
}
