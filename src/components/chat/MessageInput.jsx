import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import Icon from '../common/Icon.jsx'

// 10 MB cap is enforced in storage RLS (migration 006). This client-side check
// is kept as defense-in-depth so users see a friendly message before the
// upload starts.
const MAX_FILE_MB = 10

export default function MessageInput({ conversationId, onSend, onTyping }) {
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  async function handleSendText(e) {
    e?.preventDefault()
    const content = text.trim()
    if (!content) return
    setText('')
    try {
      await onSend({ content })
    } catch (err) {
      alert(err.message)
      setText(content)
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    try {
      let uploadFile = file
      if (file.type.startsWith('image/')) {
        const { compressImage } = await import('../../lib/compress.js')
        uploadFile = await compressImage(file)
      }

      if (uploadFile.size > MAX_FILE_MB * 1024 * 1024) {
        alert(`File too large — max ${MAX_FILE_MB} MB (server enforces this too)`)
        setUploading(false)
        return
      }

      const safeName = uploadFile.name.replace(/[^\w.\-]+/g, '_')
      const path = `${conversationId}/${crypto.randomUUID()}_${safeName}`
      const { error } = await supabase.storage.from('attachments').upload(path, uploadFile)
      if (error) throw error
      await onSend({
        content: text.trim(),
        attachment: {
          attachment_path: path,
          attachment_name: uploadFile.name,
          attachment_type: uploadFile.type || 'application/octet-stream',
          attachment_size: uploadFile.size,
        },
      })
      setText('')
    } catch (err) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form className="message-input" onSubmit={handleSendText}>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFile}
      />
      <button
        type="button"
        className="icon-btn attach-btn"
        title="Attach a file"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <Icon name="paperclip" size={20} />
      </button>
      <input
        className="message-text"
        placeholder={uploading ? 'Uploading…' : 'Type a message'}
        value={text}
        disabled={uploading}
        onChange={(e) => {
          setText(e.target.value)
          onTyping()
        }}
      />
      <button type="submit" className="icon-btn send-btn" title="Send" disabled={uploading || !text.trim()}>
        <Icon name="send" size={20} />
      </button>
    </form>
  )
}
