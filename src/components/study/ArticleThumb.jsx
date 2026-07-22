import React, { useState } from 'react'
import { Image, Globe, Cpu, Briefcase, FlaskConical, Trophy, Palette } from 'lucide-react'

const CATEGORY_ICONS = {
  'Mundo': Globe,
  'Tecnologia': Cpu,
  'Negócios': Briefcase,
  'Ciência': FlaskConical,
  'Esportes': Trophy,
  'Cultura': Palette
}

// Small square thumbnail used in article lists/previews: shows the real
// cover image when we have one, and falls back to a category icon tile
// (instead of a broken-image icon or empty space) when we don't.
export default function ArticleThumb({ src, category, size = 56, radius = 'var(--radius-sm)' }) {
  const [failed, setFailed] = useState(false)
  const CategoryIcon = CATEGORY_ICONS[category] || Image

  if (!src || failed) {
    return (
      <div style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: radius,
        background: 'var(--primary-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <CategoryIcon size={Math.round(size * 0.42)} color="var(--primary)" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: radius,
        objectFit: 'cover',
        flexShrink: 0,
        background: 'var(--bg-secondary)'
      }}
    />
  )
}
