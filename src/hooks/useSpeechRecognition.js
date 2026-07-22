import { useState, useRef } from 'react'
import { evaluatePronunciation } from '../services/gemini'

export function useSpeechRecognition(activeLanguage) {
  const [speakingTranscripts, setSpeakingTranscripts] = useState({ 0: '', 1: '', 2: '' })
  const [speakingScores, setSpeakingScores] = useState({ 0: null, 1: null, 2: null })
  const [speakingErrors, setSpeakingErrors] = useState({ 0: null, 1: null, 2: null })
  const [recordingIndex, setRecordingIndex] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1]
        resolve(base64String)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const handleStartRecording = async (targetText, index) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      setRecordingIndex(index)
      setSpeakingErrors(prev => ({ ...prev, [index]: null }))
      setSpeakingTranscripts(prev => ({ ...prev, [index]: '' }))
      setSpeakingScores(prev => ({ ...prev, [index]: null }))

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        
        // Desliga o microfone
        stream.getTracks().forEach(track => track.stop())
        setRecordingIndex(null)

        try {
          setSpeakingTranscripts(prev => ({ ...prev, [index]: 'Analisando áudio com IA...' }))
          const base64 = await convertBlobToBase64(audioBlob)
          const result = await evaluatePronunciation(activeLanguage, targetText, base64, mimeType)
          
          setSpeakingTranscripts(prev => ({ ...prev, [index]: result.transcript }))
          setSpeakingScores(prev => ({ ...prev, [index]: result.score }))
          if (result.feedback) {
             setSpeakingErrors(prev => ({ ...prev, [index]: result.feedback }))
          }
        } catch (e) {
          setSpeakingErrors(prev => ({ ...prev, [index]: 'Erro na análise da IA: ' + e.message }))
          setSpeakingTranscripts(prev => ({ ...prev, [index]: '' }))
        }
      }

      mediaRecorder.start()
    } catch (err) {
      console.error('Erro ao acessar microfone:', err)
      setSpeakingErrors(prev => ({ ...prev, [index]: 'Acesso ao microfone recusado ou não encontrado.' }))
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }
  
  const resetSpeechStates = () => {
    setSpeakingTranscripts({ 0: '', 1: '', 2: '' })
    setSpeakingScores({ 0: null, 1: null, 2: null })
    setSpeakingErrors({ 0: null, 1: null, 2: null })
    setRecordingIndex(null)
  }

  return {
    speakingTranscripts,
    setSpeakingTranscripts,
    speakingScores,
    setSpeakingScores,
    speakingErrors,
    setSpeakingErrors,
    recordingIndex,
    handleStartRecording,
    handleStopRecording,
    resetSpeechStates
  }
}
