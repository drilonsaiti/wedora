'use client'

import { useState } from 'react'
import { toast } from 'sonner'

type Props = {
  weddingId: string
}

export function WeddingRowActions({ weddingId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'share' | 'zip' | null>(null)

  async function onShare() {
    try {
      setLoading('share')
      const res = await fetch(`/admin/weddings/${weddingId}/api/share-gallery`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create gallery link')
      }
      const url: string = data.url
      await navigator.clipboard.writeText(url)
      toast.success('Linku i galerisë u kopjua në clipboard')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Dështoi krijimi i linkut')
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  async function onZip() {
    try {
      setLoading('zip')
      const res = await fetch(`/admin/weddings/${weddingId}/photos/zip`, { method: 'GET' })
      if (res.status === 202) {
        const data = await res.json()
        toast.message('Po përgatisim ZIP-in', { description: data?.message ?? 'Do të jetë gati së shpejti.' })
        return
      }
      if (res.status === 200) {
        // If later we stream directly, we’ll navigate to trigger download
        window.location.assign(`/admin/weddings/${weddingId}/photos/zip`)
        return
      }
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.message || data?.error || `ZIP status ${res.status}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Dështoi përgatitja e ZIP-it')
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        className="px-3 py-2 rounded-md border"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Veprime
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-md z-10"
        >
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 hover:bg-accent"
            onClick={onShare}
            disabled={loading === 'share'}
          >
            {loading === 'share' ? 'Duke krijuar…' : 'Shpërndaj Galerinë'}
          </button>
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 hover:bg-accent"
            onClick={onZip}
            disabled={loading === 'zip'}
          >
            {loading === 'zip' ? 'Duke përgatitur…' : 'Shkarko ZIP'}
          </button>
        </div>
      )}
    </div>
  )
}
