import React from 'react'
import { Brain } from 'lucide-react'

export default function ComprehensionQuiz({ questions, selectedAnswers, revealedHints, onSelectAnswer, onRevealHint }) {
  if (!questions || questions.length === 0) return null

  return (
    <div className="card glass" style={{ padding: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Brain size={18} className="text-primary" />
        1. Desafio de Leitura (Compreensão)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
        Responda às perguntas sobre o artigo para validar sua leitura analítica.
      </p>

      {questions.map((q, qIdx) => {
        const selectedOpt = selectedAnswers[qIdx]
        const isAnswered = selectedOpt !== undefined

        return (
          <div key={qIdx} className="study-question" style={{ marginBottom: qIdx === questions.length - 1 ? 0 : '1.5rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              {qIdx + 1}. {q.question}
            </h4>

            {q.hint && !isAnswered && (
              <div style={{ marginBottom: '0.75rem' }}>
                {revealedHints[qIdx] ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem', lineHeight: '1.35' }}>
                    <span style={{ flexShrink: 0 }}>💡</span>
                    <span>{q.hint}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onRevealHint(qIdx)}
                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                  >
                    💡 Preciso de uma dica
                  </button>
                )}
              </div>
            )}

            <div className="study-options" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {q.options.map((opt, oIdx) => {
                let styleOption = {
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  background: 'var(--bg-primary)'
                }

                if (isAnswered) {
                  if (oIdx === q.correctAnswerIndex) {
                    styleOption.background = 'rgba(107, 163, 124, 0.15)'
                    styleOption.border = '1px solid var(--success)'
                    styleOption.color = 'var(--success)'
                  } else if (oIdx === selectedOpt) {
                    styleOption.background = 'rgba(235, 94, 85, 0.15)'
                    styleOption.border = '1px solid #eb5e55'
                    styleOption.color = '#eb5e55'
                  }
                }

                return (
                  <div
                    key={oIdx}
                    style={styleOption}
                    onClick={() => onSelectAnswer(qIdx, oIdx)}
                  >
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: isAnswered && oIdx === q.correctAnswerIndex ? 'var(--success)' : 'transparent',
                      color: isAnswered && oIdx === q.correctAnswerIndex ? 'white' : 'inherit'
                    }}>
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span>{opt}</span>
                  </div>
                )
              })}
            </div>

            {isAnswered && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                <strong>{selectedOpt === q.correctAnswerIndex ? '✓ Correto!' : '✗ Incorreto.'}</strong> {q.explanation}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
