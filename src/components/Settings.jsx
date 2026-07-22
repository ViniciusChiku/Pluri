import React from 'react'
import { KeyRound } from 'lucide-react'
import { isSupabaseEnabled } from '../services/supabase'

export default function Settings() {
  const supabaseConnected = isSupabaseEnabled()

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Configurações do Planner</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Configurações gerais do sistema.
        </p>
      </div>

      <div className="card glass" style={{
        background: 'rgba(var(--primary-rgb), 0.05)',
        border: '1px solid var(--border-color)',
        padding: '1.25rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start'
      }}>
        <KeyRound className="text-primary" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Chaves & Conexões Ativas</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            A conexão com o <strong>Supabase</strong> é carregada através das variáveis de ambiente (<code>.env.local</code>). As chamadas à IA (<strong>Gemini</strong>) passam por uma Edge Function do Supabase, que mantém a chave da API apenas no servidor.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)' }}>
              ● Supabase: Ativo ({supabaseConnected ? 'Conectado' : 'Carregado'})
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
