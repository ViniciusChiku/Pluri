import { buildLessonPrompt, buildCustomTextAnalysisPrompt, getLevelGuidance, buildHintTipInstruction } from './prompts.js'
import { mockLessons } from '../data/mockLessons.js'
import { isSupabaseEnabled } from './supabase.js'
import { callGeminiProxy } from './edgeFunctions.js'
import { safeJsonParse } from './safeJsonParse.js'

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

// No longer user-configurable (Settings dropped the model picker); still
// overridable via env var for deploys that want a different default model.
export const getGeminiModel = () => {
  const envModel = (typeof process !== 'undefined' && process.env) ? (process.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL) : ''
  const viteModel = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GEMINI_MODEL : ''
  return viteModel || envModel || DEFAULT_GEMINI_MODEL
}

// Gemini calls go through the `gemini-proxy` Supabase Edge Function, which
// holds the real API key server-side — so availability is gated on Supabase
// being configured, not on a client-held key (there is no client-held key
// anymore).
export const hasGeminiAccess = () => isSupabaseEnabled()

// Lesson generation asks for a lot of structured output at once (the article
// text, a full translation, a word-by-word interlinear breakdown, 6
// vocabulary items, 5 quiz questions, dictation/speaking phrases...). For a
// real, longer news article that easily adds up to more than the SDK's
// implicit default output budget, especially with Gemini 3's "thinking"
// tokens sharing that same budget, and the response gets cut off mid-JSON.
// Setting an explicit, generous maxOutputTokens avoids that truncation
// (the Gemini API allows up to 65536 for these models).
const LESSON_GENERATION_CONFIG = { maxOutputTokens: 32768 }

// Normalizes a prompt (string) or a mixed array of strings/inlineData parts
// into the Gemini REST `parts` shape the gemini-proxy function expects.
const toParts = (input) => {
  const arr = Array.isArray(input) ? input : [input]
  return arr.map((item) => (typeof item === 'string' ? { text: item } : item))
}

const generateContent = (contents, generationConfig) =>
  callGeminiProxy({ model: getGeminiModel(), parts: toParts(contents), generationConfig })

// Verifies the parsed lesson actually has the fields the UI needs to render
// exercises. Gemini occasionally returns a truncated/partial JSON object
// (e.g. cut off by a token limit, or safeJsonParse grabbing the wrong brace
// span) that parses fine but is missing vocabulary/questions. Without this
// check the UI silently shows empty exercise cards with no explanation.
const validateLessonShape = (lesson) => {
  const missing = []
  if (!lesson || typeof lesson !== 'object') return ['objeto de lição']
  if (!lesson.text || lesson.text.trim().length < 20) missing.push('texto')
  if (!Array.isArray(lesson.vocabulary) || lesson.vocabulary.length === 0) missing.push('vocabulário')
  if (!Array.isArray(lesson.questions) || lesson.questions.length === 0) missing.push('perguntas de compreensão')
  return missing
}

export const generateLesson = async (language, level = 'B1', topic = 'Geral', competence = 'Leitura', userSkills = null, primaryGoal = '', length = 'long') => {
  if (!hasGeminiAccess()) {
    console.log('Supabase not configured. Using fallback mock content.')
    const fallback = mockLessons[language] || mockLessons['Inglês']
    await new Promise(resolve => setTimeout(resolve, 1500))
    return {
      ...fallback,
      isMock: true
    }
  }

  try {
    const prompt = buildLessonPrompt(language, level, topic, competence, userSkills, primaryGoal, length)
    const text = await generateContent(prompt, LESSON_GENERATION_CONFIG)
    const lesson = safeJsonParse(text)
    const missing = validateLessonShape(lesson)
    if (missing.length > 0) {
      throw new Error(`A IA retornou uma lição incompleta (faltando: ${missing.join(', ')}). Tente novamente.`)
    }
    return {
      ...lesson,
      isMock: false
    }
  } catch (e) {
    console.error('Error generating lesson with Gemini:', e)
    const fallback = mockLessons[language] || mockLessons['Inglês']
    return {
      ...fallback,
      isMock: true,
      errorMsg: e.message
    }
  }
}

export const processCustomText = async (language, textContent, userSkills = null, primaryGoal = '', level = 'B1', length = 'long') => {
  if (!hasGeminiAccess()) {
    console.log('Supabase not configured. Simulated processing of custom text.')
    const fallback = mockLessons[language] || mockLessons['Inglês']
    await new Promise(resolve => setTimeout(resolve, 1500))
    return {
      ...fallback,
      text: textContent,
      title: 'Texto Analisado Localmente',
      translation: 'Esta é uma tradução simulada (Modo de Demonstração). Configure o Supabase para obter traduções e análises reais de qualquer texto.',
      isMock: true
    }
  }

  try {
    const prompt = buildCustomTextAnalysisPrompt(language, textContent, userSkills, primaryGoal, level, length)
    const text = await generateContent(prompt, LESSON_GENERATION_CONFIG)
    const analyzed = safeJsonParse(text)
    const missing = validateLessonShape(analyzed)
    if (missing.length > 0) {
      throw new Error(`A IA retornou uma lição incompleta (faltando: ${missing.join(', ')}). Tente novamente.`)
    }
    return {
      ...analyzed,
      isMock: false
    }
  } catch (e) {
    console.error('Error analyzing custom text with Gemini:', e)
    const fallback = mockLessons[language] || mockLessons['Inglês']
    return {
      ...fallback,
      text: textContent,
      isMock: true,
      errorMsg: e.message
    }
  }
}

export const processCustomMultimodalInput = async ({
  language,
  textContent = '',
  fileBase64 = '',
  fileMimeType = '',
  userSkills = null,
  primaryGoal = '',
  level = 'B1',
  length = 'long'
}) => {
  if (!hasGeminiAccess()) {
    throw new Error('Supabase não está configurado nas Configurações — necessário para usar a IA.')
  }

  // Find weakest skill
  let weakestSkill = 'escrita'
  let minScore = 100
  if (userSkills) {
    if (userSkills.reading < minScore) { minScore = userSkills.reading; weakestSkill = 'leitura' }
    if (userSkills.listening < minScore) { minScore = userSkills.listening; weakestSkill = 'escuta' }
    if (userSkills.writing < minScore) { minScore = userSkills.writing; weakestSkill = 'escrita' }
    if (userSkills.speaking < minScore) { minScore = userSkills.speaking; weakestSkill = 'fala' }
  }

  let goalAdaptation = '';
  if (primaryGoal) {
    if (primaryGoal === 'Conversação') {
      goalAdaptation = 'O objetivo principal do aluno é Conversação (Falar/Ouvir). Foque em expressões cotidianas, gírias comuns, diálogos práticos, e gere frases de ditado (dictationPhrases) e conversação (speakingPhrases) voltadas para a oralidade e conversas reais.';
    } else if (primaryGoal === 'Viagem') {
      goalAdaptation = 'O objetivo principal do aluno é Viagem Prática. Priorize situações do dia a dia de viagens, termos úteis para aeroportos, hotéis, restaurantes, compras, orientações de direção e expressões cotidianas de viagem.';
    } else if (primaryGoal === 'Acadêmico') {
      goalAdaptation = 'O objetivo principal do aluno é Leitura/Acadêmico. Foque em termos acadêmicos/formais, estruturas gramaticais complexas e interpretação crítica.';
    } else if (primaryGoal === 'Profissional') {
      goalAdaptation = 'O objetivo principal do aluno é Carreira/Negócios (Profissional). Use vocabulário corporativo, redação de e-mails de trabalho, expressões de reuniões e apresentações profissionais.';
    }
  }

  const levelInfo = getLevelGuidance(level)
  const hintTipInstruction = buildHintTipInstruction(levelInfo.tier)

  let prompt = ''
  let contents = []

  if (fileBase64 && fileMimeType) {
    contents.push({
      inlineData: {
        data: fileBase64,
        mimeType: fileMimeType
      }
    })

    const lengthInstruction = length === 'short'
      ? `ATENÇÃO: Você deve encurtar/resumir o texto extraído/transcrito para uma versão condensada, didática e simplificada de 2 a 3 parágrafos curtos em ${language}, adequada para o nível de proficiência ${level}. Use esta versão encurtada como o valor do campo "text" no JSON. Todas as perguntas de quiz, vocabulário e exercícios devem ser baseados EXCLUSIVAMENTE nesta versão encurtada.`
      : `Use o texto completo extraído/transcrito na íntegra como o valor do campo "text" no JSON. Não faça resumos.`;

    prompt = `Você é um tutor de idiomas especialista em ensino personalizado.
Analise a imagem ou documento PDF em anexo contendo um artigo ou texto de estudo em ${language}.

INSTRUÇÃO DE TAMANHO: ${lengthInstruction}

1. Extraia e transcreva o texto principal do artigo na sua língua original (remova cabeçalhos, anúncios ou rodapés e formate como texto corrido de leitura com parágrafos legíveis).
2. Defina um título apropriado para a lição baseado no texto extraído.
3. Traduza o texto completo extraído para o Português.
4. Gere exatamente 6 itens de vocabulário importante presente no texto (com palavras em ${language}, tradução, frase de exemplo no idioma e tradução da frase de exemplo).
5. Gere exatamente 5 perguntas de múltipla escolha no idioma de estudo sobre o texto, com opções de resposta, índice correto (0 a 3) e explicações curtas em Português.
6. Gere exatamente 1 tema de redação discursiva (writingPrompt) em ${language} relacionado ao tema.
7. Gere exatamente 3 frases curtas tiradas do texto para ditado (dictationPhrases).
8. Gere exatamente 3 frases médias tiradas do texto para treino de fala (speakingPhrases).

Foco de Nível: ${levelInfo.text}
Foco do Objetivo de Estudo: ${goalAdaptation || 'Geral'}
Adaptação do Aluno: dê ênfase especial e maior nível de detalhe nas atividades voltadas para a habilidade "${weakestSkill}" onde o aluno tem mais dificuldade de aprendizado.

Você deve responder APENAS com um objeto JSON válido (sem markdown, sem blocos de código com a palavra json). O JSON deve seguir exatamente a seguinte estrutura:
{
  "title": "Título curto extraído/criado",
  "text": "O texto extraído em ${language} (na íntegra ou resumido de acordo com a INSTRUÇÃO DE TAMANHO)",
  "translation": "Tradução completa para o Português",
  "interlinear": [
    "Yesterday,|Ontem, I|eu decided|decidi to_work|trabalhar from|de a|uma local|local coffee_shop.|cafeteria."
  ],
  "vocabulary": [
    { "word": "palavra", "translation": "tradução", "example": "exemplo", "exampleTranslation": "tradução do exemplo", "tip": "dica curta de memorização em Português" }
  ],
  "questions": [
    { "question": "pergunta", "options": ["Opção A", "Opção B", "Opção C", "Opção D"], "correctAnswerIndex": 0, "explanation": "explicação", "hint": "dica curta em Português, sem entregar a resposta" }
  ],
  "writingPrompt": "tema da redação",
  "dictationPhrases": ["frase 1", "frase 2", "frase 3"],
  "speakingPhrases": ["frase 1", "frase 2", "frase 3"]
}

O campo "interlinear" deve ser um array de strings. Cada string representa uma frase completa correspondente do "text" original. Cada palavra ou expressão dessa frase deve ser mapeada para sua tradução em Português no formato "PalavraOriginal|Tradução" (separadas por espaços). Exemplo: "Yesterday,|Ontem, I|eu decided|decidi to_work|trabalhar".
IMPORTANTE: Se a tradução inverter a ordem das palavras (como adjetivo + substantivo em inglês que vira substantivo + adjetivo em português, ex: "professional sports" -> "esportes profissionais", ou "hot coffee" -> "café quente"), ou se formarem uma expressão ou termo composto, você DEVE agrupá-las como um único token unindo as palavras por sublinhado (underscore), ex: "professional_sports|esportes_profissionais", "hot_coffee|café_quente", "coffee_shop|cafeteria" ou "to_work|trabalhar". As pontuações devem ficar coladas na última palavra do bloco original (ex: "Yesterday,|Ontem,").
${hintTipInstruction}

Certifique-se de que o JSON é válido, parseável e não contém blocos de markdown ou crases no início ou fim.`
  } else {
    // Text or HTML scraped from URL
    contents.push(textContent)

    const lengthInstruction = length === 'short'
      ? `ATENÇÃO: Você deve encurtar/resumir o texto extraído/transcrito para uma versão condensada, didática e simplificada de 2 a 3 parágrafos curtos em ${language}, adequada para o nível de proficiência ${level}. Use esta versão encurtada como o valor do campo "text" no JSON. Todas as perguntas de quiz, vocabulário e exercícios devem ser baseados EXCLUSIVAMENTE nesta versão encurtada.`
      : `Use o texto completo extraído/transcrito na íntegra como o valor do campo "text" no JSON. Não faça resumos.`;

    prompt = `Você é um tutor de idiomas especialista em ensino personalizado.
Analise o seguinte texto ou conteúdo de artigo (que pode conter tags HTML e metadados) em ${language}:

INSTRUÇÃO DE TAMANHO: ${lengthInstruction}

1. Caso contenha código HTML, remova as tags HTML, anúncios, barras de navegação ou cabeçalhos desnecessários e extraia apenas o texto principal limpo e formatado em parágrafos de leitura.
2. Defina um título apropriado para a lição.
3. Traduza o texto completo extraído para o Português.
4. Gere exatamente 6 itens de vocabulário importante presente no texto (com palavras em ${language}, tradução, frase de exemplo no idioma e tradução da frase de exemplo).
5. Gere exatamente 5 perguntas de múltipla escolha no idioma de estudo sobre o texto, com opções de resposta, índice correto (0 a 3) e explicações curtas em Português.
6. Gere exatamente 1 tema de redação discursiva (writingPrompt) em ${language} relacionado ao tema.
7. Gere exatamente 3 frases curtas tiradas do texto para ditado (dictationPhrases).
8. Gere exatamente 3 frases médias tiradas do texto para treino de fala (speakingPhrases).

Foco de Nível: ${levelInfo.text}
Foco do Objetivo de Estudo: ${goalAdaptation || 'Geral'}
Adaptação do Aluno: dê ênfase especial e maior nível de detalhe nas atividades voltadas para a habilidade "${weakestSkill}" onde o aluno tem mais dificuldade de aprendizado.

Você deve responder APENAS com um objeto JSON válido (sem markdown, sem blocos de código com a palavra json). O JSON deve seguir exatamente a seguinte estrutura:
{
  "title": "Título do artigo",
  "text": "O texto principal extraído em ${language} (na íntegra ou resumido de acordo com a INSTRUÇÃO DE TAMANHO)",
  "translation": "Tradução completa para o Português",
  "interlinear": [
    "Yesterday,|Ontem, I|eu decided|decidi to_work|trabalhar from|de a|uma local|local coffee_shop.|cafeteria."
  ],
  "vocabulary": [
    { "word": "palavra", "translation": "tradução", "example": "exemplo", "exampleTranslation": "tradução do exemplo", "tip": "dica curta de memorização em Português" }
  ],
  "questions": [
    { "question": "pergunta", "options": ["Opção A", "Opção B", "Opção C", "Opção D"], "correctAnswerIndex": 0, "explanation": "explicação", "hint": "dica curta em Português, sem entregar a resposta" }
  ],
  "writingPrompt": "tema da redação",
  "dictationPhrases": ["frase 1", "frase 2", "frase 3"],
  "speakingPhrases": ["frase 1", "frase 2", "frase 3"]
}

O campo "interlinear" deve ser um array de strings. Cada string representa uma frase completa correspondente do "text" original. Cada palavra ou expressão dessa frase deve ser mapeada para sua tradução em Português no formato "PalavraOriginal|Tradução" (separadas por espaços). Exemplo: "Yesterday,|Ontem, I|eu decided|decidi to_work|trabalhar".
IMPORTANTE: Se a tradução inverter a ordem das palavras (como adjetivo + substantivo em inglês que vira substantivo + adjetivo em português, ex: "professional sports" -> "esportes profissionais", ou "hot coffee" -> "café quente"), ou se formarem uma expressão ou termo composto, você DEVE agrupá-las como um único token unindo as palavras por sublinhado (underscore), ex: "professional_sports|esportes_profissionais", "hot_coffee|café_quente", "coffee_shop|cafeteria" ou "to_work|trabalhar". As pontuações devem ficar coladas na última palavra do bloco original (ex: "Yesterday,|Ontem,").
${hintTipInstruction}

Certifique-se de que o JSON é válido, parseável e não contém blocos de markdown ou crases no início ou fim.`
  }

  contents.push(prompt)

  const responseText = await generateContent(contents, LESSON_GENERATION_CONFIG)
  const parsed = safeJsonParse(responseText)
  const missing = validateLessonShape(parsed)
  if (missing.length > 0) {
    throw new Error(`A IA retornou uma lição incompleta (faltando: ${missing.join(', ')}). Tente importar novamente.`)
  }
  return parsed
}


export const evaluateWriting = async (language, topic, userResponse) => {
  if (!hasGeminiAccess()) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    return {
      grade: "Bom",
      corrections: [
        { original: "I ordered a coffee hot", correction: "I ordered a hot coffee", explanation: "Em inglês, os adjetivos geralmente vêm antes dos substantivos." }
      ],
      betterVersion: "Yesterday, I went to a coffee shop and ordered a hot coffee. The atmosphere was very nice.",
      explanation: "Parabéns por praticar a escrita! Sua estrutura geral está compreensível, mas atente-se à ordem dos adjetivos."
    }
  }

  try {
    const prompt = `Você é um tutor de idiomas especialista.
Avalie a seguinte resposta escrita por um aluno praticando ${language}.
O tema ou tópico do texto estudado era: "${topic}".
A resposta do aluno foi:
"${userResponse}"

Analise a gramática, ortografia, escolha de palavras e naturalidade. Responda APENAS com um objeto JSON válido (sem crases de markdown, sem prefixos, contendo exatamente os seguintes campos):
{
  "grade": "Uma avaliação curta (ex: Excelente, Muito Bom, Bom, Regular, Precisa Melhorar)",
  "corrections": [
    {
      "original": "Trecho original com erro ou pouca naturalidade",
      "correction": "Trecho corrigido no idioma",
      "explanation": "Explicação curta do erro e regra em Português"
    }
  ],
  "betterVersion": "Uma versão reescrita, fluida e totalmente natural do texto do aluno",
  "explanation": "Comentários gerais de encorajamento e dicas específicas em Português para o aluno melhorar"
}
Caso o texto não contenha erros e seja perfeitamente natural, retorne a lista de corrections vazia.`

    const text = await generateContent(prompt)
    return safeJsonParse(text)
  } catch (e) {
    console.error('Error evaluating writing:', e)
    return {
      grade: "Aviso",
      corrections: [],
      betterVersion: userResponse,
      explanation: "Não foi possível conectar com o Gemini para corrigir o texto: " + e.message
    }
  }
}

export const evaluatePronunciation = async (language, targetText, audioBase64, audioMimeType) => {
  if (!hasGeminiAccess()) {
    throw new Error('Supabase não está configurado nas Configurações — necessário para usar a IA.')
  }

  const prompt = `Você é um avaliador de pronúncia nativo de ${language}.
O aluno tentou ler a seguinte frase em voz alta: "${targetText}"

Ouça o áudio em anexo e responda APENAS com um objeto JSON válido (sem tags markdown de bloco de código). O JSON deve conter:
{
  "transcript": "A transcrição exata e literal do que você conseguiu ouvir o aluno dizendo no áudio.",
  "score": Um número de 0 a 100 indicando a precisão da pronúncia (penalize erros graves ou palavras não ditas, mas seja tolerante com sotaques leves),
  "feedback": "Um feedback bem curto (1 frase) sobre o que ele errou ou elogio se foi perfeito."
}`

  try {
    // Forçamos o uso do Gemini 3.1 Flash Lite especificamente para avaliação de áudio,
    // pois a cota gratuita oferece 500 requisições/dia, diferente do Flash normal (apenas 20).
    const text = await callGeminiProxy({
      model: 'gemini-3.1-flash-lite',
      parts: [
        { text: prompt },
        { inlineData: { data: audioBase64, mimeType: audioMimeType } }
      ]
    })
    return safeJsonParse(text)
  } catch (e) {
    console.error('Erro no evaluatePronunciation:', e)
    throw new Error('Falha ao avaliar a pronúncia pelo Gemini.')
  }
}
