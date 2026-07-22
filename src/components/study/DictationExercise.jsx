import React from 'react'
import { Volume2, RefreshCw } from 'lucide-react'

export default function DictationExercise({ phrases, inputs, scores, submitted, onSpeak, onInputChange, onSubmit, onRetry }) {
  if (!phrases || phrases.length === 0) return null

  return (
    <div className="card glass" style={{ padding: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Volume2 size={18} className="text-primary" />
        2. Desafio de Escuta (Ditado)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
        Clique no alto-falante para ouvir as frases da lição e digite-as abaixo com ortografia correta.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {phrases.map((phrase, idx) => (
          <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => onSpeak(phrase)}
                style={{ padding: '0.5rem', borderRadius: '50%', minWidth: '36px', height: '36px' }}
              >
                <Volume2 size={16} />
              </button>
              <strong style={{ fontSize: '0.85rem' }}>Frase {idx + 1}</strong>
            </div>

            <input
              type="text"
              className="form-input"
              placeholder="Escreva o que escutou..."
              value={inputs[idx] || ''}
              onChange={(e) => onInputChange(idx, e.target.value)}
              disabled={submitted}
            />

            {submitted && scores[idx] !== null && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Pontuação: {scores[idx]}%</span>
                  <span style={{ color: scores[idx] >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                    {scores[idx] >= 90 ? 'Excelente' : scores[idx] >= 70 ? 'Bom' : 'Precisa Praticar'}
                  </span>
                </div>
                <div style={{ marginTop: '0.25rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  Original: &quot;{phrase}&quot;
                </div>
              </div>
            )}
          </div>
        ))}

        {!submitted ? (
          <button className="btn btn-primary" onClick={onSubmit} style={{ alignSelf: 'flex-end', padding: '0.75rem 2rem' }}>
            Validar Ditados
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={onRetry} style={{ alignSelf: 'flex-end', padding: '0.5rem 1.5rem', fontSize: '0.8rem' }}>
            <RefreshCw size={12} style={{ marginRight: '0.25rem' }} />
            Refazer Ditados
          </button>
        )}
      </div>
    </div>
  )
}
