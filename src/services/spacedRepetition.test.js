import { describe, it, expect } from 'vitest'
import { calculateNextReview, nextReviewDateString } from './spacedRepetition'

describe('calculateNextReview', () => {
  it('resets repetitions and interval to 1 day when the answer is wrong (quality 0)', () => {
    const result = calculateNextReview({ ease_factor: 2.5, repetitions: 3, interval_days: 10, qualityScore: 0 })
    expect(result).toEqual({ ease_factor: 2.3, repetitions: 0, interval_days: 1 })
  })

  it('never drops ease factor below the 1.3 floor on repeated failures', () => {
    const result = calculateNextReview({ ease_factor: 1.35, repetitions: 2, interval_days: 5, qualityScore: 0 })
    expect(result.ease_factor).toBe(1.3)
  })

  it('schedules a 1-day interval for the first successful repetition', () => {
    const result = calculateNextReview({ ease_factor: 2.5, repetitions: 0, interval_days: 1, qualityScore: 2 })
    expect(result).toEqual({ ease_factor: 2.5, repetitions: 1, interval_days: 1 })
  })

  it('schedules a 4-day interval for the second successful repetition', () => {
    const result = calculateNextReview({ ease_factor: 2.5, repetitions: 1, interval_days: 1, qualityScore: 2 })
    expect(result).toEqual({ ease_factor: 2.5, repetitions: 2, interval_days: 4 })
  })

  it('scales the previous interval by the ease factor from the third repetition onward', () => {
    const result = calculateNextReview({ ease_factor: 2.5, repetitions: 2, interval_days: 4, qualityScore: 2 })
    expect(result).toEqual({ ease_factor: 2.5, repetitions: 3, interval_days: 10 })
  })

  it('lowers the ease factor when the answer is difficult (quality 1)', () => {
    const result = calculateNextReview({ ease_factor: 2.5, repetitions: 2, interval_days: 4, qualityScore: 1 })
    expect(result.ease_factor).toBe(2.35)
  })

  it('raises the ease factor when the answer is easy (quality 3)', () => {
    const result = calculateNextReview({ ease_factor: 2.5, repetitions: 2, interval_days: 4, qualityScore: 3 })
    expect(result.ease_factor).toBe(2.65)
  })

  it('defaults ease_factor, repetitions and interval for a brand new card', () => {
    const result = calculateNextReview({ qualityScore: 2 })
    expect(result).toEqual({ ease_factor: 2.5, repetitions: 1, interval_days: 1 })
  })
})

describe('nextReviewDateString', () => {
  it('adds the interval in days to the given date, formatted as YYYY-MM-DD', () => {
    const from = new Date('2026-07-21T12:00:00Z')
    expect(nextReviewDateString(10, from)).toBe('2026-07-31')
  })
})
