import React, { useState, useEffect } from 'react'
import { Plus, Flame, CheckCircle, GraduationCap, ArrowRight, BookOpen } from 'lucide-react'
import { getLanguages, saveLanguage, getStudySessions, getFlashcards, getCurrentUser } from '../services/supabase'
import { getWeeklyStudyMinutes, calculateStreak, getDailyProgressByLanguage } from '../services/studyMetrics'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import LoadingSpinner from './LoadingSpinner'

export default function Dashboard({ profileId, setCurrentView, triggerRefresh }) {
  const [languages, setLanguages] = useState([])
  const [showAddLanguage, setShowAddLanguage] = useState(false)
  const [userName, setUserName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  // Stats
  const [weeklyTarget, setWeeklyTarget] = useState(0)
  const [weeklyDone, setWeeklyDone] = useState(0)
  const [streak, setStreak] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [dailyProgress, setDailyProgress] = useState([])
  
  // Add Language Form State
  const [newLangName, setNewLangName] = useState('Inglês')
  const [newLangGoal, setNewLangGoal] = useState('Conversação')
  const [newLangLevel, setNewLangLevel] = useState('A2')
  const [newLangHours, setNewLangHours] = useState('4')

  // Skill levels for active profile (Leitura, Escuta, Fala, Escrita)
  const [skills, setSkills] = useState({
    reading: 50,
    listening: 50,
    speaking: 50,
    writing: 50
  })

  useEffect(() => {
    async function loadDashboardData() {
      const user = await getCurrentUser()
      if (user && user.name) {
        setUserName(user.name)
      }

      const langs = await getLanguages(profileId)
      setLanguages(langs)

      // Calculate total weekly target minutes
      const target = langs.reduce((acc, curr) => acc + (curr.target_weekly_minutes || 0), 0)
      setWeeklyTarget(target)

      // Load sessions and calculate completed minutes for the current week
      const sessions = await getStudySessions(profileId)
      setWeeklyDone(getWeeklyStudyMinutes(sessions))
      setDailyProgress(getDailyProgressByLanguage(langs, sessions))

      // Load flashcards count due for review
      const cards = await getFlashcards(profileId)
      const todayStr = new Date().toISOString().split('T')[0]
      const due = cards.filter(c => c.next_review <= todayStr).length
      setReviewCount(due)

      // Load skills from localStorage
      const savedSkillsKey = `planner_skills_v2_${profileId}`
      const savedSkillsRaw = localStorage.getItem(savedSkillsKey)
      if (savedSkillsRaw) {
        try {
          setSkills(JSON.parse(savedSkillsRaw))
        } catch (e) {
          console.error('Error parsing skills', e)
        }
      } else {
        const defaultSkills = { reading: 65, listening: 50, speaking: 45, writing: 40 };
        setSkills(defaultSkills)
        localStorage.setItem(savedSkillsKey, JSON.stringify(defaultSkills))
      }

      setStreak(calculateStreak(sessions))
      setIsLoading(false)
    }
    loadDashboardData()
  }, [profileId, triggerRefresh])

  if (isLoading) {
    return <LoadingSpinner />
  }

  const handleAddLanguageSubmit = async (e) => {
    e.preventDefault()
    const newLang = {
      name: newLangName,
      primary_goal: newLangGoal,
      current_level: newLangLevel,
      target_weekly_minutes: parseInt(newLangHours) * 60
    }
    await saveLanguage(newLang, profileId)
    setShowAddLanguage(false)
    // Reload dashboard
    const refreshedLangs = await getLanguages(profileId)
    setLanguages(refreshedLangs)
    const refreshedTarget = refreshedLangs.reduce((acc, curr) => acc + (curr.target_weekly_minutes || 0), 0)
    setWeeklyTarget(refreshedTarget)
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Top Banner Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
            Olá, {userName || 'Estudante'}!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Pronto para impulsionar seus estudos hoje? Veja seu planejamento semanal.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddLanguage(true)}>
          <Plus size={16} />
          Adicionar Idioma
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="dashboard-grid">
        <div className="card glass col-4" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.85rem', borderRadius: '50%', background: 'rgba(239, 159, 78, 0.15)', color: 'var(--warning)' }}>
            <Flame size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Ofensiva</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{streak} dias seguidos</div>
          </div>
        </div>

        <div className="card glass col-4" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.85rem', borderRadius: '50%', background: 'rgba(107, 163, 124, 0.15)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Meta Semanal</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{Math.round(weeklyDone / 60)}h / {Math.round(weeklyTarget / 60)}h</div>
          </div>
        </div>

        <div className="card glass col-4" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.85rem', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Revisão Pendente</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{reviewCount} flashcards</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Languages list & Skill tracking */}
      <div className="dashboard-grid">
        {/* Left Side: Active Languages */}
        <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} className="text-primary" />
            Idiomas em Foco
          </h3>
          
          {languages.length === 0 ? (
            <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Você não tem nenhum idioma cadastrado.</p>
              <button className="btn btn-primary" onClick={() => setShowAddLanguage(true)}>Adicionar Primeiro Idioma</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {languages.map(lang => {
                const progress = dailyProgress.find(p => p.name === lang.name)
                return (
                  <div key={lang.id} className="card glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>{lang.current_level}</span>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{lang.name}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Foco: {lang.primary_goal} • Meta: {Math.round(lang.target_weekly_minutes / 60)}h por semana
                      </p>
                      {progress && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', maxWidth: '220px' }}>
                          <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              borderRadius: '3px',
                              width: `${Math.min(100, Math.round((progress.doneMinutes / progress.goalMinutes) * 100))}%`,
                              background: progress.isMet ? 'var(--success)' : 'var(--primary)'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: progress.isMet ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {progress.isMet && <CheckCircle size={12} />}
                            {progress.doneMinutes}/{progress.goalMinutes}min hoje
                          </span>
                        </div>
                      )}
                    </div>
                    <button className="btn btn-secondary" onClick={() => setCurrentView('study-session')}>
                      Estudar
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Side: Skill Radar Breakdown */}
        <div className="card glass col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>Diagnóstico de Nível</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Habilidades reais medidas</p>
          </div>

            <div style={{ width: '100%', height: '240px', marginTop: '-1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={[
                  { subject: 'Leitura', A: skills.reading, fullMark: 100 },
                  { subject: 'Escuta', A: skills.listening, fullMark: 100 },
                  { subject: 'Fala', A: skills.speaking, fullMark: 100 },
                  { subject: 'Escrita', A: skills.writing, fullMark: 100 },
                ]}>
                  <PolarGrid stroke="var(--border-color)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <Radar name="Proficiência" dataKey="A" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

          {(() => {
            const getWeakestSkill = () => {
              let weakest = 'reading'
              let minVal = 100
              Object.entries(skills).forEach(([skill, val]) => {
                if (val < minVal) {
                  minVal = val
                  weakest = skill
                }
              })
              const names = {
                reading: 'Leitura',
                listening: 'Escuta',
                speaking: 'Fala',
                writing: 'Escrita'
              }
              return { name: names[weakest] }
            }
            const weakest = getWeakestSkill()
            return (
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                <strong>💡 Dica do Tutor:</strong> Sua competência de <em>{weakest.name}</em> está mais baixa. Suas próximas lições geradas e exercícios focarão em melhorar essa habilidade!
              </div>
            )
          })()}
        </div>
      </div>

      {/* Add Language Modal Form */}
      {showAddLanguage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '480px', animation: 'scaleUp 0.3s' }}>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem' }}>Configurar Novo Idioma</h3>
            
            <form onSubmit={handleAddLanguageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="langName">Idioma</label>
                <select id="langName" className="form-select" value={newLangName} onChange={(e) => setNewLangName(e.target.value)}>
                  <option value="Inglês">Inglês</option>
                  <option value="Espanhol">Espanhol</option>
                  <option value="Francês">Francês</option>
                  <option value="Alemão">Alemão</option>
                  <option value="Italiano">Italiano</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="langGoal">Objetivo Principal</label>
                <select id="langGoal" className="form-select" value={newLangGoal} onChange={(e) => setNewLangGoal(e.target.value)}>
                  <option value="Conversação">Conversação (Falar/Ouvir)</option>
                  <option value="Viagem">Viagem Prática</option>
                  <option value="Acadêmico">Leitura / Acadêmico</option>
                  <option value="Profissional">Carreira / Negócios</option>
                </select>
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.65rem 0.85rem', 
                  borderRadius: 'var(--radius-sm)', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid var(--border-color)', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4'
                }}>
                  {newLangGoal === 'Conversação' && '💡 Foco em fala, audição, diálogos informais, gírias e pronúncia fluida.'}
                  {newLangGoal === 'Viagem' && '💡 Foco em diálogos cotidianos para aeroportos, hotéis, restaurantes, compras e direções.'}
                  {newLangGoal === 'Acadêmico' && '💡 Foco em leitura, vocabulário complexo, estruturas formais, interpretação e gramática avançada.'}
                  {newLangGoal === 'Profissional' && '💡 Foco em termos corporativos, jargões do mercado, redação de e-mails, reuniões e apresentações.'}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="langLevel">Nível Atual (Auto-estimado)</label>
                <select id="langLevel" className="form-select" value={newLangLevel} onChange={(e) => setNewLangLevel(e.target.value)}>
                  <option value="A1">A1 (Iniciante)</option>
                  <option value="A2">A2 (Básico)</option>
                  <option value="B1">B1 (Intermediário)</option>
                  <option value="B2">B2 (Intermediário Avançado)</option>
                  <option value="C1">C1 (Fluente)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="langHours">Meta de Estudo (Horas semanais)</label>
                <input type="number" id="langHours" className="form-input" min="1" max="40" value={newLangHours} onChange={(e) => setNewLangHours(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddLanguage(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar Idioma</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
