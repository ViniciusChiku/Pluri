import React from 'react'
import { MessageSquareCode } from 'lucide-react'

export default function EssayExercise({ writingPrompt, userEssay, essayEvaluation, isEvaluatingEssay, onEssayChange, onSubmit, onReset }) {
  if (!writingPrompt) return null

  return (
    <div className="card glass" style={{ padding: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MessageSquareCode size={18} className="text-primary" />
        4. Desafio de Escrita (Redação Livre)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem', marginTop: '-0.5rem' }}>
        Responda à questão discursiva no idioma de estudo. A IA analisará sua resposta em detalhes.
      </p>

      <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>{writingPrompt}</strong>

        <textarea
          className="form-input"
          rows="4"
          placeholder="Escreva sua resposta em frases completas..."
          value={userEssay}
          onChange={(e) => onEssayChange(e.target.value)}
          disabled={isEvaluatingEssay || essayEvaluation}
          style={{ fontFamily: 'inherit', resize: 'vertical' }}
        />

        {!essayEvaluation && !isEvaluatingEssay && (
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={!userEssay.trim()}
            style={{ alignSelf: 'flex-end', padding: '0.75rem 2rem' }}
          >
            Analisar Texto
          </button>
        )}

        {isEvaluatingEssay && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <div style={{ width: '14px', height: '14px', border: '2px solid var(--border-color)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Analisando o texto...
          </div>
        )}

        {essayEvaluation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Avaliação da Redação</h4>
              <span className="badge badge-primary">Nota: {essayEvaluation.grade}</span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {essayEvaluation.explanation}
            </p>

            {essayEvaluation.corrections && essayEvaluation.corrections.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '400px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.25rem', color: 'var(--text-secondary)' }}>Original</th>
                      <th style={{ padding: '0.5rem 0.25rem', color: 'var(--success)' }}>Correção</th>
                      <th style={{ padding: '0.5rem 0.25rem', color: 'var(--text-muted)' }}>Explicação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {essayEvaluation.corrections.map((corr, cIdx) => (
                      <tr key={cIdx} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                        <td style={{ padding: '0.65rem 0.25rem', color: '#ff6b6b', textDecoration: 'line-through' }}>{corr.original}</td>
                        <td style={{ padding: '0.65rem 0.25rem', color: 'var(--success)', fontWeight: 600 }}>{corr.correction}</td>
                        <td style={{ padding: '0.65rem 0.25rem', color: 'var(--text-secondary)' }}>{corr.explanation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {essayEvaluation.betterVersion && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: 'var(--radius-xs)', borderLeft: '4px solid var(--primary)', fontSize: '0.85rem' }}>
                <strong>Recomendação de Versão Ideal:</strong>
                <p style={{ marginTop: '0.25rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>&quot;{essayEvaluation.betterVersion}&quot;</p>
              </div>
            )}

            <button className="btn btn-secondary" onClick={onReset} style={{ alignSelf: 'flex-end', fontSize: '0.75rem', padding: '0.45rem 1rem' }}>
              Reescrever e Corrigir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
