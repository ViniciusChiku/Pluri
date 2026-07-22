// Function to generate the prompts adapting based on user's weak points

// Maps a CEFR level to a broader tier and gives the model concrete,
// actionable simplification rules for it. Before this, "level" was only
// mentioned in passing ("nível B1") with no real instruction on HOW to
// simplify — so beginner lessons weren't reliably easier, and the
// weakest-skill adaptation below used to always push MORE difficulty onto
// the student's weak skill regardless of how new they were to the language.
export const getLevelGuidance = (level) => {
  const lvl = (level || '').toUpperCase().trim()
  if (lvl === 'A1' || lvl === 'A2') {
    return {
      tier: 'iniciante',
      text: `NÍVEL INICIANTE (${lvl}): simplifique bastante. Use frases curtas com uma única ideia por frase, vocabulário de altíssima frequência, majoritariamente presente e passado simples, evite phrasal verbs, gírias, ironia e construções complexas (voz passiva, subjuntivo, orações subordinadas longas). Prefira reutilizar palavras já introduzidas em vez de sinônimos raros. O objetivo é dar confiança ao aluno, não testar os limites dele.`
    }
  }
  if (lvl === 'B1' || lvl === 'B2') {
    return {
      tier: 'intermediario',
      text: `NÍVEL INTERMEDIÁRIO (${lvl}): pode variar vocabulário e estruturas moderadamente, incluindo phrasal verbs e expressões comuns, mas evite jargão muito técnico ou raro sem contexto suficiente para o aluno inferir o significado.`
    }
  }
  return {
    tier: 'avancado',
    text: `NÍVEL AVANÇADO (${lvl}): pode usar vocabulário sofisticado, expressões idiomáticas, estruturas gramaticais complexas, ironia e nuances culturais livremente.`
  }
}

// Text shared by both prompt builders describing the new "hint" (questions)
// and "tip" (vocabulary) fields, and how their tone should scale with level.
export const buildHintTipInstruction = (tier) => {
  const hintStyle = tier === 'iniciante'
    ? 'Para nível iniciante, a dica deve ser bem direta: aponte o parágrafo ou a frase exata do texto onde está a resposta.'
    : tier === 'intermediario'
      ? 'Para nível intermediário, a dica pode apontar a região geral do texto ou o tipo de raciocínio necessário, sem citar a frase exata.'
      : 'Para nível avançado, a dica pode ser mais abstrata (ex: um lembrete conceitual), sem apontar diretamente o trecho do texto.'

  const tipStyle = tier === 'iniciante'
    ? 'Para nível iniciante, prefira dicas de cognatos com o português, associações de som, ou mnemônicos bem simples e visuais.'
    : 'A dica pode ser um mnemônico, uma raiz/etimologia útil, ou uma associação com outra palavra que o aluno provavelmente já conhece.'

  return `
Além dos campos já descritos, inclua:
- Em cada item de "questions", um campo "hint": uma dica curta em Português que ajuda o aluno a chegar na resposta SEM entregá-la, pensada para ser revelada opcionalmente ANTES de ele responder. ${hintStyle}
- Em cada item de "vocabulary", um campo "tip": uma dica curta em Português (uma frase) de como memorizar aquela palavra. ${tipStyle}`
}

export const buildLessonPrompt = (language, level, topic, competence, userSkills, primaryGoal = '', length = 'long') => {
  // Find weakest skill
  let weakestSkill = 'escrita';
  let minScore = 100;
  if (userSkills) {
    if (userSkills.reading < minScore) { minScore = userSkills.reading; weakestSkill = 'leitura'; }
    if (userSkills.listening < minScore) { minScore = userSkills.listening; weakestSkill = 'escuta'; }
    if (userSkills.writing < minScore) { minScore = userSkills.writing; weakestSkill = 'escrita'; }
    if (userSkills.speaking < minScore) { minScore = userSkills.speaking; weakestSkill = 'fala'; }
  }

  const levelInfo = getLevelGuidance(level)
  const isBeginner = levelInfo.tier === 'iniciante'

  // NOTE: this used to always push MORE difficulty onto the student's
  // weakest skill ("use complex phonemes", "challenging words to
  // pronounce"...) regardless of level. That's reasonable pedagogy for an
  // intermediate/advanced student, but actively counterproductive for a
  // true beginner (A1/A2) — someone who's new to the language needs more
  // support and repetition on their weak skill, not extra difficulty piled
  // on top of it. The branches below now split on level.
  let adaptationText = '';
  if (weakestSkill === 'leitura') {
    adaptationText = isBeginner
      ? 'O aluno tem dificuldade de compreensão leitora e está em nível iniciante. Escreva frases curtas e diretas, e crie perguntas que testem uma ideia por vez, sem pegadinhas.'
      : 'O aluno tem dificuldade de compreensão leitora. Escreva um texto rico porém com vocabulário muito bem estruturado e quizzes explicativos e profundos para exercitar a interpretação.';
  } else if (weakestSkill === 'escuta') {
    adaptationText = isBeginner
      ? 'O aluno tem dificuldade de compreensão auditiva (escuta) e está em nível iniciante. Gere frases de ditado curtas, com estrutura simples e vocabulário básico — o objetivo é construir confiança, não sobrecarregar.'
      : 'O aluno tem dificuldade de compreensão auditiva (escuta). Gere sentenças de ditado que usem fonemas e palavras de ligação complexas para ele exercitar a escrita ao ouvir.';
  } else if (weakestSkill === 'escrita') {
    adaptationText = isBeginner
      ? 'O aluno tem dificuldade de expressão escrita e está em nível iniciante. Crie um tema de redação (writingPrompt) bem simples e guiado, pedindo apenas 1-2 frases curtas, com uma pergunta objetiva.'
      : 'O aluno tem dificuldade de expressão escrita. Crie um tema de redação (writingPrompt) criativo, que exija respostas detalhadas, e dê dicas claras.';
  } else if (weakestSkill === 'fala') {
    adaptationText = isBeginner
      ? 'O aluno tem dificuldade de conversação/pronúncia (fala) e está em nível iniciante. Selecione frases de treino de pronúncia (speakingPhrases) curtas, com palavras comuns e fáceis de pronunciar, priorizando ritmo e clareza.'
      : 'O aluno tem dificuldade de conversação/pronúncia (fala). Selecione frases de treino de pronúncia (speakingPhrases) com palavras desafiadoras de pronunciar.';
  }

  let goalAdaptation = '';
  if (primaryGoal) {
    if (primaryGoal === 'Conversação') {
      goalAdaptation = 'O objetivo principal do aluno é Conversação (Falar/Ouvir). Foque em expressões cotidianas, gírias comuns, diálogos práticos, e gere frases de ditado (dictationPhrases) e pronúncia (speakingPhrases) com linguagem coloquial e focadas na oralidade.';
    } else if (primaryGoal === 'Viagem') {
      goalAdaptation = 'O objetivo principal do aluno é Viagem Prática. Priorize termos e situações do cotidiano de viagens, aeroportos, hotéis, restaurantes, compras e orientações básicas de direção.';
    } else if (primaryGoal === 'Acadêmico') {
      goalAdaptation = 'O objetivo principal do aluno é Leitura/Acadêmico. Foque em termos formais/acadêmicos, estruturas complexas e questões de interpretação crítica de texto.';
    } else if (primaryGoal === 'Profissional') {
      goalAdaptation = 'O objetivo principal do aluno é Carreira/Negócios. Use vocabulário corporativo, redação de e-mails de trabalho, expressões de reuniões e termos de apresentações profissionais comuns.';
    }
  }

  const lengthInstruction = length === 'short'
    ? `Gere um texto ou diálogo curto, simples e direto, com no máximo 2 a 3 parágrafos curtos em ${language} no campo "text".`
    : `Gere um texto ou diálogo detalhado, rico e longo, com no mínimo 8 a 12 parágrafos robustos em ${language} no campo "text".`;

  return `Você é um tutor de idiomas especialista em ensino adaptativo e personalizado.
Gere um conteúdo de estudos estruturado para um aluno estudando ${language} no nível ${level} (quadro comum europeu).
O tópico da lição é "${topic}" e a competência principal a ser trabalhada é "${competence}".

INSTRUÇÃO DE TAMANHO: ${lengthInstruction}

Complexidade do Texto: ${levelInfo.text}

Foco do Objetivo de Estudo: ${goalAdaptation || 'Geral'}
Adaptação do Aluno: ${adaptationText}

Você deve responder APENAS com um objeto JSON válido (sem markdown, sem prefixos, sem blocos de código com crases). O JSON deve seguir exatamente a seguinte estrutura:
{
  "title": "Título curto e chamativo da lição no idioma de estudo",
  "text": "O texto ou diálogo gerado de acordo com a INSTRUÇÃO DE TAMANHO",
  "translation": "Tradução completa do texto para o Português",
  "interlinear": [
    "Yesterday,|Ontem, I|eu decided|decidi to_work|trabalhar from|de a|uma local|local coffee_shop.|cafeteria."
  ],
  "vocabulary": [
    {
      "word": "Palavra ou expressão importante em ${language}",
      "translation": "Significado em Português",
      "example": "Uma frase de exemplo em ${language} usando a palavra",
      "exampleTranslation": "Tradução da frase de exemplo em Português",
      "tip": "Uma dica curta em Português para memorizar a palavra"
    }
  ],
  "questions": [
    {
      "question": "Pergunta de interpretação ou gramática em ${language} sobre o texto",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctAnswerIndex": 0,
      "explanation": "Explicação curta em Português do porquê esta opção está correta",
      "hint": "Uma dica curta em Português para ajudar o aluno a responder, sem entregar a resposta"
    }
  ],
  "writingPrompt": "Uma pergunta discursiva e aberta em ${language} baseada no texto que peça para o aluno escrever uma pequena redação ou resposta de 1 a 3 frases no idioma de estudo.",
  "dictationPhrases": [
    "Uma frase curta extraída do texto criada para ditado auditivo",
    "Segunda frase curta extraída do texto criada para ditado auditivo",
    "Terceira frase curta extraída do texto criada para ditado auditivo"
  ],
  "speakingPhrases": [
    "Frase 1 extraída do texto de tamanho médio para treinar pronúncia oral",
    "Frase 2 extraída do texto de tamanho médio para treinar pronúncia oral",
    "Frase 3 extraída do texto de tamanho médio para treinar pronúncia oral"
  ]
}

O campo "interlinear" deve ser um array de strings. Cada string representa uma frase completa correspondente do "text" original. Cada palavra ou expressão dessa frase deve ser mapeada para sua tradução em Português no formato "PalavraOriginal|Tradução" (separadas por espaços). Exemplo: "Yesterday,|Ontem, I|eu decided|decidi to_work|trabalhar".
IMPORTANTE: Se a tradução inverter a ordem das palavras (como adjetivo + substantivo em inglês que vira substantivo + adjetivo em português, ex: "professional sports" -> "esportes profissionais", ou "hot coffee" -> "café quente"), ou se formarem uma expressão ou termo composto, você DEVE agrupá-las como um único token unindo as palavras por sublinhado (underscore), ex: "professional_sports|esportes_profissionais", "hot_coffee|café_quente", "coffee_shop|cafeteria" ou "to_work|trabalhar". As pontuações devem ficar coladas na última palavra do bloco original (ex: "Yesterday,|Ontem,").
${buildHintTipInstruction(levelInfo.tier)}

Gere exatamente 6 itens de vocabulário, 5 perguntas de múltipla escolha, 1 tema de escrita discursiva, 3 frases de ditado e 3 frases de fala. Certifique-se de que o JSON é válido e parseável.`
}

export const buildCustomTextAnalysisPrompt = (language, text, userSkills, primaryGoal = '', level = 'B1', length = 'long') => {
  let weakestSkill = 'escrita';
  let minScore = 100;
  if (userSkills) {
    if (userSkills.reading < minScore) { minScore = userSkills.reading; weakestSkill = 'leitura'; }
    if (userSkills.listening < minScore) { minScore = userSkills.listening; weakestSkill = 'escuta'; }
    if (userSkills.writing < minScore) { minScore = userSkills.writing; weakestSkill = 'escrita'; }
    if (userSkills.speaking < minScore) { minScore = userSkills.speaking; weakestSkill = 'fala'; }
  }

  const levelInfo = getLevelGuidance(level)

  let goalAdaptation = '';
  if (primaryGoal) {
    if (primaryGoal === 'Conversação') {
      goalAdaptation = 'O objetivo principal do aluno é Conversação (Falar/Ouvir). Foque em expressões cotidianas, gírias comuns, diálogos práticos, e gere frases de ditado (dictationPhrases) e conversação (speakingPhrases) voltadas para a oralidade e conversas reais.';
    } else if (primaryGoal === 'Viagem') {
      goalAdaptation = 'O objetivo principal do aluno é Viagem Prática. Priorize situações cotidianas de viagens, termos úteis para aeroportos, hotéis, restaurantes, compras, orientações de direção e expresiones de viaje.';
    } else if (primaryGoal === 'Acadêmico') {
      goalAdaptation = 'O objetivo principal do aluno é Leitura/Acadêmico. Foque em termos formais/acadêmicos, estruturas gramaticais complexas e interpretação crítica.';
    } else if (primaryGoal === 'Profissional') {
      goalAdaptation = 'O objetivo principal do aluno é Carreira/Negócios (Profissional). Use vocabulário corporativo, redação de e-mails de trabalho, expressões de reuniões e apresentações profissionais.';
    }
  }

  const lengthInstruction = length === 'short'
    ? `ATENÇÃO: Você deve encurtar/resumir o texto original fornecido para uma versão condensada, didática e simplificada de 2 a 3 parágrafos curtos em ${language}, adequada para o nível de proficiência ${level}. Use esta versão encurtada como o valor do campo "text" no JSON retornado. Todas as perguntas de quiz, vocabulário e exercícios devem ser baseados EXCLUSIVAMENTE nesta versão encurtada.`
    : `Use o texto completo fornecido originalmente na íntegra como o valor do campo "text" no JSON retornado. Não o resuma ou abrevie. (O texto original é uma notícia real e não deve ter sua dificuldade linguística alterada — em vez disso, use os campos de vocabulário, dicas e explicações para tornar esse texto real mais acessível ao nível do aluno.)`;

  return `Você é um tutor de idiomas especialista em ensino personalizado.
Analise o seguinte texto em ${language} para criar uma lição de estudos (focando no nível de dificuldade/proficiência ${level}):

"${text}"

INSTRUÇÃO DE TAMANHO: ${lengthInstruction}

Complexidade-Alvo do Aluno: ${levelInfo.text}

Foco do Objetivo de Estudo: ${goalAdaptation || 'Geral'}
Adaptação de Dificuldade: Foque mais nas atividades da habilidade "${weakestSkill}" onde o aluno tem mais dificuldade de aprendizado.

Você deve responder APENAS com um objeto JSON válido (sem markdown, sem prefixos, sem blocos de código com crases). O JSON deve seguir exatamente a seguinte estrutura:
{
  "title": "Um título adequado em ${language} para este artigo",
  "text": "O texto (na íntegra ou resumido didaticamente conforme a INSTRUÇÃO DE TAMANHO)",
  "translation": "Tradução completa do texto para o Português",
  "interlinear": [
    "Yesterday,|Ontem, I|eu decided|decidi to_work|trabalhar from|de a|uma local|local coffee_shop.|cafeteria."
  ],
  "vocabulary": [
    {
      "word": "Palavra ou expressão importante presente no texto em ${language}",
      "translation": "Significado em Português",
      "example": "Uma frase de exemplo em ${language} tirada do texto ou criada usando a palavra",
      "exampleTranslation": "Tradução da frase de exemplo em Português",
      "tip": "Uma dica curta em Português para memorizar a palavra"
    }
  ],
  "questions": [
    {
      "question": "Pergunta de interpretação ou gramática em ${language} sobre o texto",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctAnswerIndex": 0,
      "explanation": "Explicação curta em Português do porquê esta opção está correta",
      "hint": "Uma dica curta em Português para ajudar o aluno a responder, sem entregar a resposta"
    }
  ],
  "writingPrompt": "Uma pergunta aberta e discursiva em ${language} baseada nas ideias do texto para o aluno responder por escrito (1 a 3 frases).",
  "dictationPhrases": [
    "Frase curta 1 extraída literalmente do texto",
    "Frase curta 2 extraída literalmente do texto",
    "Frase curta 3 extraída literalmente do texto"
  ],
  "speakingPhrases": [
    "Frase média 1 extraída do texto para praticar pronúncia oral",
    "Frase média 2 extraída do texto para praticar pronúncia oral",
    "Frase média 3 extraída do texto para praticar pronúncia oral"
  ]
}

O campo "interlinear" deve ser um array de strings. Cada string representa uma frase completa correspondente do "text" original. Cada palavra ou expressão dessa frase deve ser mapeada para sua tradução em Português no formato "PalavraOriginal|Tradução" (separadas por espaços). Exemplo: "Yesterday,|Ontem, I|eu decided|decidi to_work|trabalhar".
IMPORTANTE: Se a tradução inverter a ordem das palavras (como adjetivo + substantivo em inglês que vira substantivo + adjetivo em português, ex: "professional sports" -> "esportes profissionais", ou "hot coffee" -> "café quente"), ou se formarem uma expressão ou termo composto, você DEVE agrupá-las como um único token unindo as palavras por sublinhado (underscore), ex: "professional_sports|esportes_profissionais", "hot_coffee|café_quente", "coffee_shop|cafeteria" ou "to_work|trabalhar". As pontuações devem ficar coladas na última palavra do bloco original (ex: "Yesterday,|Ontem,").
${buildHintTipInstruction(levelInfo.tier)}

Gere exatamente 6 itens de vocabulário, 5 perguntas de múltipla escolha, 1 tema de escrita, 3 frases de ditado e 3 frases de fala.
Foque mais nas atividades da habilidade "${weakestSkill}" onde o aluno tem mais dificuldade de aprendizado. Certifique-se de que o JSON é válido e parseável.`
}
