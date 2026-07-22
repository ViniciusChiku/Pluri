// Extracts and parses a JSON object out of an LLM text response that may be
// wrapped in prose, reasoning, or markdown fences. Pure JS (no browser or
// Node-only APIs) so it can be shared between the client bundle
// (src/services/gemini.js) and the standalone cron script
// (scripts/fetchDailyNews.js).
export function safeJsonParse(text) {
  if (!text) {
    throw new Error('O conteúdo da resposta está vazio.')
  }

  const openBraceIndices = []
  let idx = text.indexOf('{')
  while (idx !== -1) {
    openBraceIndices.push(idx)
    idx = text.indexOf('{', idx + 1)
  }

  const closeBraceIndices = []
  let cIdx = text.indexOf('}')
  while (cIdx !== -1) {
    closeBraceIndices.push(cIdx)
    cIdx = text.indexOf('}', cIdx + 1)
  }

  // Build every valid (start, end) brace span and try the LARGEST ones first.
  // This matters because when the response gets cut off by an output token
  // limit before the outer JSON object closes, there's often still some
  // small nested object near the end that happens to close cleanly (e.g. a
  // single vocabulary item). Trying small spans first would return that
  // fragment as if it were the whole object. Preferring the largest valid
  // span makes sure we grab the full top-level object whenever it's actually
  // complete, and only fall back to a fragment if nothing bigger parses.
  const candidateSpans = []
  for (let i = 0; i < openBraceIndices.length; i++) {
    const start = openBraceIndices[i]
    for (let j = 0; j < closeBraceIndices.length; j++) {
      const end = closeBraceIndices[j]
      if (end > start) candidateSpans.push([start, end])
    }
  }
  candidateSpans.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))

  for (const [start, end] of candidateSpans) {
    const jsonCandidate = text.substring(start, end + 1)
    try {
      return JSON.parse(jsonCandidate)
    } catch (e) {
      // Keep trying smaller spans
    }
  }

  // Conventional markdown fallback
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned)
}
