import React from 'react'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Layers,
  Settings as SettingsIcon,
  GraduationCap,
  LogOut,
  Moon,
  Sun
} from 'lucide-react'

export default function Sidebar({ currentView, setCurrentView, currentUser, onLogout, theme, onToggleTheme }) {
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', name: 'Calendário', icon: Calendar },
    { id: 'study-session', name: 'Estudar com IA', icon: GraduationCap },
    { id: 'notebook', name: 'Caderno', icon: BookOpen },
    { id: 'flashcards', name: 'Flashcards', icon: Layers },
    { id: 'settings', name: 'Configurações', icon: SettingsIcon },
  ]

  return (
    <aside className="sidebar glass">
      <div className="sidebar-logo">
        🌎 <span>Pluri</span>
      </div>

      <div className="profile-selector-container">
        <div className="profile-card glass" style={{ cursor: 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem' }}>
          <div className="profile-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <div className="profile-avatar" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', fontWeight: 'bold', width: '32px', height: '32px', borderRadius: '50%', fontSize: '0.85rem' }}>
              {currentUser?.avatar}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="profile-name" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
                {currentUser?.email}
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Sair da Conta"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
              borderRadius: 'var(--radius-xs)',
              marginLeft: '0.5rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#eb5e55'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="btn btn-secondary"
          onClick={onToggleTheme}
          style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Rotina Compartilhada v0.1
        </div>
      </div>
    </aside>
  )
}
