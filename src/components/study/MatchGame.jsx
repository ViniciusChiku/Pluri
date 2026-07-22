import React from 'react';

export default function MatchGame({
  showMatchGame,
  setShowMatchGame,
  activeLanguage,
  matchedCount,
  gameTiles,
  selectedTile,
  matchedTiles,
  handleTileClick,
  handleCompleteMatchGame
}) {
  if (!showMatchGame) return null;

  return (
    <div className="study-session-view" style={{ width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Jogo de Associação de Vocabulário</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Combine a palavra em {activeLanguage} com sua tradução em Português.
        </p>
      </div>

      <div className="card glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span>Pares Resolvidos: <strong>{matchedCount} / 6</strong></span>
          <span>Estudando: <strong>{activeLanguage}</strong></span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {gameTiles.map(tile => {
            const isSelected = selectedTile?.id === tile.id
            const isMatched = matchedTiles[tile.id]

            return (
              <div
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                style={{
                  background: isMatched ? 'rgba(107, 163, 124, 0.12)' : isSelected ? 'var(--primary-light)' : 'var(--bg-secondary)',
                  border: isMatched ? '1px dashed var(--success)' : isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  color: isMatched ? 'var(--success)' : 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.5rem 1rem',
                  textAlign: 'center',
                  cursor: isMatched ? 'default' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  opacity: isMatched ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  pointerEvents: isMatched ? 'none' : 'auto',
                  minHeight: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected ? '0 0 10px rgba(var(--primary-rgb), 0.2)' : 'none'
                }}
              >
                {tile.text}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowMatchGame(false)}>
            Voltar à Lição
          </button>
          <button 
            className="btn btn-primary" 
            disabled={matchedCount < 6}
            onClick={handleCompleteMatchGame}
          >
            Concluir & Salvar nos Flashcards
          </button>
        </div>
      </div>
    </div>
  )
}
