import { describe, it, expect, beforeAll } from 'vitest'

// supabase.js reads localStorage at import time (getSupabaseConfig), so the
// shim must exist before the module is imported. Since VITE_SUPABASE_URL is
// unset in tests, isSupabaseEnabled() stays false and every call below
// exercises the localStorage-backed mockDb fallback path deterministically.
let saveStudySession, getStudySessions, saveLanguage, getLanguages, emitSyncFallback, subscribeToSyncFallback

beforeAll(async () => {
  const store = {}
  global.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] }
  }
  // supabase.js dispatches sync-fallback notifications on `window`; the test
  // runner uses the node environment, so shim it with a real EventTarget.
  if (typeof global.window === 'undefined') {
    global.window = new EventTarget()
  }
  const mod = await import('./supabase')
  saveStudySession = mod.saveStudySession
  getStudySessions = mod.getStudySessions
  saveLanguage = mod.saveLanguage
  getLanguages = mod.getLanguages
  emitSyncFallback = mod.emitSyncFallback
  subscribeToSyncFallback = mod.subscribeToSyncFallback
})

describe('saveStudySession', () => {
  it('keeps the originally scheduled date when completing a session without passing date_studied', async () => {
    const profileId = 'profile-keep-date'
    const created = await saveStudySession(
      { date_studied: '2026-07-24', language: 'Inglês', competence: 'Leitura', duration_minutes: 30, completed: false },
      profileId
    )

    const completed = await saveStudySession(
      { id: created.id, language: 'Inglês', competence: 'Leitura', duration_minutes: 12, completed: true },
      profileId
    )

    expect(completed.date_studied).toBe('2026-07-24')
    const all = await getStudySessions(profileId)
    expect(all.find(s => s.id === created.id).date_studied).toBe('2026-07-24')
  })

  it('defaults to today when creating a brand new session with no date given', async () => {
    const profileId = 'profile-new-session'
    const today = new Date().toISOString().split('T')[0]
    const created = await saveStudySession(
      { language: 'Inglês', competence: 'Leitura', duration_minutes: 10, completed: false },
      profileId
    )
    expect(created.date_studied).toBe(today)
  })

  it('respects an explicitly provided date_studied even when updating an existing session', async () => {
    const profileId = 'profile-explicit-date'
    const created = await saveStudySession(
      { date_studied: '2026-07-24', language: 'Inglês', competence: 'Leitura', duration_minutes: 30, completed: false },
      profileId
    )

    const rescheduled = await saveStudySession(
      { id: created.id, date_studied: '2026-07-25', language: 'Inglês', competence: 'Leitura', completed: false },
      profileId
    )

    expect(rescheduled.date_studied).toBe('2026-07-25')
  })
})

describe('saveLanguage', () => {
  it('does not delete another profile\'s language with the same name', async () => {
    await saveLanguage({ name: 'Inglês', target_weekly_minutes: 120, primary_goal: 'Viagem', current_level: 'A1' }, 'profile-A')
    await saveLanguage({ name: 'Inglês', target_weekly_minutes: 300, primary_goal: 'Conversação', current_level: 'B2' }, 'profile-B')

    const langsA = await getLanguages('profile-A')
    const langsB = await getLanguages('profile-B')

    expect(langsA.find(l => l.name === 'Inglês')?.target_weekly_minutes).toBe(120)
    expect(langsB.find(l => l.name === 'Inglês')?.target_weekly_minutes).toBe(300)
  })
})

describe('sync fallback notifications', () => {
  it('notifies subscribers with the failing context and error message', () => {
    const received = []
    const unsubscribe = subscribeToSyncFallback((event) => received.push(event.detail))

    emitSyncFallback('getFlashcards', new Error('Supabase request timeout'))
    unsubscribe()

    expect(received).toEqual([{ context: 'getFlashcards', message: 'Supabase request timeout' }])
  })

  it('stops notifying a subscriber after it unsubscribes', () => {
    const received = []
    const unsubscribe = subscribeToSyncFallback((event) => received.push(event.detail))
    unsubscribe()

    emitSyncFallback('getLanguages', new Error('boom'))

    expect(received).toEqual([])
  })
})
