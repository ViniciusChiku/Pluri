import React, { useState, useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { subscribeToSyncFallback } from '../services/supabase'

const AUTO_DISMISS_MS = 6000

export default function SyncWarningBanner() {
  const [visible, setVisible] = useState(false)
  const dismissTimer = useRef(null)

  useEffect(() => {
    const unsubscribe = subscribeToSyncFallback(() => {
      setVisible(true)
      clearTimeout(dismissTimer.current)
      dismissTimer.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS)
    })
    return () => {
      unsubscribe()
      clearTimeout(dismissTimer.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.6rem 1rem',
      background: 'rgba(235, 94, 85, 0.95)',
      borderBottom: '1px solid rgba(235, 94, 85, 0.3)',
      color: '#fff',
      fontSize: '0.8rem'
    }}>
      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        Não foi possível sincronizar com o servidor — alguns dados exibidos podem estar desatualizados ou incompletos.
      </span>
      <button
        onClick={() => setVisible(false)}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}
        aria-label="Fechar aviso"
      >
        <X size={14} />
      </button>
    </div>
  )
}
