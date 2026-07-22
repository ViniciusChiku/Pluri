import Parser from 'rss-parser'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

import fs from 'fs'

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' })
} else {
  dotenv.config()
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error("ERRO: Configure as variáveis SUPABASE_URL, SUPABASE_KEY e GEMINI_API_KEY no arquivo .env na raiz do projeto")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const parser = new Parser()

// Feeds da BBC para cobrir uma boa variedade de vocabulário
const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'Mundo' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Tecnologia' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'Negócios' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'Ciência' },
  { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'Cultura' },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Esportes' }
]

async function processNews() {
  console.log("Iniciando o Robô Extrator de Notícias...")
  
  for (const feedConfig of FEEDS) {
    console.log(`\nLendo o feed: ${feedConfig.category}...`)
    const feed = await parser.parseURL(feedConfig.url)
    
    // Pega as 10 últimas notícias de cada feed
    const items = feed.items.slice(0, 10)
    
    for (const item of items) {
      console.log(`- Processando: ${item.title}`)
      
      // 1. Checa se já existe no banco usando a URL original
      const { data: existing } = await supabase
        .from('daily_news')
        .select('id')
        .eq('source_url', item.link)
        .single()
        
      if (existing) {
        console.log(`  [PULADO] Notícia já está salva no banco.`)
        continue
      }
      
      // 2. Extrai o texto completo acessando o link real da BBC
      let fullText = item.contentSnippet || item.content || ''
      
      try {
        const res = await fetch(item.link)
        const html = await res.text()
        const $ = cheerio.load(html)
        const paragraphs = []
        
        // A maioria dos artigos da BBC usam as tags <p> dentro do article ou story-body
        $('[data-component="text-block"], article p, .story-body p, .article__body-content p').each((i, el) => paragraphs.push($(el).text().trim()))
        if (paragraphs.length > 2) {
          fullText = paragraphs.filter(p => p.length > 20).join('\n\n')
        }
      } catch (e) {
        console.warn("  Aviso: Não foi possível baixar a página inteira, usando snippet.")
      }

      if (fullText.length < 400) {
         console.log("  [IGNORADO] Conteúdo muito curto (provavelmente é vídeo ou live blog).")
         continue
      }
      
      // 3. Pede para a IA criar a Lição Estruturada
      console.log("  [GEMINI] Traduzindo e avaliando nível da notícia...")
      try {
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemma-4-31b-it' })
        
        const prompt = `Você é um tutor de inglês experiente criando material didático para seus alunos. 
Analise a seguinte notícia em inglês extraída de um portal.

Notícia original:
Título: ${item.title}
Conteúdo: ${fullText}

INSTRUÇÕES IMPORTANTES:
1. MANTENHA O TEXTO NA ÍNTEGRA. NÃO RESUMA A NOTÍCIA. Preserve todos os parágrafos relevantes do conteúdo bruto. Apenas remova "lixo" do site (menus, propagandas).
2. Traduza perfeitamente todo o texto mantido para o Português.
3. Atribua uma nota de dificuldade (0-100) e um Nível CEFR (A1, A2, B1, B2, C1, C2).

Responda APENAS com um objeto JSON puro, sem usar markdown (sem as crases de \`\`\`json). O formato EXATO é este:
{
  "title": "Título Original em Inglês Limpo",
  "summary": "Um breve resumo (2 frases máximo) em inglês do que aconteceu na notícia",
  "text": "O texto em inglês COMPLETO E NA ÍNTEGRA, dividido em parágrafos separados por duas quebras de linha (\\n\\n)",
  "translation": "A tradução fiel do texto completo para o português",
  "estimatedLevel": "B2",
  "difficultyScore": 68
}`
        const result = await model.generateContent(prompt)
        const textResponse = result.response.text()
        
        // Limpeza de segurança para Parse
        const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
        const lesson = JSON.parse(jsonStr)
        
        // 4. Salva no Supabase
        const { error: dbError } = await supabase
          .from('daily_news')
          .insert({
            language: 'Inglês',
            category: feedConfig.category,
            title: lesson.title,
            summary: lesson.summary,
            text: lesson.text,
            translation: lesson.translation,
            estimated_level: lesson.estimatedLevel,
            difficulty_score: lesson.difficultyScore,
            source_url: item.link
          })
          
        if (dbError) {
          console.error("  [ERRO BD]:", dbError.message)
        } else {
          console.log("  [SUCESSO] Notícia processada e salva!")
        }

      } catch (err) {
        console.error("  [ERRO GEMINI/JSON]: Não foi possível gerar a lição para este link. Detalhes:", err)
      }
      
      // Delay de 2 segundos para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  
  console.log("\nRotina diária concluída! Todas as notícias foram analisadas.")
}

processNews()
