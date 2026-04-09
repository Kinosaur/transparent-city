'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Copy, Check, Share2 } from 'lucide-react'

type SharePreviewProps = {
  title: string
  description: string
  ogImageUrl: string
  shareUrl: string
  lang: 'en' | 'th'
}

export default function SharePreview({ title, description, ogImageUrl, shareUrl, lang }: SharePreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        })
      } catch {
        // User cancelled share or error occurred
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="space-y-4">
      {/* Preview Label */}
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        <Share2 size={16} />
        {lang === 'th' ? 'ตัวอย่างการแชร์' : 'Share Preview'}
      </div>

      {/* Card Preview */}
      <div className="rounded-lg border border-border bg-surface-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="aspect-video w-full bg-surface-950 overflow-hidden relative">
          <Image
            src={ogImageUrl}
            alt={title}
            width={1200}
            height={630}
            className="w-full h-full object-cover"
            unoptimized
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"%3E%3Crect fill="%23222" width="1200" height="630"/%3E%3C/svg%3E'
            }}
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-base text-fg line-clamp-2">{title}</h3>
          <p className="text-sm text-muted line-clamp-2">{description}</p>
          <p className="text-xs text-muted/70 truncate">transparent-city.vercel.app</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 px-4 py-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Share2 size={16} />
          {lang === 'th' ? 'แชร์' : 'Share'}
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-muted hover:text-fg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied!') : (lang === 'th' ? 'คัดลอก' : 'Copy')}
        </button>
      </div>
    </div>
  )
}
