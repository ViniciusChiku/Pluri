import React from 'react'
import { Mic, Volume2 } from 'lucide-react'

export default function SpeakingExercise({
  phrases,
  activeLanguage,
  recordingIndex,
  speakingTranscripts,
  speakingErrors,
  speakingScores,
  manualSpeakingInputIdx,
  manualSpeakingText,
  onSpeak,
  onStartRecording,
  onStopRecording,
  onSetManualInputIdx,
  onManualTextChange,
  onConfirmManualSpeaking,
  onCancelManualSpeaking
}) {
  if (!phrases || phrases.length === 0) return null

  return (
    <div className="card glass" style={{ padding: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Mic size={18} className="text-primary" />
        3. Desafio de Fala (Pronúncia)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
        Ouça a frase, clique em <strong>Iniciar</strong>, fale no microfone e clique em <strong>Parar</strong> quando terminar.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {phrases.map((phrase, idx) => {
          const isRecordingThis = recordingIndex === idx
          const isRecordingOther = recordingIndex !== null && recordingIndex !== idx
          return (
            <div key={idx} style={{
              background: 'var(--bg-secondary)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${isRecordingThis ? 'rgba(235,94,85,0.5)' : 'var(--border-color)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              transition: 'border-color 0.2s'
            }}>

              {/* Phrase + listen button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontStyle: 'italic', fontWeight: 500, lineHeight: 1.5 }}>
                  &quot;{phrase}&quot;
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => onSpeak(phrase, activeLanguage)}
                  style={{ padding: '0.4rem', borderRadius: '50%', minWidth: '32px', height: '32px', flexShrink: 0 }}
                  title="Ouvir pronúncia nativa"
                >
                  <Volume2 size={14} />
                </button>
              </div>

              {/* START / STOP buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                {!isRecordingThis ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => onStartRecording(phrase, idx)}
                    disabled={isRecordingOther}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)',
                      opacity: isRecordingOther ? 0.4 : 1
                    }}
                  >
                    <Mic size={14} />
                    Iniciar gravação
                  </button>
                ) : (
                  <button
                    className="btn"
                    onClick={onStopRecording}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)',
                      background: '#eb5e55', color: 'white', border: 'none',
                      animation: 'pulse-rec 1.2s ease-in-out infinite'
                    }}
                  >
                    <style>{`@keyframes pulse-rec { 0%,100%{box-shadow:0 0 0 0 rgba(235,94,85,0.4)} 50%{box-shadow:0 0 0 7px rgba(235,94,85,0)} }`}</style>
                    ⏹ Parar gravação
                  </button>
                )}

                {/* Live transcript while recording */}
                {isRecordingThis && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                    🔴 Ouvindo…
                  </span>
                )}
              </div>

              {/* Live interim transcript preview */}
              {isRecordingThis && speakingTranscripts[idx] && (
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-primary)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-xs)',
                  borderLeft: '3px solid var(--warning)',
                  fontStyle: 'italic'
                }}>
                  {speakingTranscripts[idx]}
                </div>
              )}

              {/* Errors */}
              {speakingErrors[idx] && (
                <div style={{
                  fontSize: '0.8rem',
                  color: '#eb5e55',
                  background: 'rgba(235, 94, 85, 0.08)',
                  border: '1px solid rgba(235, 94, 85, 0.2)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0.65rem 0.85rem',
                  fontWeight: 500,
                  lineHeight: '1.4',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div>⚠️ {speakingErrors[idx]}</div>
                  {manualSpeakingInputIdx !== idx && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => onSetManualInputIdx(idx)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        alignSelf: 'flex-start',
                        color: '#eb5e55',
                        border: '1px solid #eb5e55',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      ⌨️ Digitar frase manualmente
                    </button>
                  )}
                </div>
              )}

              {/* Manual input fallback */}
              {manualSpeakingInputIdx === idx && (
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  background: 'var(--bg-primary)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-color)'
                }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Digite a frase para comparar..."
                    value={manualSpeakingText}
                    onChange={(e) => onManualTextChange(e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => onConfirmManualSpeaking(idx, phrase)}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                    disabled={!manualSpeakingText.trim()}
                  >
                    Validar
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={onCancelManualSpeaking}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Score result (shown after Stop) */}
              {!isRecordingThis && speakingScores[idx] !== null && (
                <div style={{
                  fontSize: '0.8rem',
                  padding: '0.6rem 0.75rem',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-xs)',
                  borderLeft: `3px solid ${speakingScores[idx] >= 80 ? 'var(--success)' : 'var(--warning)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pronúncia correspondida: <strong>{speakingScores[idx]}%</strong></span>
                    <span style={{ color: speakingScores[idx] >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                      {speakingScores[idx] >= 80 ? '✅ Ótimo!' : '🔁 Tente de novo'}
                    </span>
                  </div>
                  {speakingTranscripts[idx] && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Você disse: &quot;{speakingTranscripts[idx]}&quot;
                    </div>
                  )}
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
