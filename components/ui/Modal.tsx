'use client'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: Props) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col max-h-[90dvh] overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto min-h-0 flex-1 px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}
