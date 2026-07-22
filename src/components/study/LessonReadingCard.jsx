import React from 'react'
import { Sparkles, Volume2, Eye, EyeOff, Pause, Link2 } from 'lucide-react'
import ArticleBody from './ArticleBody'

export default function LessonReadingCard({ lesson, showTranslation, setShowTranslation, isPlayingAudiobook, toggleAudiobook }) {
  return (
    <div className="card glass" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      {lesson.isAnalyzingInBackground && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            width: '40%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
            animation: 'shimmer 1.5s infinite linear'
          }} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-primary">{lesson.estimatedLevel}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nível CEFR</span>
          {lesson.isAnalyzingInBackground && (
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontStyle: 'italic', marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={14} className="spin" />
              (IA preparando vocabulário e quiz em segundo plano...)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${isPlayingAudiobook ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleAudiobook}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            disabled={lesson.isAnalyzingInBackground}
          >
            {isPlayingAudiobook ? <Pause size={14} /> : <Volume2 size={14} />}
            {isPlayingAudiobook ? 'Pausar Áudio' : 'Ouvir Texto (Audiobook)'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowTranslation(!showTranslation)}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            disabled={lesson.isAnalyzingInBackground}
          >
            {showTranslation ? <EyeOff size={14} /> : <Eye size={14} />}
            {showTranslation ? 'Ocultar Tradução' : 'Mostrar Tradução'}
          </button>

          {lesson.source_url && (
            <a
              href={lesson.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
                color: 'var(--text-primary)'
              }}
            >
              <Link2 size={14} />
              Link Original ↗
            </a>
          )}
        </div>
      </div>

      {!lesson.isAnalyzingInBackground && lesson.isSnippetOnly && (
        <div style={{
          background: 'rgba(235, 94, 85, 0.1)',
          border: '1px solid rgba(235, 94, 85, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.6rem 0.9rem',
          fontSize: '0.8rem',
          color: '#eb5e55',
          marginBottom: '1rem'
        }}>
          Não foi possível carregar o artigo completo da fonte original — este texto é apenas um resumo curto (snippet) da notícia.
          {lesson.source_url ? ' Use o botão "Link Original" para ler a matéria completa.' : ''}
        </div>
      )}

      <h3 style={{ fontSize: '1.6rem', marginBottom: '1.25rem', color: 'var(--primary)', fontWeight: 800 }}>
        {lesson.title}
      </h3>

      <div className="study-text" style={{ fontSize: '1.05rem', lineHeight: '1.85', color: 'var(--text-primary)' }}>
        {showTranslation ? (
          lesson.interlinear && lesson.interlinear.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {lesson.interlinear.map((sentence, sIdx) => {
                const tokens = sentence.split(/\s+/).filter(t => t.trim().length > 0);
                return (
                  <div key={sIdx} style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem 0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    {tokens.map((token, tIdx) => {
                      const parts = token.split('|');
                      const original = parts[0] ? parts[0].replace(/_/g, ' ') : '';
                      const translation = parts[1] ? parts[1].replace(/_/g, ' ') : '';

                      return (
                        <div key={tIdx} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '2px 0' }}>
                          <span style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {original}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontStyle: 'italic', marginTop: '0.05rem' }}>
                            {translation}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {lesson.translation && (
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px dashed var(--border-color)',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  color: 'var(--text-secondary)'
                }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>
                    Tradução Completa (Fluxo Contínuo):
                  </strong>
                  <p style={{ whiteSpace: 'pre-line' }}>{lesson.translation}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <ArticleBody text={lesson.text} imageUrl={lesson.imageUrl} />
              {lesson.isAnalyzingInBackground ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  ⏳ Alinhando tradução palavra por palavra em segundo plano...
                </span>
              ) : (
                lesson.translation && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1.25rem',
                    background: 'var(--bg-secondary)',
                    borderLeft: '4px solid var(--primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    color: 'var(--text-secondary)'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--primary)' }}>Tradução:</strong>
                    <p style={{ whiteSpace: 'pre-line' }}>{lesson.translation}</p>
                  </div>
                )
              )}
            </div>
          )
        ) : (
          <ArticleBody text={lesson.text} imageUrl={lesson.imageUrl} />
        )}
      </div>
    </div>
  )
}
