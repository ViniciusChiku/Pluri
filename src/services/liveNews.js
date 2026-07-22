// Service to fetch live news from BBC RSS feeds across different categories
import { fetchViaProxy } from './edgeFunctions.js'

const CATEGORY_FEEDS = {
  'Mundo': 'https://feeds.bbci.co.uk/news/world/rss.xml',
  'Tecnologia': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
  'Negócios': 'https://feeds.bbci.co.uk/news/business/rss.xml',
  'Ciência': 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  'Cultura': 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
  'Esportes': 'https://feeds.bbci.co.uk/sport/rss.xml'
}

/**
 * Clean HTML tags and snippet artifacts from RSS text
 */
const cleanSnippetText = (text) => {
  if (!text) return ''
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

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
 * Fetch live articles for a given language and category
 */
export const fetchLiveNews = async (language = 'Inglês', category = 'Tecnologia') => {
  if (language !== 'Inglês') {
    return []
  }

  const feedUrl = CATEGORY_FEEDS[category] || CATEGORY_FEEDS['Tecnologia']

  // Fetched server-side via our own fetch-proxy Edge Function (no CORS
  // restriction to work around there), instead of a free third-party
  // RSS-to-JSON/CORS-proxy service.
  try {
    const { text: xmlText } = await fetchViaProxy(feedUrl)

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 10)

    return items.map((item, idx) => {
      const title = item.querySelector('title')?.textContent || 'Breaking News'
      const description = cleanSnippetText(item.querySelector('description')?.textContent || '')
      const link = item.querySelector('link')?.textContent || feedUrl
      // BBC feeds carry the cover photo as <media:thumbnail url="..."/> or a
      // plain <enclosure url="..."/>; the colon in the tag name means
      // querySelector can't be used directly, so we go through getElementsByTagName.
      const imageUrl = item.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url')
        || item.querySelector('enclosure')?.getAttribute('url')
        || null

      return {
        id: `live_${category.toLowerCase()}_${idx}_${Date.now()}`,
        language: 'Inglês',
        category,
        title,
        summary: description.substring(0, 180) + '...',
        text: `${title}.\n\n${description}`,
        imageUrl,
        estimatedLevel: 'B2',
        difficultyScore: 65,
        source_url: link,
        isLive: true
      }
    })
  } catch (err) {
    console.error('Failed to fetch live RSS news:', err)
    return []
  }
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
