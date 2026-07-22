import { describe, it, expect } from 'vitest'
import { getWeeklyStudyMinutes, calculateStreak, toLocalDateString, hasAnySessionOnDates, getDailyProgressByLanguage } from './studyMetrics'

// Wednesday, chosen as a stable mid-week reference so "this week" spans
// both earlier days in the same week and the following Sat/Sun.
const REFERENCE = new Date('2026-07-22T12:00:00')

describe('getWeeklyStudyMinutes', () => {
  it('sums only sessions within the current week', () => {
    const sessions = [
      { date_studied: '2026-07-19', duration_minutes: 30 }, // this week (Sun)
      { date_studied: '2026-07-22', duration_minutes: 45 }, // this week (Wed, today)
      { date_studied: '2026-07-15', duration_minutes: 100 }, // last week
    ]
    expect(getWeeklyStudyMinutes(sessions, REFERENCE)).toBe(75)
  })

  it('excludes sessions dated after the reference day', () => {
    const sessions = [
      { date_studied: '2026-07-25', duration_minutes: 60 }, // later this week, shouldn't count yet
    ]
    expect(getWeeklyStudyMinutes(sessions, REFERENCE)).toBe(0)
  })

  it('returns 0 for no sessions', () => {
    expect(getWeeklyStudyMinutes([], REFERENCE)).toBe(0)
  })
})

describe('toLocalDateString', () => {
  it('formats using the local calendar day, not the UTC day', () => {
    // 11pm local time on the 21st should stay the 21st locally, even though
    // toISOString() alone could roll it to the 22nd in UTC for positive offsets.
    const date = new Date(2026, 6, 21, 23, 0, 0)
    expect(toLocalDateString(date)).toBe('2026-07-21')
  })
})

describe('hasAnySessionOnDates', () => {
  it('is true when a session falls on one of the given dates, regardless of older history', () => {
    const sessions = [
      { date_studied: '2026-06-01' }, // old, unrelated week
      { date_studied: '2026-07-21' }
    ]
    expect(hasAnySessionOnDates(sessions, ['2026-07-19', '2026-07-20', '2026-07-21'])).toBe(true)
  })

  it('is false for a fresh week even if the user has past history', () => {
    const sessions = [{ date_studied: '2026-06-01' }]
    expect(hasAnySessionOnDates(sessions, ['2026-07-19', '2026-07-20', '2026-07-21'])).toBe(false)
  })

  it('is false with no sessions at all', () => {
    expect(hasAnySessionOnDates([], ['2026-07-19'])).toBe(false)
  })
})

describe('getDailyProgressByLanguage', () => {
  const languages = [
    { name: 'Inglês', target_weekly_minutes: 140 }, // 20 min/day goal
    { name: 'Espanhol', target_weekly_minutes: 0 } // no weekly goal set
  ]

  it('marks the goal as met once today\'s minutes reach the derived daily goal', () => {
    const sessions = [
      { language: 'Inglês', date_studied: '2026-07-22', duration_minutes: 25 },
      { language: 'Inglês', date_studied: '2026-07-21', duration_minutes: 100 } // yesterday, shouldn't count
    ]
    const result = getDailyProgressByLanguage(languages, sessions, REFERENCE)
    const ingles = result.find(r => r.name === 'Inglês')
    expect(ingles).toEqual({ name: 'Inglês', doneMinutes: 25, goalMinutes: 20, isMet: true })
  })

  it('marks the goal as not met when today\'s minutes fall short', () => {
    const sessions = [{ language: 'Inglês', date_studied: '2026-07-22', duration_minutes: 5 }]
    const result = getDailyProgressByLanguage(languages, sessions, REFERENCE)
    expect(result.find(r => r.name === 'Inglês')).toEqual({ name: 'Inglês', doneMinutes: 5, goalMinutes: 20, isMet: false })
  })

  it('reports 0 done minutes with no sessions today', () => {
    const result = getDailyProgressByLanguage(languages, [], REFERENCE)
    expect(result.find(r => r.name === 'Inglês').doneMinutes).toBe(0)
  })

  it('omits languages with no weekly target set', () => {
    const result = getDailyProgressByLanguage(languages, [], REFERENCE)
    expect(result.find(r => r.name === 'Espanhol')).toBeUndefined()
  })
})

describe('calculateStreak', () => {
  it('counts consecutive days ending today', () => {
    const sessions = [
      { date_studied: '2026-07-22' },
      { date_studied: '2026-07-21' },
      { date_studied: '2026-07-20' },
    ]
    expect(calculateStreak(sessions, REFERENCE)).toBe(3)
  })

  it('still counts the streak if today has no session yet but yesterday does', () => {
    const sessions = [
      { date_studied: '2026-07-21' },
      { date_studied: '2026-07-20' },
    ]
    expect(calculateStreak(sessions, REFERENCE)).toBe(2)
  })

  it('resets to 0 when the most recent session is older than yesterday', () => {
    const sessions = [{ date_studied: '2026-07-10' }]
    expect(calculateStreak(sessions, REFERENCE)).toBe(0)
  })

  it('breaks the streak on a gap', () => {
    const sessions = [
      { date_studied: '2026-07-22' },
      { date_studied: '2026-07-21' },
      { date_studied: '2026-07-18' },
    ]
    expect(calculateStreak(sessions, REFERENCE)).toBe(2)
  })
})
