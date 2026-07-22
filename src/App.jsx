import React, { useState, useEffect, Suspense, lazy } from 'react'
import Sidebar from './components/Sidebar'
import Auth from './components/Auth'
import SyncWarningBanner from './components/SyncWarningBanner'
import { Sun, Moon, LogOut } from 'lucide-react'
import { getCurrentUser, signOutUser } from './services/supabase'

const Dashboard = lazy(() => import('./components/Dashboard'))
const CalendarView = lazy(() => import('./components/CalendarView'))
const StudySession = lazy(() => import('./components/StudySession'))
const Notebook = lazy(() => import('./components/Notebook'))
const FlashcardsView = lazy(() => import('./components/FlashcardsView'))
const Settings = lazy(() => import('./components/Settings'))

function ViewLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid var(--border-color)',
        borderTop: '3px solid var(--primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
    </div>
  )
}

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [profileId, setProfileId] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [triggerRefresh, setTriggerRefresh] = useState(0)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  // Presets from calendar selection
  const [presetLanguage, setPresetLanguage] = useState('')
  const [presetCompetence, setPresetCompetence] = useState('')
  const [presetSessionId, setPresetSessionId] = useState('')

  const forceRefresh = () => {
    setTriggerRefresh(prev => prev + 1)
  }

  // Check user session on load
  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser()
      if (user) {
        setCurrentUser(user)
        setProfileId(user.id)
      } else {
        setCurrentUser(null)
        setProfileId('')
      }
      setAuthLoading(false)
    }
    checkAuth()
  }, [triggerRefresh])

  // Clear presets when leaving the study session
  useEffect(() => {
    if (currentView !== 'study-session') {
      setPresetLanguage('')
      setPresetCompetence('')
      setPresetSessionId('')
    }
  }, [currentView])

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
  }

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair da sua conta?')) {
      await signOutUser()
      setCurrentUser(null)
      setProfileId('')
      setCurrentView('dashboard')
      forceRefresh()
    }
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            profileId={profileId} 
            setCurrentView={setCurrentView}
            triggerRefresh={triggerRefresh}
          />
        )
      case 'calendar':
        return (
          <CalendarView 
            profileId={profileId} 
            setCurrentView={setCurrentView}
            setSessionLanguage={setPresetLanguage}
            setSessionCompetence={setPresetCompetence}
            setSessionId={setPresetSessionId}
          />
        )
      case 'study-session':
        return (
          <StudySession 
            profileId={profileId}
            presetLanguage={presetLanguage}
            presetCompetence={presetCompetence}
            presetSessionId={presetSessionId}
            setCurrentView={setCurrentView}
            onSessionLogged={forceRefresh}
          />
        )
      case 'notebook':
        return <Notebook profileId={profileId} />
      case 'flashcards':
        return <FlashcardsView profileId={profileId} setCurrentView={setCurrentView} />
      case 'settings':
        return <Settings />
      default:
        return (
          <Dashboard 
            profileId={profileId} 
            setCurrentView={setCurrentView}
            triggerRefresh={triggerRefresh}
          />
        )
    }
  }

  if (authLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid var(--border-color)', 
          borderTop: '3px solid var(--primary)', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }} />
      </div>
    )
  }

  if (!currentUser) {
    return <Auth onLoginSuccess={(user) => { setCurrentUser(user); setProfileId(user.id); forceRefresh() }} />
  }

  return (
    <div className="app-container">
      <SyncWarningBanner />
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%' }}>
        {/* Mobile Top Bar */}
        <header className="mobile-top-bar glass">
          <div className="mobile-logo">🌍 <span>Pluri</span></div>
          <div className="mobile-actions">
            <button className="mobile-theme-btn" onClick={toggleTheme} title="Alternar tema">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div 
              className="mobile-profile-avatar" 
              onClick={handleLogout}
              title={`Sair da conta (Usuário: ${currentUser.name})`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', fontWeight: 'bold' }}
            >
              {currentUser.avatar}
            </div>
          </div>
        </header>
        <main className="main-content">
          <Suspense fallback={<ViewLoadingFallback />}>
            {renderActiveView()}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
