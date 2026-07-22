import React, { useState, useEffect } from 'react'
import { Plus, Trash, Check, Sparkles, Layers, BookOpen, AlertCircle, Volume2 } from 'lucide-react'
import { getFlashcards, saveFlashcard, deleteFlashcard, getLanguages } from '../services/supabase'
import { speak } from '../services/tts'
import { calculateNextReview, nextReviewDateString } from '../services/spacedRepetition'

export default function FlashcardsView({ profileId, setCurrentView }) {
  const [dueCards, setDueCards] = useState([])
  const [languages, setLanguages] = useState([])
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)

  // Add Card State
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [newLanguage, setNewLanguage] = useState('Inglês')
  const [newExample, setNewExample] = useState('')

  useEffect(() => {
    async function loadFlashcardsData() {
      const allCards = await getFlashcards(profileId)

      // Filter cards due today or in the past
      const todayStr = new Date().toISOString().split('T')[0]
      const due = allCards.filter(c => c.next_review <= todayStr)
      setDueCards(due)
      setActiveCardIndex(0)
      setIsFlipped(false)

      const langs = await getLanguages(profileId)
      setLanguages(langs)
      if (langs.length > 0) {
        setNewLanguage(langs[0].name)
      }
    }
    loadFlashcardsData()
  }, [profileId])

  const handleCreateCard = async (e) => {
    e.preventDefault()
    if (!newFront.trim() || !newBack.trim()) return

    const newCard = {
      front: newFront,
      back: newBack,
      language: newLanguage,
      example: newExample,
      next_review: new Date().toISOString().split('T')[0],
      ease_factor: 2.5,
      repetitions: 0
    }

    await saveFlashcard(newCard, profileId)
    setShowAddCard(false)
    setNewFront('')
    setNewBack('')
    setNewExample('')

    // Reload
    const allCards = await getFlashcards(profileId)
    const todayStr = new Date().toISOString().split('T')[0]
    setDueCards(allCards.filter(c => c.next_review <= todayStr))
  }

  const handleReviewFeedback = async (qualityScore) => {
    const activeCard = dueCards[activeCardIndex]
    if (!activeCard) return

    const { ease_factor, repetitions, interval_days } = calculateNextReview({ ...activeCard, qualityScore })

    const updatedCard = {
      ...activeCard,
      ease_factor,
      repetitions,
      interval_days,
      next_review: nextReviewDateString(interval_days)
    }

    await saveFlashcard(updatedCard, profileId)

    // Flip back and proceed
    setIsFlipped(false)
    
    // Wait for animation to finish before moving to next card
    setTimeout(() => {
      // Remove reviewed card from due list locally to avoid extra refetching
      const updatedDue = dueCards.filter((_, idx) => idx !== activeCardIndex)
      setDueCards(updatedDue)
      // Reset index to 0 or keep within bounds
      if (activeCardIndex >= updatedDue.length) {
        setActiveCardIndex(0)
      }
    }, 200)
  }

  const handleDeleteActiveCard = async () => {
    const activeCard = dueCards[activeCardIndex]
    if (!activeCard) return
    
    if (confirm('Deletar este flashcard permanentemente?')) {
      await deleteFlashcard(activeCard.id)
      const updatedDue = dueCards.filter((_, idx) => idx !== activeCardIndex)
      setDueCards(updatedDue)
      setIsFlipped(false)
      if (activeCardIndex >= updatedDue.length) {
        setActiveCardIndex(0)
      }
    }
  }

  const activeCard = dueCards[activeCardIndex]

  const speakText = (text, language) => speak(text, language)

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Treino de Flashcards</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Memorize expressões e regras gramaticais usando repetição espaçada inteligente.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddCard(true)}>
            <Plus size={16} />
            Novo Card
          </button>
        </div>
      </div>

      {languages.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Adicione um idioma primeiro</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Para gerenciar e estudar flashcards, você precisa configurar seus idiomas no Dashboard.
          </p>
        </div>
      ) : dueCards.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto' }}>
          <Sparkles size={48} className="text-primary" style={{ margin: '0 auto 1.5rem auto' }} />
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Você está em dia!</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Nenhum card na fila de revisão para hoje. Parabéns pela consistência!
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowAddCard(true)}>Adicionar Novo Card</button>
            <button className="btn btn-primary" onClick={() => setCurrentView('dashboard')}>Voltar ao Dashboard</button>
          </div>
        </div>
      ) : (
        <div className="flashcard-arena">
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Fila de Revisão: <strong>{dueCards.length} cards restantes</strong></span>
            <span>Card {activeCardIndex + 1} de {dueCards.length}</span>
          </div>

          <div 
            className={`flashcard-outer ${isFlipped ? 'flipped' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className="flashcard-inner">
              {/* Front of Card */}
              <div className="card-front glass">
                <span className="card-meta">{activeCard?.language}</span>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  {activeCard?.front}
                  <button 
                    onClick={(e) => { e.stopPropagation(); speakText(activeCard?.front, activeCard?.language); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '0.5rem', display: 'flex' }}
                    title="Ouvir pronúncia"
                  >
                    <Volume2 size={24} />
                  </button>
                </h3>
                <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Clique no card para revelar a tradução
                </p>
              </div>

              {/* Back of Card */}
              <div className="card-back glass">
                <span className="card-meta">{activeCard?.language}</span>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {activeCard?.back}
                </h3>
                {activeCard?.example && (
                  <div className="card-context">
                    &quot;{activeCard.example}&quot;
                  </div>
                )}
                <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Como foi sua facilidade em lembrar deste card?
                </p>
              </div>
            </div>
          </div>

          {/* Flashcard SRS Controls */}
          {isFlipped ? (
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              <button 
                className="btn" 
                style={{ background: 'rgba(207, 102, 102, 0.12)', border: '1px solid var(--danger)', color: 'var(--danger)', display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem' }}
                onClick={(e) => { e.stopPropagation(); handleReviewFeedback(0); }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Errei</span>
                <span style={{ fontSize: '0.65rem' }}>Hoje</span>
              </button>
              
              <button 
                className="btn" 
                style={{ background: 'rgba(224, 159, 78, 0.12)', border: '1px solid var(--warning)', color: 'var(--warning)', display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem' }}
                onClick={(e) => { e.stopPropagation(); handleReviewFeedback(1); }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Difícil</span>
                <span style={{ fontSize: '0.65rem' }}>1-2d</span>
              </button>

              <button 
                className="btn" 
                style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', color: 'var(--primary)', display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem' }}
                onClick={(e) => { e.stopPropagation(); handleReviewFeedback(2); }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Bom</span>
                <span style={{ fontSize: '0.65rem' }}>4-6d</span>
              </button>

              <button 
                className="btn" 
                style={{ background: 'rgba(107, 163, 124, 0.12)', border: '1px solid var(--success)', color: 'var(--success)', display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem' }}
                onClick={(e) => { e.stopPropagation(); handleReviewFeedback(3); }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Fácil</span>
                <span style={{ fontSize: '0.65rem' }}>10-15d</span>
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={handleDeleteActiveCard}>
              <Trash size={14} className="text-danger" />
              Deletar este Card
            </button>
          )}
        </div>
      )}

      {/* Add Flashcard Modal Form */}
      {showAddCard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '480px', animation: 'scaleUp 0.3s' }}>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} className="text-primary" />
              Novo Flashcard
            </h3>
            
            <form onSubmit={handleCreateCard} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="cardLanguage">Idioma</label>
                <select id="cardLanguage" className="form-select" value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)}>
                  {languages.map(l => (
                    <option key={l.id} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cardFront">Frente (Expressão / Pergunta no Idioma de Estudo)</label>
                <input type="text" id="cardFront" className="form-input" placeholder="ex: How are you?" value={newFront} onChange={(e) => setNewFront(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cardBack">Verso (Tradução / Resposta em Português)</label>
                <input type="text" id="cardBack" className="form-input" placeholder="ex: Como vai você?" value={newBack} onChange={(e) => setNewBack(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cardExample">Frase de Exemplo / Contexto (Opcional)</label>
                <input type="text" id="cardExample" className="form-input" placeholder="ex: Hello John, how are you today?" value={newExample} onChange={(e) => setNewExample(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddCard(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Criar Flashcard</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
