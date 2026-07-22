// Server-side "fetch this URL for me" proxy. Replaces the app's previous
// reliance on free, unauthenticated third-party CORS proxies (rss2json.com,
// allorigins.win, r.jina.ai) for reading BBC RSS feeds and scraping
// user-imported article URLs. Since this runs server-side, there's no CORS
// restriction to work around in the first place.
//
// Because the client can point this at *any* URL (users import arbitrary
// article links), it includes basic SSRF guards: only http(s) URLs, and
// hostnames/resolved IPs in private/loopback/link-local ranges are rejected.
import { corsHeaders } from '../_shared/cors.ts'

const MAX_BYTES = 5 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15000

const isPrivateIPv4 = (ip: string): boolean => {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 0) return true
  return false
}

const isPrivateHostname = (hostname: string): boolean => {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.local')) return true
  if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true
  if (isPrivateIPv4(lower)) return true
  return false
}

const assertPublicUrl = async (raw: string): Promise<URL> => {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('URL inválida.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Apenas URLs http/https são permitidas.')
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error('Este endereço não pode ser acessado.')
  }
  // Best-effort DNS-rebinding guard: also reject hostnames that resolve to a
  // private IP even when the hostname string itself looks public. If DNS
  // resolution isn't available in this runtime, fall through silently — the
  // hostname check above already covers the common cases.
  try {
    const records = await Deno.resolveDns(url.hostname, 'A')
    if (records.some(isPrivateIPv4)) {
      throw new Error('Este endereço não pode ser acessado.')
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'Este endereço não pode ser acessado.') throw e
  }
  return url
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url: targetUrl } = await req.json()
    if (!targetUrl || typeof targetUrl !== 'string') {
      throw new Error('Campo "url" é obrigatório.')
    }

    const url = await assertPublicUrl(targetUrl)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let upstream: Response
    try {
      upstream = await fetch(url.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PluriBot/1.0; +https://pluristudies.web.app)' },
        redirect: 'follow',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!upstream.ok) {
      throw new Error(`Falha ao buscar o conteúdo (status ${upstream.status}).`)
    }

    const contentType = upstream.headers.get('content-type') || ''
    const buf = await upstream.arrayBuffer()
    const truncated = buf.byteLength > MAX_BYTES
    const bytes = truncated ? buf.slice(0, MAX_BYTES) : buf
    const text = new TextDecoder('utf-8').decode(bytes)

    return new Response(JSON.stringify({ text, contentType, truncated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
