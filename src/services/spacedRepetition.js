// SuperMemo SM-2 spaced repetition algorithm.
// qualityScore: 0 = Errei, 1 = Difícil, 2 = Bom, 3 = Fácil

export function calculateNextReview(card) {
  const previousEaseFactor = card.ease_factor || 2.5
  const previousRepetitions = card.repetitions || 0
  const previousInterval = card.interval_days || 1

  return applyReview(previousEaseFactor, previousRepetitions, previousInterval, card.qualityScore)
}

function applyReview(easeFactor, repetitions, previousInterval, qualityScore) {
  if (qualityScore === 0) {
    return {
      ease_factor: Math.max(1.3, easeFactor - 0.2),
      repetitions: 0,
      interval_days: 1
    }
  }

  let interval
  if (repetitions === 0) {
    interval = 1
  } else if (repetitions === 1) {
    interval = 4
  } else {
    interval = Math.round(previousInterval * easeFactor)
  }

  let nextEaseFactor = easeFactor
  if (qualityScore === 1) nextEaseFactor = Math.max(1.3, easeFactor - 0.15)
  if (qualityScore === 3) nextEaseFactor = easeFactor + 0.15

  return {
    ease_factor: nextEaseFactor,
    repetitions: repetitions + 1,
    interval_days: interval
  }
}

// Actual interval each answer button would produce for this card right now,
// so the UI can show real numbers instead of guessed/hardcoded ranges.
export function previewIntervals(card) {
  return {
    1: calculateNextReview({ ...card, qualityScore: 1 }).interval_days,
    2: calculateNextReview({ ...card, qualityScore: 2 }).interval_days,
    3: calculateNextReview({ ...card, qualityScore: 3 }).interval_days
  }
}

export function nextReviewDateString(intervalDays, fromDate = new Date()) {
  const nextReviewDate = new Date(fromDate)
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays)
  return nextReviewDate.toISOString().split('T')[0]
}
