// Thin wrappers around the Supabase Edge Functions that do privileged work
// server-side (calling Gemini with a key that never reaches the browser,
// and fetching external URLs without relying on free third-party CORS
// proxies). Both require Supabase to be configured, since that's how the
// app already reaches its backend for everything else.
import { getSupabaseClient } from './supabase.js'

export const callGeminiProxy = async ({ model, parts, generationConfig } = {}) => {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Supabase não está configurado — não é possível chamar a IA sem o backend.')
  }

  const { data, error } = await client.functions.invoke('gemini-proxy', {
    body: { model, parts, generationConfig },
  })

  if (error) throw new Error(error.message || 'Falha ao chamar o proxy do Gemini.')
  if (data?.error) throw new Error(data.error)
  return data.text
}

export const fetchViaProxy = async (url) => {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Supabase não está configurado — não é possível buscar conteúdo externo sem o backend.')
  }

  const { data, error } = await client.functions.invoke('fetch-proxy', {
    body: { url },
  })

  if (error) throw new Error(error.message || 'Falha ao buscar o conteúdo.')
  if (data?.error) throw new Error(data.error)
  return data
}
