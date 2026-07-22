import React from 'react'
import { Link2, Image, FileText } from 'lucide-react'

export default function ImportArticle({
  importMethod,
  setImportMethod,
  importFileName,
  setImportFileName,
  importFileBase64,
  setImportFileBase64,
  setImportFileMimeType,
  customInputError,
  setCustomInputError,
  importUrl,
  setImportUrl,
  handleFileChange,
  handleImportCustomArticle,
  isProcessingImport
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Sub-tabs for import method */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => {
            setImportMethod('link')
            setImportFileName('')
            setImportFileBase64('')
            setImportFileMimeType('')
            setCustomInputError('')
          }}
          className={`btn ${importMethod === 'link' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
        >
          <Link2 size={12} /> Link (URL)
        </button>
        <button
          onClick={() => {
            setImportMethod('image')
            setImportFileName('')
            setImportFileBase64('')
            setImportFileMimeType('')
            setCustomInputError('')
          }}
          className={`btn ${importMethod === 'image' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
        >
          <Image size={12} /> Imagem / Print
        </button>
        <button
          onClick={() => {
            setImportMethod('pdf')
            setImportFileName('')
            setImportFileBase64('')
            setImportFileMimeType('')
            setCustomInputError('')
          }}
          className={`btn ${importMethod === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
        >
          <FileText size={12} /> Arquivo PDF
        </button>
      </div>

      {importMethod === 'link' && (
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="form-label">Link do Artigo da Web</label>
          <input
            type="url"
            className="form-input"
            placeholder="https://exemplo.com/artigo-de-noticia"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            💡 <strong>Dica:</strong> Se o site exigir assinatura ou bloquear acesso automático (como jornais ou portais protegidos), tire um print da tela do texto e envie-o como <strong>Imagem / Print</strong>!
          </span>
        </div>
      )}

      {importMethod === 'image' && (
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="form-label">Enviar Imagem ou Print do Artigo</label>
          <div style={{
            border: '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem 1rem',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {importFileName ? `✓ ${importFileName}` : 'Clique ou arraste um print do artigo (.png, .jpg, .webp)'}
            </span>
          </div>
        </div>
      )}

      {importMethod === 'pdf' && (
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="form-label">Enviar Documento PDF do Artigo</label>
          <div style={{
            border: '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem 1rem',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {importFileName ? `✓ ${importFileName}` : 'Clique ou arraste um arquivo PDF (.pdf)'}
            </span>
          </div>
        </div>
      )}

      {customInputError && (
        <div style={{ color: '#eb5e55', fontSize: '0.8rem', fontWeight: 600 }}>
          ❌ {customInputError}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleImportCustomArticle}
        disabled={
          isProcessingImport ||
          (importMethod === 'link' && !importUrl.trim()) ||
          (importMethod !== 'link' && !importFileBase64)
        }
        style={{ width: '100%', padding: '1rem', marginTop: '0.5rem', fontSize: '1rem' }}
      >
        {isProcessingImport ? 'Analisando com IA...' : 'Analisar e Estudar Artigo'}
      </button>
    </div>
  )
}
