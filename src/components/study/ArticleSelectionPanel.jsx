import React from 'react'
import { ArrowRight } from 'lucide-react'
import ArticleThumb from './ArticleThumb'
import ImportArticle from './ImportArticle'

export default function ArticleSelectionPanel({
  isLoading,
  activeSourceTab,
  setActiveSourceTab,
  activeLanguage,
  setActiveLanguage,
  uniqueLanguages,
  selectedCategory,
  setSelectedCategory,
  filteredNews,
  liveNewsLoading,
  selectedArticle,
  setSelectedArticle,
  handleOpenArticleInstant,
  importMethod,
  setImportMethod,
  importFileName,
  setImportFileName,
  importFileBase64,
  setImportFileBase64,
  importFileMimeType,
  setImportFileMimeType,
  customInputError,
  setCustomInputError,
  importUrl,
  setImportUrl,
  handleFileChange,
  handleImportCustomArticle,
  isProcessingImport
}) {
  if (isLoading) {
    return (
      <div className="card glass" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', minHeight: '320px' }}>
        <div className="spinner-primary" style={{
          width: '42px',
          height: '42px',
          border: '3px solid var(--border-color)',
          borderTop: '3px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)' }}>
            {activeSourceTab === 'local' ? 'Analisando Artigo Recomendado...' : 'Processando Artigo Importado...'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
            Nosso tutor de IA está extraindo o texto principal, alinhando a tradução palavra por palavra e gerando seus exercícios de fixação personalizados.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card glass" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Language Selector */}
        <div className="form-group">
          <label className="form-label" htmlFor="activeLang">Idioma de Estudo</label>
          <select
            id="activeLang"
            className="form-select"
            value={activeLanguage}
            onChange={(e) => setActiveLanguage(e.target.value)}
          >
            {uniqueLanguages.map(l => (
              <option key={l.name} value={l.name}>{l.name} ({l.current_level})</option>
            ))}
          </select>
        </div>

        {/* Source Origin Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
          <button
            onClick={() => {
              setActiveSourceTab('local')
              setCustomInputError('')
            }}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeSourceTab === 'local' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeSourceTab === 'local' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeSourceTab === 'local' ? 'bold' : 'normal',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Notícias Recomendadas
          </button>
          <button
            onClick={() => {
              setActiveSourceTab('import')
              setCustomInputError('')
            }}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeSourceTab === 'import' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeSourceTab === 'import' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeSourceTab === 'import' ? 'bold' : 'normal',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Importar Artigo (Link, PDF ou Print)
          </button>
        </div>

        {activeSourceTab === 'local' && (
          <>
            {/* Category Selector Buttons */}
            <div className="form-group">
              <label className="form-label">Tópicos / Assuntos</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['Mundo', 'Tecnologia', 'Negócios', 'Ciência', 'Esportes', 'Cultura'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat)
                    }}
                    className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Curated News Articles List */}
            <div className="form-group">
              <label className="form-label">Selecione um Artigo</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}>
                {filteredNews.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                    {liveNewsLoading ? 'Carregando notícias ao vivo...' : `Nenhum artigo disponível em ${selectedCategory} para ${activeLanguage}.`}
                  </p>
                ) : (
                  filteredNews.map(art => {
                    return (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArticle(art)}
                        style={{
                          padding: '0.85rem',
                          background: selectedArticle?.id === art.id ? 'var(--primary-light)' : 'var(--bg-secondary)',
                          border: selectedArticle?.id === art.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-xs)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <ArticleThumb src={art.imageUrl} category={art.category} size={92} radius="var(--radius-md)" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block', lineHeight: '1.3' }}>{art.title}</strong>
                          <p style={{
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary)',
                            marginTop: '0.25rem',
                            lineHeight: '1.4',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>{art.summary}</p>
                        </div>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem', flexShrink: 0 }}>{art.estimatedLevel}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={!selectedArticle}
              onClick={handleOpenArticleInstant}
              style={{ width: '100%', padding: '1rem', marginTop: '1rem', fontSize: '1rem' }}
            >
              <ArrowRight size={18} />
              Estudar Artigo
            </button>
          </>
        )}

        {activeSourceTab === 'import' && (
          <ImportArticle
            importMethod={importMethod}
            setImportMethod={setImportMethod}
            importFileName={importFileName}
            setImportFileName={setImportFileName}
            importFileBase64={importFileBase64}
            setImportFileBase64={setImportFileBase64}
            importFileMimeType={importFileMimeType}
            setImportFileMimeType={setImportFileMimeType}
            customInputError={customInputError}
            setCustomInputError={setCustomInputError}
            importUrl={importUrl}
            setImportUrl={setImportUrl}
            handleFileChange={handleFileChange}
            handleImportCustomArticle={handleImportCustomArticle}
            isProcessingImport={isProcessingImport}
          />
        )}
      </div>
    </div>
  )
}
