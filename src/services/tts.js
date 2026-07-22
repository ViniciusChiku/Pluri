// Shared text-to-speech helper (native browser SpeechSynthesis API). Used by
// both the study session player and the flashcards trainer, which need the
// same language-name -> BCP-47 locale mapping.
const LANG_LOCALES = {
  'Inglês': 'en-US',
  'Espanhol': 'es-ES',
  'Francês': 'fr-FR',
  'Alemão': 'de-DE',
  'Italiano': 'it-IT'
}

export const getLocaleForLanguage = (language) => LANG_LOCALES[language] || 'en-US'

export const isSpeechSynthesisSupported = () => 'speechSynthesis' in window

export const cancelSpeech = () => {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Speaks `text` in the given app language name (e.g. "Inglês"). Returns true
 * if speech was started, false if the browser doesn't support it (alerting
 * the user in that case, matching prior behavior).
 */
export const speak = (text, language, { onEnd } = {}) => {
  if (!isSpeechSynthesisSupported()) {
    alert('Síntese de voz não suportada neste navegador.')
    return false
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = getLocaleForLanguage(language)
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
  return true
}
