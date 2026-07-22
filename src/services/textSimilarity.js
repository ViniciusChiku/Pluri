// Word Error Rate (WER) style scoring: aligns user words against target words
// with insertion/deletion/substitution costs, giving partial credit for
// near-miss substitutions (typos, plural/singular) instead of scoring them
// as a full miss like a plain exact-word-match would.

function cleanText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

function wordSubstitutionCost(userWord, targetWord) {
  if (userWord === targetWord) return 0
  const distance = levenshteinDistance(userWord, targetWord)
  const tolerance = Math.max(1, Math.floor(targetWord.length * 0.25))
  return distance <= tolerance ? 0.5 : 1
}

function wordEditCost(userWords, targetWords) {
  const n = targetWords.length
  const m = userWords.length
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i][0] = i
  for (let j = 0; j <= m; j++) dp[0][j] = j

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const subCost = wordSubstitutionCost(userWords[j - 1], targetWords[i - 1])
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + subCost)
    }
  }
  return dp[n][m]
}

export function calculateSimilarity(userText, targetText) {
  const targetWords = cleanText(targetText).split(' ').filter(Boolean)
  const userWords = cleanText(userText).split(' ').filter(Boolean)
  if (targetWords.length === 0) return userWords.length === 0 ? 100 : 0

  const cost = wordEditCost(userWords, targetWords)
  const score = (1 - cost / targetWords.length) * 100
  return Math.round(Math.max(0, score))
}
