import React, { useState, useEffect } from 'react'
import { Sparkles, GraduationCap, Check } from 'lucide-react'
import { processCustomText, evaluateWriting, processCustomMultimodalInput } from '../services/gemini'
import { fetchFullArticleText, extractOgImage } from '../services/liveNews'
import { newsDatabase } from '../data/newsDatabase'
import { saveFlashcard, saveStudySession, getLanguages, getDailyNews } from '../services/supabase'
import { fetchViaProxy } from '../services/edgeFunctions'
import { speak, cancelSpeech } from '../services/tts'
import { calculateSimilarity } from '../services/textSimilarity'
import MatchGame from './study/MatchGame'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import VocabularyPanel from './study/VocabularyPanel'
import ComprehensionQuiz from './study/ComprehensionQuiz'
import DictationExercise from './study/DictationExercise'
import SpeakingExercise from './study/SpeakingExercise'
import EssayExercise from './study/EssayExercise'
import LessonReadingCard from './study/LessonReadingCard'
import ArticleSelectionPanel from './study/ArticleSelectionPanel'

export default function StudySession({ profileId, presetLanguage, presetCompetence, presetSessionId, setCurrentView, onSessionLogged }) {
  const [languages, setLanguages] = useState([])
  const [activeLanguage, setActiveLanguage] = useState('')

  const {
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
  } = useSpeechRecognition(activeLanguage)
  const [selectedCategory, setSelectedCategory] = useState('Tecnologia')
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [dbNews, setDbNews] = useState([])

  
  const [isLoading, setIsLoading] = useState(false)
  const [lesson, setLesson] = useState(null)
  const [studyStep, setStudyStep] = useState('reading')
  // Always generate the full/complete article format (the short/quick option was removed).
  const studyLength = 'long'
  const [showTranslation, setShowTranslation] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState(null)
  
  // User skills retrieved for adaptation
  const [userSkills, setUserSkills] = useState({ reading: 50, listening: 50, speaking: 50, writing: 50 })
  
  // Exercises state
  const [selectedAnswers, setSelectedAnswers] = useState({}) // { questionIdx: optionIdx }
  const [revealedHints, setRevealedHints] = useState({}) // { questionIdx: true }
  const [savedCards, setSavedCards] = useState({}) // { wordIndex: true }
  const [sessionCompleted, setSessionCompleted] = useState(false)

  // Speaking states
  const [manualSpeakingInputIdx, setManualSpeakingInputIdx] = useState(null)
  const [manualSpeakingText, setManualSpeakingText] = useState('')

  // Dictation states
  const [dictationInputs, setDictationInputs] = useState({ 0: '', 1: '', 2: '' })
  const [dictationScores, setDictationScores] = useState({ 0: null, 1: null, 2: null })
  const [dictationSubmitted, setDictationSubmitted] = useState(false)

  // Writing essay states
  const [userEssay, setUserEssay] = useState('')
  const [essayEvaluation, setEssayEvaluation] = useState(null)
  const [isEvaluatingEssay, setIsEvaluatingEssay] = useState(false)

  // Audiobook voice state
  const [isPlayingAudiobook, setIsPlayingAudiobook] = useState(false)
  
  // Custom article import states
  const [activeSourceTab, setActiveSourceTab] = useState('local') // 'local' | 'import'
  const [importMethod, setImportMethod] = useState('link') // 'link' | 'image' | 'pdf'
  const [importUrl, setImportUrl] = useState('')
  const [importFileName, setImportFileName] = useState('')
  const [importFileBase64, setImportFileBase64] = useState('')
  const [importFileMimeType, setImportFileMimeType] = useState('')
  const [customInputError, setCustomInputError] = useState('')
  const [isProcessingImport, setIsProcessingImport] = useState(false)

  // Vocabulary matching game states
  const [showMatchGame, setShowMatchGame] = useState(false)
  const [gameTiles, setGameTiles] = useState([])
  const [selectedTile, setSelectedTile] = useState(null)
  const [matchedTiles, setMatchedTiles] = useState({}) // { tileId: true }
  const [matchedCount, setMatchedCount] = useState(0)

  useEffect(() => {
    async function loadLangs() {
      const list = await getLanguages(profileId)
      setLanguages(list)
      if (list.length > 0) {
        if (presetLanguage && list.find(l => l.name === presetLanguage)) {
          setActiveLanguage(presetLanguage)
        } else {
          setActiveLanguage(list[0].name)
        }
      }
      
      // Load user skills
      const savedSkillsKey = `planner_skills_v2_${profileId}`
      const savedSkillsRaw = localStorage.getItem(savedSkillsKey)
      if (savedSkillsRaw) {
        try {
          setUserSkills(JSON.parse(savedSkillsRaw))
        } catch (e) {
          console.error(e)
        }
      }
    }
    loadLangs()
  }, [profileId, presetLanguage, presetCompetence])

  const [newsLoading, setNewsLoading] = useState(false)

  // Fetch daily news: Supabase's `daily_news` table (populated once a day by
  // the fetch-daily-news GitHub Action, see scripts/fetchDailyNews.js) is the
  // single source of truth. The static newsDatabase seed only kicks in as a
  // fallback when that table has nothing for the target language yet — e.g.
  // a fresh project setup before the first scheduled run.
  useEffect(() => {
    async function loadNews() {
      const targetLang = activeLanguage || 'Inglês'

      setNewsLoading(true)
      try {
        const news = await getDailyNews(targetLang)
        if (news && news.length > 0) {
          setDbNews(news)
        } else {
          setDbNews(newsDatabase.filter(n => n.language === targetLang))
        }
      } catch (e) {
        console.warn('Supabase daily news fetch failed, using local seed data:', e)
        setDbNews(newsDatabase.filter(n => n.language === targetLang))
      } finally {
        setNewsLoading(false)
      }
    }
    loadNews()
  }, [activeLanguage])

  // Filter the loaded news by selected category
  const filteredNews = dbNews.filter(
    item => item.category === selectedCategory
  )

  // Deduplicate languages array by language name
  const uniqueLanguages = Array.from(
    new Map(languages.map(l => [l.name, l])).values()
  )

  // Trigger default article selection when news list or category changes
  useEffect(() => {
    if (filteredNews.length > 0) {
      setSelectedArticle(filteredNews[0])
    } else {
      setSelectedArticle(null)
    }
    // filteredNews is derived from dbNews/selectedCategory on every render (new
    // array reference each time), so depending on it directly would re-run this
    // effect — and reset the selected article — on every unrelated re-render too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbNews, selectedCategory])

  // Stop speechSynthesis on unmount or when changing view
  useEffect(() => {
    return () => cancelSpeech()
  }, [])

  // Audio speaking helper
  const speakSentence = (text, lang) => {
    speak(text, lang, {
      onEnd: () => {
        if (isPlayingAudiobook) {
          setIsPlayingAudiobook(false)
        }
      }
    })
  }

  const toggleAudiobook = () => {
    if (isPlayingAudiobook) {
      cancelSpeech()
      setIsPlayingAudiobook(false)
    } else {
      if (lesson && lesson.text) {
        setIsPlayingAudiobook(true)
        speakSentence(lesson.text, activeLanguage)
      }
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImportFileName(file.name)
    setImportFileMimeType(file.type)
    setCustomInputError('')

    const reader = new FileReader()
    reader.onload = () => {
      const base64Str = reader.result.split(',')[1]
      setImportFileBase64(base64Str)
    }
    reader.onerror = () => {
      setCustomInputError('Erro ao ler o arquivo selecionado.')
    }
    reader.readAsDataURL(file)
  }

  const handleImportCustomArticle = async () => {
    setCustomInputError('')
    


    setIsProcessingImport(true)
    setSessionStartTime(Date.now())
    resetSessionStates()

    const tempLesson = {
      title: 'Processando Artigo Importado...',
      text: 'Aguardando leitura do link/arquivo e processamento pela Inteligência Artificial...',
      estimatedLevel: 'Calculando...',
      translation: '',
      isMock: false,
      isAnalyzingInBackground: true,
      vocabulary: [],
      questions: [],
      writingPrompt: '',
      dictationPhrases: [],
      speakingPhrases: []
    }
    setLesson(tempLesson)

    try {
      let finalContent = ''
      let extractedImage = null

      if (importMethod === 'link') {
        if (!importUrl.trim()) {
          throw new Error('Por favor, insira um link de artigo válido.')
        }

        const targetUrl = importUrl.trim()

        let rawHtml
        try {
          const result = await fetchViaProxy(targetUrl)
          rawHtml = result.text
        } catch (proxyErr) {
          throw new Error('Falha ao tentar ler o site. Verifique se o link está correto ou use a opção de tirar um Print (imagem) do artigo.')
        }

        finalContent = rawHtml.substring(0, 45000)
        // We already have the raw HTML in hand, so grab the article's cover
        // image (og:image) from it at no extra request cost.
        extractedImage = extractOgImage(rawHtml)
      }

      const activeLangData = languages.find(l => l.name === activeLanguage)
      const primaryGoal = activeLangData ? activeLangData.primary_goal : ''
      const currentLevel = activeLangData ? activeLangData.current_level : 'B1'

      const result = await processCustomMultimodalInput({
        language: activeLanguage,
        textContent: importMethod === 'link' ? finalContent : '',
        fileBase64: importMethod !== 'link' ? importFileBase64 : '',
        fileMimeType: importMethod !== 'link' ? importFileMimeType : '',
        userSkills,
        primaryGoal,
        level: currentLevel,
        length: studyLength
      })

      setLesson({
        ...result,
        source_url: importMethod === 'link' ? importUrl.trim() : null,
        imageUrl: extractedImage,
        isMock: false,
        isAnalyzingInBackground: false
      })
    } catch (err) {
      console.error('Failed to import article:', err)
      setCustomInputError(err.message || 'Erro inesperado ao processar o artigo.')
      setLesson(null)
    } finally {
      setIsProcessingImport(false)
    }
  }

  // Instant opening & background loading process
  const handleOpenArticleInstant = () => {
    if (!selectedArticle) return
    
    setSessionStartTime(Date.now())
    resetSessionStates()

    const initialText = selectedArticle.text

    // 1. Immediately render the text and loading flags
    const tempLesson = {
      title: selectedArticle.title,
      text: initialText,
      estimatedLevel: selectedArticle.estimatedLevel,
      translation: selectedArticle.translation || '',
      source_url: selectedArticle.source_url || null,
      imageUrl: selectedArticle.imageUrl || null,
      isMock: false,
      isAnalyzingInBackground: true,
      isSnippetOnly: false,
      vocabulary: [],
      questions: [],
      writingPrompt: '',
      dictationPhrases: [],
      speakingPhrases: []
    }
    setLesson(tempLesson)

    const articleLanguage = activeLanguage

    const runBackgroundAPI = async () => {
      try {
        let textToAnalyze = initialText
        let fullTextFetched = false

        // If source_url is present, fetch full article text (and cover image,
        // when available) from the original URL. fetchFullArticleText never
        // throws; text comes back null if every extraction strategy failed,
        // in which case we fall back to the short RSS snippet and flag the
        // lesson so the UI can be honest about it.
        if (selectedArticle.source_url) {
          const { text: fullExtracted, imageUrl: extractedImage } = await fetchFullArticleText(selectedArticle.source_url)
          if (fullExtracted && fullExtracted.length > initialText.length) {
            textToAnalyze = fullExtracted
            fullTextFetched = true
            setLesson(prev => prev ? { ...prev, text: fullExtracted } : prev)
          }
          // Only overrides the RSS thumbnail (if any) when we actually found one.
          if (extractedImage) {
            setLesson(prev => prev ? { ...prev, imageUrl: extractedImage } : prev)
          }
        }

        const activeLangData = languages.find(l => l.name === articleLanguage)
        const primaryGoal = activeLangData ? activeLangData.primary_goal : ''
        const currentLevel = activeLangData ? activeLangData.current_level : 'B1'

        const generated = await processCustomText(articleLanguage, textToAnalyze, userSkills, primaryGoal, currentLevel, studyLength)
        setLesson(prev => {
          if (prev) {
            return {
              ...prev,
              ...generated,
              text: generated.text || textToAnalyze,
              isAnalyzingInBackground: false,
              isSnippetOnly: !fullTextFetched
            }
          }
          return prev
        })
      } catch (err) {
        console.error('Error in background lesson generation:', err)
        setLesson(prev => prev ? { ...prev, isAnalyzingInBackground: false } : prev)
      }
    }
    runBackgroundAPI()
  }

  const resetSessionStates = () => {
    setLesson(null)
    setStudyStep('reading')
    setShowTranslation(false)
    setSelectedAnswers({})
    setRevealedHints({})
    setSavedCards({})
    setSessionCompleted(false)
    resetSpeechStates()
    setManualSpeakingInputIdx(null)
    setManualSpeakingText('')
    setDictationInputs({ 0: '', 1: '', 2: '' })
    setDictationScores({ 0: null, 1: null, 2: null })
    setDictationSubmitted(false)
    setUserEssay('')
    setEssayEvaluation(null)
    setIsPlayingAudiobook(false)
    setShowMatchGame(false)
    cancelSpeech()
  }

  const handleSaveFlashcard = async (vocab, index) => {
    const card = {
      front: vocab.word,
      back: vocab.translation,
      language: activeLanguage,
      example: vocab.example ? `${vocab.example} (${vocab.exampleTranslation || ''})` : '',
    }
    await saveFlashcard(card, profileId)
    setSavedCards(prev => ({ ...prev, [index]: true }))
  }

  const handleSelectAnswer = (questionIdx, optionIdx) => {
    if (selectedAnswers[questionIdx] !== undefined) return
    setSelectedAnswers(prev => ({ ...prev, [questionIdx]: optionIdx }))
  }

  // Ditado challenge verification
  const handleSubmitDictation = () => {
    if (!lesson || !lesson.dictationPhrases) return
    
    const scores = {}
    lesson.dictationPhrases.forEach((phrase, idx) => {
      const input = dictationInputs[idx] || ''
      const similarity = calculateSimilarity(input, phrase)
      scores[idx] = similarity
    })
    setDictationScores(scores)
    setDictationSubmitted(true)
  }

  const handleConfirmManualSpeaking = (idx, targetText) => {
    const score = calculateSimilarity(manualSpeakingText, targetText)
    setSpeakingTranscripts(prev => ({ ...prev, [idx]: manualSpeakingText }))
    setSpeakingScores(prev => ({ ...prev, [idx]: score }))
    setSpeakingErrors(prev => ({ ...prev, [idx]: null }))
    setManualSpeakingInputIdx(null)
    setManualSpeakingText('')
  }

  // Submit Writing prompt essay to Gemini for review
  const handleSubmitEssay = async () => {
    if (!userEssay.trim() || !lesson) return
    setIsEvaluatingEssay(true)
    setEssayEvaluation(null)

    try {
      const evaluation = await evaluateWriting(activeLanguage, lesson.title, userEssay)
      setEssayEvaluation(evaluation)
    } catch (e) {
      console.error(e)
    } finally {
      setIsEvaluatingEssay(false)
    }
  }

  // Vocabulary pairing game initialization
  const startMatchGame = () => {
    if (!lesson || !lesson.vocabulary || lesson.vocabulary.length === 0) return
    
    const tiles = []
    lesson.vocabulary.forEach((vocab, idx) => {
      tiles.push({
        id: `word_${idx}`,
        text: vocab.word,
        type: 'word',
        vocabIdx: idx
      })
      tiles.push({
        id: `trans_${idx}`,
        text: vocab.translation,
        type: 'translation',
        vocabIdx: idx
      })
    })

    const shuffled = tiles.sort(() => Math.random() - 0.5)
    setGameTiles(shuffled)
    setSelectedTile(null)
    setMatchedTiles({})
    setMatchedCount(0)
    setShowMatchGame(true)
  }

  const handleTileClick = (tile) => {
    if (matchedTiles[tile.id]) return

    if (!selectedTile) {
      setSelectedTile(tile)
    } else {
      if (selectedTile.id === tile.id) {
        setSelectedTile(null)
        return
      }

      if (selectedTile.vocabIdx === tile.vocabIdx && selectedTile.type !== tile.type) {
        setMatchedTiles(prev => ({
          ...prev,
          [selectedTile.id]: true,
          [tile.id]: true
        }))
        setSelectedTile(null)
        setMatchedCount(prev => prev + 1)
      } else {
        setSelectedTile(tile)
      }
    }
  }

  const handleCompleteMatchGame = async () => {
    setIsLoading(true)
    try {
      for (let i = 0; i < lesson.vocabulary.length; i++) {
        const vocab = lesson.vocabulary[i]
        const card = {
          front: vocab.word,
          back: vocab.translation,
          language: activeLanguage,
          example: vocab.example ? `${vocab.example} (${vocab.exampleTranslation || ''})` : '',
          next_review: new Date().toISOString().split('T')[0],
          ease_factor: 2.5,
          repetitions: 0
        }
        await saveFlashcard(card, profileId)
      }
      setShowMatchGame(false)
      alert('Tudo pronto! Todas as palavras foram associadas e salvas nos seus Flashcards.')
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  // Complete session and update profile skills
  const handleCompleteSession = async () => {
    if (!lesson) return
    
    // Calculate elapsed time in minutes
    const elapsedTimeMs = Date.now() - sessionStartTime
    const elapsedTimeMinutes = Math.max(1, Math.round(elapsedTimeMs / 1000 / 60))

    // 1. Calculate reading score
    let correctCount = 0
    const questionsLength = lesson.questions ? lesson.questions.length : 5
    if (lesson.questions && lesson.questions.length > 0) {
      lesson.questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctAnswerIndex) {
          correctCount++
        }
      })
    }
    const readingScore = questionsLength > 0 ? Math.round((correctCount / questionsLength) * 100) : 50

    // 2. Calculate listening score
    let dictationSum = 0
    let dictationCount = 0
    Object.values(dictationScores).forEach(s => {
      if (s !== null) {
        dictationSum += s
        dictationCount++
      }
    })
    const listeningScore = dictationCount > 0 ? Math.round(dictationSum / dictationCount) : 50

    // 3. Calculate speaking score
    let speakingSum = 0
    let speakingCount = 0
    Object.values(speakingScores).forEach(s => {
      if (s !== null) {
        speakingSum += s
        speakingCount++
      }
    })
    const speakingScore = speakingCount > 0 ? Math.round(speakingSum / speakingCount) : 50

    // 4. Calculate writing score
    let writingScore = 50
    if (essayEvaluation && essayEvaluation.grade) {
      const gradeMap = {
        'Excelente': 100,
        'Muito Bom': 85,
        'Bom': 75,
        'Regular': 55,
        'Precisa Melhorar': 35
      }
      writingScore = gradeMap[essayEvaluation.grade] || 60
    }

    // 5. Update userSkills
    const newSkills = {
      reading: Math.round(userSkills.reading * 0.7 + readingScore * 0.3),
      listening: Math.round(userSkills.listening * 0.7 + listeningScore * 0.3),
      speaking: Math.round(userSkills.speaking * 0.7 + speakingScore * 0.3),
      writing: Math.round(userSkills.writing * 0.7 + writingScore * 0.3)
    }

    const savedSkillsKey = `planner_skills_v2_${profileId}`
    localStorage.setItem(savedSkillsKey, JSON.stringify(newSkills))
    setUserSkills(newSkills)

    // Log study session in DB (Updates existing calendar block if presetSessionId is supplied)
    const studyLog = {
      id: presetSessionId || undefined, // Upsert if ID is provided!
      language: activeLanguage,
      competence: lesson.isAnalyzingInBackground ? 'Leitura' : (presetCompetence || 'Leitura'),
      duration_minutes: elapsedTimeMinutes,
      completed: true,
      notes: `Sessão Notícias: ${lesson.title} - ${elapsedTimeMinutes} min`
    }
    await saveStudySession(studyLog, profileId)
    setSessionCompleted(true)
    
    if (onSessionLogged) onSessionLogged()
    
    setTimeout(() => {
      setCurrentView('dashboard')
    }, 2500)
  }

  // Skeleton Loader for background generation
  const SkeletonLoader = ({ title }) => (
    <div className="card glass" style={{ padding: '2rem', animation: 'pulse-skeleton 2s infinite ease-in-out', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ width: '100%', height: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xs)' }} />
        <div style={{ width: '92%', height: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xs)' }} />
        <div style={{ width: '70%', height: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xs)' }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '1.25rem', fontStyle: 'italic' }}>
        💡 Analisando texto e preparando os desafios...
      </span>
      <style>{`
        @keyframes pulse-skeleton {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )

  // Vocab Match Game Render View
  if (showMatchGame) {
    return (
      <MatchGame
        showMatchGame={showMatchGame}
        setShowMatchGame={setShowMatchGame}
        activeLanguage={activeLanguage}
        matchedCount={matchedCount}
        gameTiles={gameTiles}
        selectedTile={selectedTile}
        matchedTiles={matchedTiles}
        handleTileClick={handleTileClick}
        handleCompleteMatchGame={handleCompleteMatchGame}
      />
    )
  }

  return (
    <div className="study-session-view" style={{ width: '100%' }}>
      {/* View Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
          Espaço de Estudos Premium
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Notícias e artigos curados de alta qualidade com análise de dificuldade instantânea.
        </p>
      </div>

      {/* Article Selection Panel */}
      {!lesson && (
        <ArticleSelectionPanel
          isLoading={isLoading}
          activeSourceTab={activeSourceTab}
          setActiveSourceTab={setActiveSourceTab}
          activeLanguage={activeLanguage}
          setActiveLanguage={setActiveLanguage}
          uniqueLanguages={uniqueLanguages}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          filteredNews={filteredNews}
          newsLoading={newsLoading}
          selectedArticle={selectedArticle}
          setSelectedArticle={setSelectedArticle}
          handleOpenArticleInstant={handleOpenArticleInstant}
          importMethod={importMethod}
          setImportMethod={setImportMethod}
          importFileName={importFileName}
          setImportFileName={setImportFileName}
          importFileBase64={importFileBase64}
          setImportFileBase64={setImportFileBase64}
          importFileMimeType={importFileMimeType}
          setImportFileMimeType={setImportFileMimeType}
          customInputError={customInputError}
          setCustomInputError={setCustomInputError}
          importUrl={importUrl}
          setImportUrl={setImportUrl}
          handleFileChange={handleFileChange}
          handleImportCustomArticle={handleImportCustomArticle}
          isProcessingImport={isProcessingImport}
        />
      )}

      {/* Study Session Active Content */}
      {lesson && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Fallback Banner for Mock Mode (shown on every step, not just reading,
              so the user always knows if they're looking at simulated/incomplete content) */}
          {lesson.isMock && (
            <div style={{ 
              background: 'rgba(224, 159, 78, 0.08)', 
              border: '1px solid var(--warning)', 
              color: 'var(--warning)', 
              padding: '1.25rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.85rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem' 
            }}>
              <div>
                ⚠️ <strong>Modo de Demonstração:</strong> Você está vendo uma lição simulada de exemplo. 
                Configure uma chave Gemini API válida na aba <strong>Configurações</strong> para ter tradução inteligente e correções de redação completas.
              </div>
              {lesson.errorMsg && (
                <div style={{ 
                  background: 'rgba(235, 94, 85, 0.1)', 
                  border: '1px solid rgba(235, 94, 85, 0.2)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '0.75rem 1rem', 
                  fontFamily: 'monospace', 
                  color: '#eb5e55', 
                  fontSize: '0.75rem', 
                  wordBreak: 'break-all',
                  marginTop: '0.25rem'
                }}>
                  <strong>Detalhes do Erro da API:</strong> {lesson.errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Lesson Main text Card (Reading + Audiobook) */}
          {studyStep === 'reading' && (
            <LessonReadingCard
              lesson={lesson}
              showTranslation={showTranslation}
              setShowTranslation={setShowTranslation}
              isPlayingAudiobook={isPlayingAudiobook}
              toggleAudiobook={toggleAudiobook}
            />
          )}

        {/* Reading Step Footer */}
        {studyStep === 'reading' && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1.25rem 1.5rem', 
            background: 'var(--bg-secondary)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <button className="btn btn-secondary" onClick={resetSessionStates} style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}>
              Voltar / Nova Lição
            </button>

            {lesson.isAnalyzingInBackground ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid var(--border-color)', 
                  borderTop: '2px solid var(--primary)', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }} />
                <span>Elaborando exercícios personalizados...</span>
              </div>
            ) : (
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setStudyStep('exercises');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ 
                  padding: '0.75rem 1.75rem', 
                  fontSize: '0.95rem', 
                  fontWeight: 700,
                  animation: 'pulse-btn 2s infinite'
                }}
              >
                <style>{`
                  @keyframes pulse-btn {
                    0% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(var(--primary-rgb), 0); }
                    100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0); }
                  }
                `}</style>
                Praticar & Fazer Exercícios ➔
              </button>
            )}
          </div>
        )}

        {/* Exercises Step Header & Block */}
        {studyStep === 'exercises' && (
          <>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '0.85rem 1.25rem', 
              background: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem'
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setStudyStep('reading');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                ← Voltar para a Leitura
              </button>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Artigo em estudo</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'inline-block', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lesson.title}
                </strong>
              </div>
            </div>

            {/* SKELETON LOADERS FOR EXERCISES UNDER GENTLE LOADING FLAG */}
            {lesson.isAnalyzingInBackground ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <SkeletonLoader title="1. Vocabulário em Foco" />
                <SkeletonLoader title="2. Desafio de Leitura (Compreensão)" />
                <SkeletonLoader title="3. Desafio de Escuta (Ditado)" />
              </div>
            ) : (
              <>
              <VocabularyPanel
                vocabulary={lesson.vocabulary}
                savedCards={savedCards}
                onSpeak={(word) => speakSentence(word, activeLanguage)}
                onSaveFlashcard={handleSaveFlashcard}
                onStartMatchGame={startMatchGame}
              />

              <ComprehensionQuiz
                questions={lesson.questions}
                selectedAnswers={selectedAnswers}
                revealedHints={revealedHints}
                onSelectAnswer={handleSelectAnswer}
                onRevealHint={(qIdx) => setRevealedHints(prev => ({ ...prev, [qIdx]: true }))}
              />

              <DictationExercise
                phrases={lesson.dictationPhrases}
                inputs={dictationInputs}
                scores={dictationScores}
                submitted={dictationSubmitted}
                onSpeak={(phrase) => speakSentence(phrase, activeLanguage)}
                onInputChange={(idx, value) => setDictationInputs(prev => ({ ...prev, [idx]: value }))}
                onSubmit={handleSubmitDictation}
                onRetry={() => { setDictationSubmitted(false); setDictationScores({ 0: null, 1: null, 2: null }) }}
              />

              <SpeakingExercise
                phrases={lesson.speakingPhrases}
                activeLanguage={activeLanguage}
                recordingIndex={recordingIndex}
                speakingTranscripts={speakingTranscripts}
                speakingErrors={speakingErrors}
                speakingScores={speakingScores}
                manualSpeakingInputIdx={manualSpeakingInputIdx}
                manualSpeakingText={manualSpeakingText}
                onSpeak={speakSentence}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onSetManualInputIdx={setManualSpeakingInputIdx}
                onManualTextChange={setManualSpeakingText}
                onConfirmManualSpeaking={handleConfirmManualSpeaking}
                onCancelManualSpeaking={() => { setManualSpeakingInputIdx(null); setManualSpeakingText('') }}
              />

              <EssayExercise
                writingPrompt={lesson.writingPrompt}
                userEssay={userEssay}
                essayEvaluation={essayEvaluation}
                isEvaluatingEssay={isEvaluatingEssay}
                onEssayChange={setUserEssay}
                onSubmit={handleSubmitEssay}
                onReset={() => setEssayEvaluation(null)}
              />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', flexWrap: 'wrap', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={resetSessionStates} style={{ flex: '1 1 auto', minWidth: '140px' }}>
              Voltar / Nova Lição
            </button>

            {!sessionCompleted && lesson.vocabulary && lesson.vocabulary.length > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={startMatchGame}
                style={{ flex: '1 1 auto', minWidth: '180px', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent' }}
                disabled={lesson.isAnalyzingInBackground}
              >
                <Sparkles size={16} />
                Memorizar Vocabulário Agora
              </button>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleCompleteSession}
              disabled={sessionCompleted || lesson.isAnalyzingInBackground}
              style={{ padding: '1rem 2.5rem', fontSize: '1.05rem', flex: '1 1 auto', minWidth: '220px' }}
            >
              {sessionCompleted ? <Check size={18} /> : <GraduationCap size={18} />}
              {sessionCompleted ? 'Sessão Registrada!' : 'Concluir Sessão de Estudos'}
            </button>
          </div>
        </>
      )}
        </>
      )}
        </div>
      )}
    </div>
  )
}
