import { useEffect, useState } from 'react'
import { images, IMAGE_EXTENSIONS } from '../data/images'

const base = import.meta.env.BASE_URL

/**
 * Displays /public/images/<file>.<ext>. Tries each extension in turn; if none
 * exists it shows a clearly labelled development placeholder — never a stand-in
 * photo. See docs/IMAGE_GUIDE.md.
 */
export default function ImageSlot({ id, className = '', fit = 'cover', position = 'center', alt, children }) {
  const meta = images[id]
  const exts = meta?.exts ?? IMAGE_EXTENSIONS
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { setIdx(0); setLoaded(false) }, [id])

  if (!meta) return <div className={`slot slot--missing ${className}`}>Unknown image id “{id}”</div>

  const failed = idx >= exts.length
  const src = `${base}images/${meta.file}.${exts[Math.min(idx, exts.length - 1)]}`

  return (
    <div className={`slot ${loaded ? 'slot--loaded' : ''} ${failed ? 'slot--empty' : ''} ${className}`} data-image-id={id}>
      {!failed && (
        <img
          key={src}
          src={src}
          alt={alt ?? meta.title}
          draggable={false}
          style={{ objectFit: fit, objectPosition: position }}
          onLoad={() => setLoaded(true)}
          onError={() => setIdx((i) => i + 1)}
        />
      )}
      {failed && (
        <div className="slot__ph" role="img" aria-label={`Placeholder: ${meta.title}`}>
          <span className="slot__tag">IMAGE PLACEHOLDER</span>
          <strong className="slot__title">{meta.title}</strong>
          <code className="slot__path">public/images/{meta.file}.jpg</code>
          <span className="slot__brief">{meta.brief}</span>
          <span className="slot__size">{meta.size}</span>
        </div>
      )}
      {children}
    </div>
  )
}
