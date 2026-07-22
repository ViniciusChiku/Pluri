import React from 'react'
import { Sparkles, Check, Save, Volume2 } from 'lucide-react'

export default function VocabularyPanel({ vocabulary, savedCards, onSpeak, onSaveFlashcard, onStartMatchGame }) {
  return (
    <div className="card glass" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem' }}>Vocabulário em Foco</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
            Estude e pratique a pronúncia de cada termo importante extraído.
          </p>
        </div>
        {vocabulary && vocabulary.length > 0 && (
          <button className="btn btn-secondary" onClick={onStartMatchGame} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
            <Sparkles size={14} />
            Jogar Associação
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {vocabulary?.map((vocab, idx) => (
          <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>{vocab.word}</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, display: 'block', marginTop: '0.15rem' }}>{vocab.translation}</span>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => onSpeak(vocab.word)}
                style={{ padding: '0.4rem', borderRadius: '50%', minWidth: '32px', height: '32px' }}
              >
                <Volume2 size={14} />
              </button>
            </div>

            {vocab.example && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 'var(--radius-xs)', borderLeft: '3px solid var(--border-color)' }}>
                <div>&quot;{vocab.example}&quot;</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.15rem' }}>{vocab.exampleTranslation}</div>
              </div>
            )}

            {vocab.tip && (
              <div style={{ fontSize: '0.78rem', color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem', lineHeight: '1.35' }}>
                <span style={{ flexShrink: 0 }}>💡</span>
                <span>{vocab.tip}</span>
              </div>
            )}

            <button
              className={`btn ${savedCards[idx] ? 'btn-secondary' : 'btn-primary'}`}
              disabled={savedCards[idx]}
              onClick={() => onSaveFlashcard(vocab, idx)}
              style={{ marginTop: '0.25rem', padding: '0.45rem', fontSize: '0.75rem', width: '100%' }}
            >
              {savedCards[idx] ? <Check size={12} className="text-success" /> : <Save size={12} />}
              {savedCards[idx] ? 'Adicionado aos Flashcards' : 'Salvar nos Flashcards'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
