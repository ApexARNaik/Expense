'use client'

import { useState } from 'react'

export default function ReceiptViewer({ imageUrl }: { imageUrl: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState(false)

  const src = `/api/images/${encodeURIComponent(imageUrl)}`

  if (error) {
    return (
      <div className="mt-4 p-4 border border-red-100 rounded-xl text-red-400 bg-red-50 text-center text-sm">
        Image failed to load
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 text-left">Receipt</h2>
      <div 
        className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-zoom-in group bg-gray-50 aspect-video sm:aspect-auto"
        onClick={() => setIsOpen(true)}
      >
        <img 
          src={src} 
          alt="Receipt" 
          onError={() => setError(true)}
          className="w-full h-48 sm:h-64 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-opacity shadow-lg">
            Tap to view
          </span>
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setIsOpen(false)}
        >
          <img 
            src={src} 
            alt="Receipt full screen" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <button 
            className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors shadow-lg backdrop-blur-md cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
