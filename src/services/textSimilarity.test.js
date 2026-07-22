import { describe, it, expect } from 'vitest'
import { calculateSimilarity } from './textSimilarity'

describe('calculateSimilarity', () => {
  it('scores an exact match as 100', () => {
    expect(calculateSimilarity('the quick brown fox', 'the quick brown fox')).toBe(100)
  })

  it('scores completely different words as 0', () => {
    expect(calculateSimilarity('apple banana', 'zebra ocean')).toBe(0)
  })

  it('ignores case and punctuation differences', () => {
    expect(calculateSimilarity("The Quick, Brown Fox!", 'the quick brown fox')).toBe(100)
  })

  it('gives partial credit for a single-letter typo instead of zero', () => {
    const score = calculateSimilarity('the quick brown fox jumbs', 'the quick brown fox jumps')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('scores a plural/singular mismatch higher than a totally wrong word', () => {
    const pluralScore = calculateSimilarity('share prices', 'share price')
    const wrongWordScore = calculateSimilarity('share zebra', 'share price')
    expect(pluralScore).toBeGreaterThan(wrongWordScore)
  })

  it('matches the SpaceX dictation example better than the old exact-match algorithm', () => {
    const score = calculateSimilarity("SpaceX's share prices are droped", "SpaceX's share price has dropped.")
    // old exact-word-match algorithm scored this at 40
    expect(score).toBeGreaterThan(40)
  })

  it('penalizes missing words', () => {
    const score = calculateSimilarity('the quick fox', 'the quick brown fox')
    expect(score).toBeLessThan(100)
  })

  it('returns 0 for empty input against a non-empty target', () => {
    expect(calculateSimilarity('', 'the quick brown fox')).toBe(0)
  })
})
