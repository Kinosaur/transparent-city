'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Copy, Check, Share2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type ShareModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  ogImageUrl: string
  shareUrl: string
  lang: 'en' | 'th'
}

export default function ShareModal({
  isOpen,
  onClose,
  title,
  description,
  ogImageUrl,
  shareUrl,
  lang,
}: ShareModalProps) {
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="rounded-xl border border-border bg-surface-900 shadow-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
                  <Share2 size={18} />
                  {lang === 'th' ? 'แชร์' : 'Share'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-surface-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* OG Card Preview */}
                <div className="rounded-lg border border-border bg-surface-950 overflow-hidden">
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

                {/* Share Info */}
                <div className="p-3 rounded-lg bg-surface-950/50 border border-border">
                  <p className="text-xs text-muted">
                    {lang === 'th'
                      ? '👆 นี่คือตัวอย่างว่าเพื่อนของคุณจะเห็นอะไรเมื่อคุณแชร์'
                      : '👆 This is what your friends will see when you share'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-6 py-4 border-t border-border bg-surface-950/30">
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
