import React, { useState } from 'react'

// Renders the lesson's article text as proper paragraphs and, when a cover
// image is available, drops it in roughly the middle of the article — like
// a real news page — instead of a full-width banner up top (which looked
// stretched/blurry when the source image wasn't wide enough for the card).
export default function ArticleBody({ text, imageUrl }) {
  const [imageFailed, setImageFailed] = useState(false)
  const paragraphs = (text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const showImage = imageUrl && !imageFailed && paragraphs.length > 0
  const imageAfterIdx = showImage ? Math.max(0, Math.floor((paragraphs.length - 1) / 2)) : -1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {paragraphs.map((p, idx) => (
        <React.Fragment key={idx}>
          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{p}</p>
          {idx === imageAfterIdx && (
            <img
              src={imageUrl}
              alt=""
              onError={() => setImageFailed(true)}
              style={{
                maxWidth: '440px',
                width: '100%',
                aspectRatio: '16 / 10',
                objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
                margin: '0.25rem auto',
                display: 'block',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
