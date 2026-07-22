import React, { useState } from 'react'
import { LogIn, UserPlus, Key, Mail, User, AlertCircle } from 'lucide-react'
import { signInUser, signUpUser } from '../services/supabase'

export default function Auth({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor, preencha todos os campos.')
      return
    }

    if (isSignUp && !name.trim()) {
      setErrorMsg('Por favor, preencha o seu nome.')
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await signUpUser(email.trim(), password.trim(), name.trim())
        if (error) {
          setErrorMsg(error)
        } else {
          // Auto login after sign up
          const loginResult = await signInUser(email.trim(), password.trim())
          if (loginResult.error) {
            setErrorMsg('Cadastro realizado! Por favor, tente entrar pela aba "Entrar".')
            setIsSignUp(false)
          } else {
            onLoginSuccess(loginResult.user)
          }
        }
      } else {
        const { user, error } = await signInUser(email.trim(), password.trim())
        if (error) {
          setErrorMsg(error)
        } else {
          onLoginSuccess(user)
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(var(--primary-rgb), 0.05) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(var(--primary-rgb), 0.05) 0%, transparent 40%)'
    }}>
      <div className="card glass" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-color)',
        animation: 'auth-fade-in 0.4s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-title)', letterSpacing: '-0.02em' }}>
            🌎 <span style={{ color: 'var(--primary)' }}>Pluri</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {isSignUp ? 'Crie sua conta para começar sua jornada de estudos' : 'Acesse seu cronômetro de estudos e flashcards personalizados'}
          </p>
        </div>

        {/* Auth Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.25rem',
          marginBottom: '1.75rem',
          border: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => { setIsSignUp(false); setErrorMsg('') }}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: 'var(--radius-xs)',
              background: !isSignUp ? 'var(--bg-primary)' : 'transparent',
              color: !isSignUp ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: !isSignUp ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              transition: 'all 0.15s ease'
            }}
          >
            <LogIn size={14} />
            Entrar
          </button>
          <button
            onClick={() => { setIsSignUp(true); setErrorMsg('') }}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: 'var(--radius-xs)',
              background: isSignUp ? 'var(--bg-primary)' : 'transparent',
              color: isSignUp ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: isSignUp ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              transition: 'all 0.15s ease'
            }}
          >
            <UserPlus size={14} />
            Cadastrar
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(235, 94, 85, 0.08)',
            border: '1px solid rgba(235, 94, 85, 0.2)',
            color: '#eb5e55',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isSignUp && (
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }} htmlFor="authName">Nome Completo</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  id="authName"
                  className="form-input"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '38px', width: '100%' }}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }} htmlFor="authEmail">E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                id="authEmail"
                className="form-input"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '38px', width: '100%' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }} htmlFor="authPassword">Senha</label>
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                id="authPassword"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', width: '100%' }}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              padding: '0.9rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              width: '100%',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid var(--border-color)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
            ) : isSignUp ? (
              'Criar Minha Conta'
            ) : (
              'Entrar no App'
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes auth-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
