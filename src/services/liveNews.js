// Service to fetch full article text (and cover image) for a user-selected
// or user-imported article. Live RSS browsing was removed in favor of a
// single source of truth: the `daily_news` Supabase table, populated once a
// day by scripts/fetchDailyNews.js via a scheduled GitHub Action.
import { fetchViaProxy } from './edgeFunctions.js'

/**
 * Pull a cover image URL out of a page's <head> meta tags (og:image /
 * twitter:image). Works on an already-fetched HTML document, so callers
 * that already scraped the page for text can reuse it at no extra request
 * cost.
 */
export const extractOgImage = (html) => {
  if (!html || typeof DOMParser === 'undefined') return null
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const selectors = [
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]'
    ]
    for (const sel of selectors) {
      const content = doc.querySelector(sel)?.getAttribute('content')
      if (content && content.trim()) return content.trim()
    }
  } catch (err) {
    console.warn('Could not extract og:image:', err)
  }
  return null
}

/**
 * Fetch full article text (and cover image, when available) from the
 * original news page link. Tries multiple strategies in order, since any
 * single free CORS proxy / scraping approach can be flaky, rate-limited, or
 * broken by markup changes.
 *
 * Returns { text, imageUrl } — text is null if every strategy failed (so
 * callers fall back to the RSS snippet), imageUrl is null whenever we
 * couldn't determine one (this never throws).
 */
export const fetchFullArticleText = async (articleUrl) => {
  if (!articleUrl) return { text: null, imageUrl: null }

  // Raw HTML fetched server-side via our own fetch-proxy Edge Function
  // (instead of the r.jina.ai reader + allorigins CORS proxy this used to
  // chain through), then paragraph-extracted client-side same as before.
  try {
    const { text: htmlText } = await fetchViaProxy(articleUrl)
    const imageUrl = extractOgImage(htmlText)

    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlText, 'text/html')

      // Select article body paragraph elements
      const pElements = Array.from(
        doc.querySelectorAll('article p, [data-component="text-block"] p, .story-body p, main p, .article__body-content p')
      )

      const paragraphs = pElements
        .map(p => p.textContent.trim())
        .filter(text => (
          text.length > 25 &&
          !text.toLowerCase().includes('copyright') &&
          !text.toLowerCase().includes('bbc is not responsible') &&
          !text.toLowerCase().includes('follow bbc')
        ))

      if (paragraphs.length >= 2) {
        return { text: paragraphs.join('\n\n'), imageUrl }
      }
    }

    // Even if we couldn't extract clean paragraphs, the image might still
    // be usable, so surface it rather than throwing it away.
    if (imageUrl) {
      return { text: null, imageUrl }
    }
  } catch (err) {
    console.warn('Article scrape via fetch-proxy failed:', err)
  }

  return { text: null, imageUrl: null }
}
