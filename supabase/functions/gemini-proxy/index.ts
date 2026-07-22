// Proxies Gemini API calls server-side so the API key never reaches the
// browser bundle. Client sends { model, parts, generationConfig } where
// `parts` matches the Gemini REST `contents[0].parts` shape (text and/or
// inlineData items); this function wraps it into a single-turn "user"
// message and returns just the concatenated text of the reply.
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const DEFAULT_MODEL = 'gemini-2.5-flash'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY não está configurada nos secrets da função.')
    }

    const { model, parts, generationConfig } = await req.json()
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error('Campo "parts" ausente ou vazio.')
    }

    const modelName = typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODEL
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${GEMINI_API_KEY}`

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        ...(generationConfig ? { generationConfig } : {}),
      }),
    })

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      const message = data?.error?.message || `Gemini API respondeu ${geminiRes.status}`
      return new Response(JSON.stringify({ error: message }), {
        status: geminiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? '')
      .join('')

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
