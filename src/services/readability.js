// Heuristic syllable counter for Spanish and English
const countSyllables = (word, language) => {
  word = word.toLowerCase().trim();
  if (word.length <= 2) return 1;

  if (language === 'Inglês') {
    // English syllable heuristic
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, ''); // remove silent e, es, ed
    word = word.replace(/^y/, ''); // ignore starting y as vowel
    const vowelGroups = word.match(/[aeiouy]{1,2}/g);
    return vowelGroups ? vowelGroups.length : 1;
  } else {
    // Spanish syllable heuristic
    // Diphthongs and triphthongs are counted as one.
    const vowelGroups = word.match(/[aeiouáéíóúü]{1,3}/g);
    return vowelGroups ? vowelGroups.length : 1;
  }
};

export const calculateReadability = (text, language) => {
  if (!text || text.trim() === '') {
    return { score: 100, level: 'A1', label: 'Muito Fácil' };
  }

  // Count sentences
  const sentences = text.split(/[.!?]+(?=\s|$)/).filter(s => s.trim().length > 0);
  const totalSentences = Math.max(1, sentences.length);

  // Clean and split words
  const words = text
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.trim().length > 0);
  const totalWords = Math.max(1, words.length);

  // Count syllables
  let totalSyllables = 0;
  words.forEach(word => {
    totalSyllables += countSyllables(word, language);
  });

  // Calculate scores
  let score = 70; // default
  let estimatedLevel = 'B1';
  let label = 'Intermediário';

  const wordsPerSentence = totalWords / totalSentences;
  const syllablesPerWord = totalSyllables / totalWords;

  if (language === 'Inglês') {
    // Flesch Reading Ease
    score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Map Flesch Score to CEFR
    if (score >= 90) {
      estimatedLevel = 'A1';
      label = 'Iniciante (Muito Fácil)';
    } else if (score >= 80) {
      estimatedLevel = 'A2';
      label = 'Básico (Fácil)';
    } else if (score >= 70) {
      estimatedLevel = 'B1';
      label = 'Intermediário (Médio)';
    } else if (score >= 50) {
      estimatedLevel = 'B2';
      label = 'Intermediário Alto (Moderado)';
    } else if (score >= 30) {
      estimatedLevel = 'C1';
      label = 'Avançado (Difícil)';
    } else {
      estimatedLevel = 'C2';
      label = 'Proficiente / Nativo (Muito Difícil)';
    }
  } else {
    // Flesch-Szigriszt (Spanish / general Romance readability)
    score = 206.84 - 62.3 * syllablesPerWord - wordsPerSentence;
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Map to CEFR
    if (score >= 85) {
      estimatedLevel = 'A1';
      label = 'Iniciante (Muy Fácil)';
    } else if (score >= 75) {
      estimatedLevel = 'A2';
      label = 'Básico (Fácil)';
    } else if (score >= 65) {
      estimatedLevel = 'B1';
      label = 'Intermediario (Medio)';
    } else if (score >= 50) {
      estimatedLevel = 'B2';
      label = 'Intermediario Alto (Moderado)';
    } else if (score >= 35) {
      estimatedLevel = 'C1';
      label = 'Avanzado (Difícil)';
    } else {
      estimatedLevel = 'C2';
      label = 'Nativo (Muy Difícil)';
    }
  }

  return {
    score,
    level: estimatedLevel,
    label,
    metrics: {
      sentences: totalSentences,
      words: totalWords,
      syllables: totalSyllables,
      wordsPerSentence: Math.round(wordsPerSentence * 10) / 10,
      syllablesPerWord: Math.round(syllablesPerWord * 100) / 100
    }
  };
};
