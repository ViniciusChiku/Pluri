import React, { useState, useEffect } from 'react'
import { Plus, Trash, Save, Edit, FileText, ArrowLeft } from 'lucide-react'
import { getNotes, saveNote, deleteNote, getLanguages } from '../services/supabase'

export default function Notebook({ profileId }) {
  const [notes, setNotes] = useState([])
  const [languages, setLanguages] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [isMobileEditing, setIsMobileEditing] = useState(false)
  
  // Edit Form state
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editLanguage, setEditLanguage] = useState('')

  useEffect(() => {
    async function loadNotebookData() {
      const list = await getNotes(profileId)
      setNotes(list)
      if (list.length > 0) {
        handleSelectNote(list[0], false)
      } else {
        setSelectedNote(null)
        setIsMobileEditing(false)
      }
      
      const langs = await getLanguages(profileId)
      setLanguages(langs)
      if (langs.length > 0) {
        setEditLanguage(langs[0].name)
      }
    }
    loadNotebookData()
  }, [profileId])

  const handleSelectNote = (note, forceMobileEdit = true) => {
    setSelectedNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditLanguage(note.language)
    if (forceMobileEdit) {
      setIsMobileEditing(true)
    }
  }

  const handleCreateNewNote = () => {
    const newNote = {
      id: '',
      title: 'Nota sem título',
      content: '',
      language: languages.length > 0 ? languages[0].name : 'Inglês'
    }
    setSelectedNote(newNote)
    setEditTitle(newNote.title)
    setEditContent(newNote.content)
    setEditLanguage(newNote.language)
    setIsMobileEditing(true)
  }

  const handleSaveNote = async () => {
    if (!editTitle.trim()) return

    const payload = {
      ...selectedNote,
      title: editTitle,
      content: editContent,
      language: editLanguage
    }

    const saved = await saveNote(payload, profileId)
    
    // Refresh notes list
    const list = await getNotes(profileId)
    setNotes(list)
    
    // Keep active
    setSelectedNote(saved)
  }

  const handleDeleteNote = async (id) => {
    if (!id) {
      setSelectedNote(null)
      setIsMobileEditing(false)
      return
    }
    
    if (confirm('Tem certeza que deseja deletar esta nota?')) {
      await deleteNote(id)
      const list = await getNotes(profileId)
      setNotes(list)
      if (list.length > 0) {
        handleSelectNote(list[0], false)
      } else {
        setSelectedNote(null)
        setIsMobileEditing(false)
      }
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Meu Caderno</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Escreva redações, diários e notas de gramática. Ideal para praticar a escrita.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateNewNote}>
          <Plus size={16} />
          Nova Nota
        </button>
      </div>

      {languages.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Adicione um idioma para começar</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Para usar o caderno, configure seus idiomas de estudo primeiro.
          </p>
        </div>
      ) : (
        <div className={`notebook-layout ${isMobileEditing ? 'mobile-active-editor' : ''}`}>
          {/* Notes list Sidebar */}
          <div className="notebook-sidebar">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              Minhas Notas ({notes.length})
            </div>
            
            {notes.map(note => (
              <div 
                key={note.id}
                className={`notebook-list-item glass ${selectedNote?.id === note.id ? 'active' : ''}`}
                onClick={() => handleSelectNote(note)}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {note.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>{note.language}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {new Date(note.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}

            {notes.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 'auto 0' }}>
                Nenhuma nota criada.
              </div>
            )}
          </div>

          {/* Note Editor Area */}
          {selectedNote ? (
            <div className="notebook-editor">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  className="notebook-back-btn" 
                  onClick={() => setIsMobileEditing(false)} 
                  title="Voltar para a lista"
                  style={{ marginRight: '0.25rem' }}
                >
                  <ArrowLeft size={16} />
                </button>

                <input 
                  type="text" 
                  className="form-input" 
                  style={{ flex: 1, fontSize: '1.1rem', fontWeight: 700, minWidth: 0 }}
                  placeholder="Título da nota" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                
                <select 
                  className="form-select" 
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  style={{ width: '100px', padding: '0.5rem' }}
                >
                  {languages.map(l => (
                    <option key={l.id} value={l.name}>{l.name}</option>
                  ))}
                </select>

                <button className="btn btn-secondary" onClick={() => handleDeleteNote(selectedNote.id)} style={{ padding: '0.6rem' }} title="Deletar Nota">
                  <Trash size={14} className="text-danger" />
                </button>
                
                <button className="btn btn-primary" onClick={handleSaveNote} style={{ padding: '0.6rem 1rem' }}>
                  <Save size={14} />
                  Salvar
                </button>
              </div>

              <textarea 
                className="notebook-editor-textarea"
                placeholder="Escreva sua redação ou notas aqui..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
          ) : (
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <FileText size={48} className="text-muted" style={{ marginBottom: '1rem' }} />
              <h4>Nenhuma nota selecionada</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
                Selecione uma nota na barra lateral ou clique em &quot;Nova Nota&quot;.
              </p>
              <button className="btn btn-primary" onClick={handleCreateNewNote}>Criar Nota</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

