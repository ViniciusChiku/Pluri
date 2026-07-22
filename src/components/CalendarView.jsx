import React, { useState, useEffect } from 'react'
import { Check, Plus, AlertCircle, PlayCircle } from 'lucide-react'
import { getLanguages, getStudySessions, saveStudySession } from '../services/supabase'
import { toLocalDateString, hasAnySessionOnDates } from '../services/studyMetrics'
import LoadingSpinner from './LoadingSpinner'

export default function CalendarView({ profileId, setCurrentView, setSessionLanguage, setSessionCompetence, setSessionId }) {
  const [languages, setLanguages] = useState([])
  const [sessions, setSessions] = useState([])
  const [weekDays, setWeekDays] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Setup current week dates
  useEffect(() => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - currentDay) // Sunday
    
    const days = []
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push({
        name: dayNames[i],
        dateStr: toLocalDateString(date),
        dayNum: date.getDate(),
        isToday: date.toDateString() === today.toDateString()
      })
    }
    setWeekDays(days)
  }, [])

  useEffect(() => {
    async function loadCalendarData() {
      const langs = await getLanguages(profileId)
      setLanguages(langs)
      const sess = await getStudySessions(profileId)
      setSessions(sess)
      setIsLoading(false)
    }
    loadCalendarData()
  }, [profileId])

  if (isLoading) {
    return <LoadingSpinner />
  }

  const toggleSessionCompletion = async (session) => {
    const updated = {
      ...session,
      completed: !session.completed
    }
    await saveStudySession(updated, profileId)
    // Reload sessions
    const refreshed = await getStudySessions(profileId)
    setSessions(refreshed)
  }

  // Helper to generate study blocks for a day if none exist
  const generateWeekPlan = async () => {
    if (languages.length === 0) return

    const newSessions = []
 
    // Distribute sessions across the week days (Mon to Fri) for active languages
    // Monday (1) to Friday (5)
    for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
      const targetDay = weekDays[dayIndex]
      if (!targetDay) continue
 
      languages.forEach((lang, langIdx) => {
        // Simple heuristic: divide weekly target into 30m blocks
        // e.g. 5 hours (300 mins) = 10 sessions. Let's place 1 or 2 sessions on different days
        const blocksCount = Math.max(1, Math.min(2, Math.round((lang.target_weekly_minutes / 60) / 2)))
        
        // Competencies list based on primary_goal
        let compList = ['Leitura', 'Escuta', 'Vocabulário', 'Gramática']
        if (lang.primary_goal === 'Conversação') {
          compList = ['Escuta', 'Fala', 'Vocabulário', 'Fala']
        } else if (lang.primary_goal === 'Viagem') {
          compList = ['Vocabulário', 'Escuta', 'Leitura', 'Fala']
        } else if (lang.primary_goal === 'Acadêmico') {
          compList = ['Leitura', 'Gramática', 'Leitura', 'Escrita']
        } else if (lang.primary_goal === 'Profissional') {
          compList = ['Leitura', 'Escrita', 'Vocabulário', 'Gramática']
        }

        for (let b = 0; b < blocksCount; b++) {
          const comp = compList[(dayIndex + langIdx + b) % compList.length]
          newSessions.push({
            language: lang.name,
            competence: comp,
            duration_minutes: 30,
            completed: false,
            date_studied: targetDay.dateStr
          })
        }
      })
    }

    // Save all to DB
    for (const s of newSessions) {
      await saveStudySession(s, profileId)
    }

    // Reload sessions
    const refreshed = await getStudySessions(profileId)
    setSessions(refreshed)
  }

  const startSession = (langName, competence, sessionId) => {
    if (setSessionLanguage && setSessionCompetence) {
      setSessionLanguage(langName)
      setSessionCompetence(competence)
      if (setSessionId) setSessionId(sessionId)
      setCurrentView('study-session')
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Cronograma de Estudos</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Seu plano de ação semanal inteligente. Estude e marque como concluído.
          </p>
        </div>
        {!hasAnySessionOnDates(sessions, weekDays.map(d => d.dateStr)) && languages.length > 0 && (
          <button className="btn btn-primary" onClick={generateWeekPlan}>
            <Plus size={16} />
            Gerar Cronograma Semanal
          </button>
        )}
      </div>

      {languages.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <AlertCircle size={40} className="text-primary" style={{ margin: '0 auto 1rem auto' }} />
          <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Nenhum idioma configurado</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            Para gerarmos seu cronograma semanal, adicione pelo menos um idioma no seu Dashboard.
          </p>
          <button className="btn btn-primary" onClick={() => setCurrentView('dashboard')}>Ir ao Dashboard</button>
        </div>
      ) : (
        <div className="card glass" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Calendário da Semana Atual
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              *Clique no botão &quot;Play&quot; para carregar a lição de IA correspondente.
            </span>
          </div>

          <div className="calendar-grid">
            {weekDays.map(day => {
              const daySessions = sessions.filter(s => s.date_studied === day.dateStr)

              return (
                <div 
                  key={day.dateStr} 
                  className={`calendar-day glass`}
                  style={{ 
                    border: day.isToday ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: day.isToday ? 'var(--primary-light)' : 'transparent',
                    boxShadow: day.isToday ? 'var(--shadow-md)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: day.isToday ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {day.name.substring(0, 3)}
                    </span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      color: day.isToday ? 'white' : 'var(--text-muted)',
                      background: day.isToday ? 'var(--primary)' : 'transparent',
                      width: day.isToday ? '22px' : 'auto',
                      height: day.isToday ? '22px' : 'auto',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {day.dayNum}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
                    {daySessions.map(sess => (
                      <div 
                        key={sess.id}
                        className={`calendar-study-block ${sess.completed ? 'completed' : ''}`}
                        style={{
                          background: sess.completed ? 'rgba(107, 163, 124, 0.12)' : 'var(--bg-tertiary)',
                          borderLeft: `3px solid ${sess.completed ? 'var(--success)' : 'var(--primary)'}`,
                          color: sess.completed ? 'var(--success)' : 'var(--text-primary)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {sess.language}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {sess.competence} • {sess.duration_minutes}m
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {!sess.completed && (
                            <PlayCircle 
                              size={14} 
                              className="text-primary" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => startSession(sess.language, sess.competence, sess.id)}
                            />
                          )}
                          <div 
                            onClick={() => toggleSessionCompletion(sess)}
                            style={{ 
                              width: '14px', 
                              height: '14px', 
                              borderRadius: '3px', 
                              background: sess.completed ? 'var(--success)' : 'var(--bg-primary)', 
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            {sess.completed && <Check size={10} color="white" />}
                          </div>
                        </div>
                      </div>
                    ))}
                    {daySessions.length === 0 && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 'auto' }}>
                        Sem planos
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
