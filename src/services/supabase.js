import { createClient } from '@supabase/supabase-js'

// Simple Helper to fetch configuration from localStorage
export const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('planner_supabase_url') || ''
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('planner_supabase_anon_key') || ''
  return { url, key }
}

let supabaseInstance = null

export const initSupabase = () => {
  const { url, key } = getSupabaseConfig()
  if (url && key) {
    try {
      supabaseInstance = createClient(url, key)
      return true
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e)
      supabaseInstance = null
    }
  } else {
    supabaseInstance = null
  }
  return false
}

// Initialize on load
initSupabase()

// Helper: check if we are using live Supabase
export const isSupabaseEnabled = () => {
  return supabaseInstance !== null
}

// Exposes the raw client for callers that need Supabase features beyond the
// CRUD helpers below (e.g. Edge Functions via supabase.functions.invoke).
export const getSupabaseClient = () => supabaseInstance

// Fallback Mock database using LocalStorage
const mockDb = {
  get: (key, defaultValue = []) => {
    try {
      const data = localStorage.getItem(`planner_db_${key}`)
      return data ? JSON.parse(data) : defaultValue
    } catch (e) {
      console.error('Error reading localStorage:', e)
      return defaultValue
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`planner_db_${key}`, JSON.stringify(value))
    } catch (e) {
      console.error('Error writing localStorage:', e)
    }
  }
}

// Profiles management (retrieved from active session)
export const getActiveProfileId = () => {
  return localStorage.getItem('planner_active_profile_id') || null
}

export const setActiveProfileId = (id) => {
  if (id) {
    localStorage.setItem('planner_active_profile_id', id)
  } else {
    localStorage.removeItem('planner_active_profile_id')
  }
}

// --- USER AUTHENTICATION ---

export const signUpUser = async (email, password, name) => {
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabaseInstance.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name
          }
        }
      })
      if (error) throw error
      return { user: data.user, error: null }
    } catch (e) {
      return { user: null, error: e.message }
    }
  } else {
    // LocalStorage fallback database
    const users = mockDb.get('local_users', [])
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { user: null, error: 'Este e-mail já está cadastrado.' }
    }
    const newUser = {
      id: Math.random().toString(36).substring(2, 9),
      email: email.toLowerCase(),
      password, // Plain text for local fallback convenience
      name,
      avatar: name.substring(0, 2).toUpperCase()
    }
    users.push(newUser)
    mockDb.set('local_users', users)
    return { user: newUser, error: null }
  }
}

export const signInUser = async (email, password) => {
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabaseInstance.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      localStorage.setItem('planner_active_profile_id', data.user.id)
      return { user: data.user, error: null }
    } catch (e) {
      return { user: null, error: e.message }
    }
  } else {
    // LocalStorage fallback database
    const users = mockDb.get('local_users', [])
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (!user) {
      return { user: null, error: 'E-mail ou senha incorretos.' }
    }
    localStorage.setItem('planner_active_profile_id', user.id)
    localStorage.setItem('planner_local_session', JSON.stringify(user))
    return { user, error: null }
  }
}

export const signOutUser = async () => {
  if (isSupabaseEnabled()) {
    try {
      await supabaseInstance.auth.signOut()
    } catch (e) {
      console.error('Supabase signOut error:', e)
    }
  }
  localStorage.removeItem('planner_active_profile_id')
  localStorage.removeItem('planner_local_session')
}

const withTimeout = (promise, ms = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase request timeout')), ms))
  ])
}

// Notifies the UI when a read/write silently fell back to local/mock data
// (Supabase error or timeout) so screens can warn the user instead of
// rendering incomplete data as if it were the source of truth.
const SYNC_FALLBACK_EVENT = 'supabase-sync-fallback'

export const emitSyncFallback = (context, error) => {
  console.warn('Supabase/local fallback error:', error?.message || error)
  window.dispatchEvent(new CustomEvent(SYNC_FALLBACK_EVENT, {
    detail: { context, message: error?.message || String(error) }
  }))
}

export const subscribeToSyncFallback = (callback) => {
  window.addEventListener(SYNC_FALLBACK_EVENT, callback)
  return () => window.removeEventListener(SYNC_FALLBACK_EVENT, callback)
}

export const getCurrentUser = async () => {
  if (isSupabaseEnabled()) {
    try {
      const { data: { user }, error } = await withTimeout(supabaseInstance.auth.getUser())
      if (user && !error) {
        return {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.display_name || user.email.split('@')[0],
          avatar: (user.user_metadata?.display_name || user.email).substring(0, 2).toUpperCase()
        }
      }
    } catch (e) { emitSyncFallback('getCurrentUser', e) }
  }
  // Local fallback
  const sessionRaw = localStorage.getItem('planner_local_session')
  if (sessionRaw) {
    try {
      return JSON.parse(sessionRaw)
    } catch (e) { console.warn('Supabase/local fallback error:', e?.message || e) }
  }
  return null
}

// ==========================================
// UNIFIED DATA OPERATIONS (Supabase / LocalStorage)
// ==========================================

// --- 1. LANGUAGE PROFILES ---
export const getLanguages = async (profileId) => {
  const activeProfile = profileId || getActiveProfileId()
  let list = []
  let usedSupabase = false
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await withTimeout(
        supabaseInstance
          .from('language_profiles')
          .select('*')
          .eq('profile_id', activeProfile)
      )
      if (!error && data) {
        list = data
        usedSupabase = true
      }
    } catch (e) { emitSyncFallback('getLanguages', e) }
  }
  if (!usedSupabase || list.length === 0) {
    const all = mockDb.get('languages', [
      { id: '1', name: 'Inglês', target_weekly_minutes: 300, primary_goal: 'Conversação', current_level: 'A2' },
      { id: '2', name: 'Espanhol', target_weekly_minutes: 180, primary_goal: 'Viagem', current_level: 'B1' }
    ])
    list = all.filter(l => l.profile_id === activeProfile || (!l.profile_id && activeProfile === '1'))
  }

  // Deduplicate entries by language name to prevent duplicate level profiles
  const map = new Map()
  list.forEach(item => {
    if (!item.name) return
    const key = item.name.toLowerCase()
    if (!map.has(key)) {
      map.set(key, item)
    } else {
      map.set(key, { ...map.get(key), ...item })
    }
  })
  return Array.from(map.values())
}

export const saveLanguage = async (languageData, profileId) => {
  const activeProfile = profileId || getActiveProfileId()
  const allExisting = mockDb.get('languages', [])
  const existing = allExisting.find(l =>
    l.profile_id === activeProfile && (
      (languageData.id && l.id === languageData.id) ||
      (l.name && l.name.toLowerCase() === (languageData.name || '').toLowerCase())
    )
  )

  const payload = {
    ...(existing || {}),
    ...languageData,
    profile_id: activeProfile,
    id: languageData.id || (existing ? existing.id : Math.random().toString(36).substring(2, 9)),
    updated_at: new Date().toISOString()
  }

  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabaseInstance
        .from('language_profiles')
        .upsert(payload)
        .select()
      if (!error && data && data.length > 0) return data[0]
    } catch (e) { emitSyncFallback('saveLanguage', e) }
  }

  // Fallback in mockDb: remove duplicates for same language name, scoped to
  // this profile only — other profiles' rows must never be touched here.
  const filtered = allExisting.filter(l =>
    l.profile_id !== activeProfile || (l.id !== payload.id && l.name?.toLowerCase() !== payload.name?.toLowerCase())
  )
  filtered.push(payload)
  mockDb.set('languages', filtered)
  return payload
}

// --- 2. STUDY SESSIONS (Calendar entries) ---
export const getStudySessions = async (profileId) => {
  const activeProfile = profileId || getActiveProfileId()
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await withTimeout(
        supabaseInstance
          .from('study_sessions')
          .select('*')
          .eq('profile_id', activeProfile)
      )
      if (!error && data) return data
    } catch (e) { emitSyncFallback('getStudySessions', e) }
  }
  // Fallback to local storage if offline or error
  const all = mockDb.get('study_sessions', [])
  return all.filter(s => s.profile_id === activeProfile)
}

export const saveStudySession = async (sessionData, profileId) => {
  const activeProfile = profileId || getActiveProfileId()

  // When completing/updating an existing session without an explicit
  // date_studied (e.g. logging results after finishing a lesson), keep the
  // date it was originally scheduled for instead of silently moving it to
  // today.
  let dateStudied = sessionData.date_studied
  if (!dateStudied && sessionData.id) {
    const existing = await getStudySessions(activeProfile)
    const match = existing.find(s => s.id === sessionData.id)
    if (match) dateStudied = match.date_studied
  }

  const payload = {
    ...sessionData,
    profile_id: activeProfile,
    id: sessionData.id || Math.random().toString(36).substring(2, 9),
    date_studied: dateStudied || new Date().toISOString().split('T')[0]
  }

  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabaseInstance
        .from('study_sessions')
        .upsert(payload)
        .select()
      if (!error && data && data.length > 0) return data[0]
    } catch (e) { emitSyncFallback('saveStudySession', e) }
  }

  // Fallback
  const all = mockDb.get('study_sessions', [])
  const index = all.findIndex(s => s.id === payload.id)
  if (index >= 0) {
    all[index] = payload
  } else {
    all.push(payload)
  }
  mockDb.set('study_sessions', all)
  return payload
}

// --- 3. FLASHCARDS ---
export const getFlashcards = async (profileId) => {
  const activeProfile = profileId || getActiveProfileId()
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await withTimeout(
        supabaseInstance
          .from('flashcards')
          .select('*')
          .eq('profile_id', activeProfile)
      )
      if (!error && data) return data
    } catch (e) { emitSyncFallback('getFlashcards', e) }
  }
  // Fallback
  const all = mockDb.get('flashcards', [
    { id: 'f1', front: 'Travel', back: 'Viagem', language: 'Inglês', next_review: new Date().toISOString().split('T')[0], ease_factor: 2.5, repetitions: 0 },
    { id: 'f2', front: 'Gare', back: 'Estação de Trem', language: 'Francês', next_review: new Date().toISOString().split('T')[0], ease_factor: 2.5, repetitions: 0 }
  ])
  return all.filter(f => f.profile_id === activeProfile || (!f.profile_id && activeProfile === '1'))
}

export const saveFlashcard = async (cardData, profileId) => {
  const activeProfile = profileId || getActiveProfileId()
  const payload = {
    ...cardData,
    profile_id: activeProfile,
    id: cardData.id || Math.random().toString(36).substring(2, 9),
    next_review: cardData.next_review || new Date().toISOString().split('T')[0],
    ease_factor: cardData.ease_factor || 2.5,
    repetitions: cardData.repetitions || 0,
    interval_days: cardData.interval_days || 1
  }

  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabaseInstance
        .from('flashcards')
        .upsert(payload)
        .select()
      if (!error && data && data.length > 0) return data[0]
    } catch (e) { emitSyncFallback('saveFlashcard', e) }
  }

  // Fallback
  const all = mockDb.get('flashcards', [])
  const index = all.findIndex(f => f.id === payload.id)
  if (index >= 0) {
    all[index] = payload
  } else {
    all.push(payload)
  }
  mockDb.set('flashcards', all)
  return payload
}

export const deleteFlashcard = async (cardId) => {
  if (isSupabaseEnabled()) {
    try {
      const { error } = await supabaseInstance
        .from('flashcards')
        .delete()
        .eq('id', cardId)
      if (!error) return true
    } catch (e) {
      console.error(e)
    }
  }
  const all = mockDb.get('flashcards', [])
  mockDb.set('flashcards', all.filter(f => f.id !== cardId))
  return true
}

// --- 4. NOTES / JOURNAL ---
export const getNotes = async (profileId) => {
  const activeProfile = profileId || getActiveProfileId()
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabaseInstance
        .from('notes')
        .select('*')
        .eq('profile_id', activeProfile)
      if (!error && data) return data
    } catch (e) { emitSyncFallback('getNotes', e) }
  }
  // Fallback
  const all = mockDb.get('notes', [
    { id: 'n1', title: 'Minha primeira redação', content: 'Yesterday I started studying English again. It was awesome...', language: 'Inglês', updated_at: new Date().toISOString() }
  ])
  return all.filter(n => n.profile_id === activeProfile || (!n.profile_id && activeProfile === '1'))
}

export const saveNote = async (noteData, profileId) => {
  const activeProfile = profileId || getActiveProfileId()
  const payload = {
    ...noteData,
    profile_id: activeProfile,
    id: noteData.id || Math.random().toString(36).substring(2, 9),
    updated_at: new Date().toISOString()
  }

  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabaseInstance
        .from('notes')
        .upsert(payload)
        .select()
      if (!error && data && data.length > 0) return data[0]
    } catch (e) { emitSyncFallback('saveNote', e) }
  }

  // Fallback
  const all = mockDb.get('notes', [])
  const index = all.findIndex(n => n.id === payload.id)
  if (index >= 0) {
    all[index] = payload
  } else {
    all.push(payload)
  }
  mockDb.set('notes', all)
  return payload
}

export const deleteNote = async (noteId) => {
  if (isSupabaseEnabled()) {
    try {
      const { error } = await supabaseInstance
        .from('notes')
        .delete()
        .eq('id', noteId)
      if (!error) return true
    } catch (e) { emitSyncFallback('deleteNote', e) }
  }
  const all = mockDb.get('notes', [])
  mockDb.set('notes', all.filter(n => n.id !== noteId))
  return true
}

// Fetch Daily News
export const getDailyNews = async (language) => {
  if (!isSupabaseEnabled()) {
    return [] // Will trigger frontend fallback
  }

  try {
    const { data, error } = await withTimeout(
      supabaseInstance
        .from('daily_news')
        .select('*')
        .eq('language', language)
        .order('created_at', { ascending: false })
        .limit(30)
    )

    if (!error && data) {
      // The `daily_news` table columns are snake_case; the article shape the
      // UI expects everywhere else (and camelCase) comes from newsDatabase.js.
      return data.map(row => ({
        ...row,
        estimatedLevel: row.estimated_level,
        difficultyScore: row.difficulty_score,
        imageUrl: row.image_url
      }))
    }
  } catch (e) { emitSyncFallback('getDailyNews', e) }
  return []
}
