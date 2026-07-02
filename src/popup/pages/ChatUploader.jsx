// ChatUploader.jsx — Upload/Paste Chat History for a Person
// ============================================================
// Two ways to upload:
//  1. Upload WhatsApp .txt export file
//  2. Manually paste chat text
//
// After uploading, it parses the chat and saves to Chrome storage
// ============================================================

import React, { useState, useRef, useEffect } from 'react'
import { parseWhatsAppChat, parseManualChat, getChatStats, saveChatHistory } from '../services/chatParser.js'
import usePersons from '../hooks/usePersons.js'

function ChatUploader({ navigate, person }) {
  // Which upload method is selected: 'file' or 'paste'
  const [uploadMethod, setUploadMethod] = useState('file')

  // The pasted text content
  const [pastedText, setPastedText] = useState('')

  // The user's name (so parser knows which messages are theirs)
  // Pre-filled from Settings if user already set it
  const [myName, setMyName] = useState('')

  // Auto-load saved username from Settings
  useEffect(() => {
    chrome.storage.local.get(['chitti_userName'], (data) => {
      if (data.chitti_userName) setMyName(data.chitti_userName)
    })
  }, [])

  // Status messages
  const [status, setStatus]     = useState('')   // Success message
  const [error, setError]       = useState('')    // Error message
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedStats, setParsedStats]   = useState(null)

  // Hook to update the person's message count after parsing
  const { updateMessageCount } = usePersons()

  // Reference to the hidden file input element
  const fileInputRef = useRef(null)

  // If no person was selected, redirect back
  if (!person) {
    return (
      <div>
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('persons')}>←</button>
          <h2 className="page-title">Upload Chat</h2>
        </div>
        <div className="alert alert-error">
          No person selected. Please go back and select a person first.
        </div>
        <button className="btn btn-secondary btn-block" onClick={() => navigate('persons')}>
          ← Back to People
        </button>
      </div>
    )
  }

  // ---- Handle file upload (.txt file) ----
  function handleFileUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    // Validate it's a .txt file
    if (!file.name.endsWith('.txt')) {
      setError('Please upload a .txt file. (Export chat from WhatsApp as "Without Media")')
      return
    }

    // Read the file contents
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      processChat(text, 'whatsapp')
    }
    reader.onerror = () => setError('Could not read file. Try copy-pasting the content instead.')
    reader.readAsText(file, 'UTF-8')
  }

  // ---- Handle manual paste ----
  function handlePasteSubmit() {
    if (!pastedText.trim()) {
      setError('Please paste some chat text first.')
      return
    }
    // Try WhatsApp format first, fall back to manual
    processChat(pastedText, 'auto')
  }

  // ---- Process the raw chat text ----
  async function processChat(rawText, format) {
    setIsProcessing(true)
    setError('')
    setStatus('')
    setParsedStats(null)

    try {
      let messages = []

      if (format === 'whatsapp') {
        // Parse WhatsApp .txt format
        messages = parseWhatsAppChat(rawText, myName)
      } else {
        // Auto-detect: try WhatsApp pattern first
        const whatsappMessages = parseWhatsAppChat(rawText, myName)
        if (whatsappMessages.length > 5) {
          messages = whatsappMessages
        } else {
          // Fall back to manual parse (user: / person: format)
          messages = parseManualChat(rawText, myName, person.name)
        }
      }

      // Must have at least some messages
      if (messages.length < 10) {
        setError(`Only ${messages.length} messages found. Make sure:
1. For WhatsApp: Export the chat as "Without Media" (.txt file)
2. Check that "My Name" matches your name in WhatsApp
3. Or try the paste method with the correct format`)
        setIsProcessing(false)
        return
      }

      // Save to Chrome storage
      await saveChatHistory(person.name, messages)

      // Update the person's message count
      updateMessageCount(person.name, messages.length)

      // Get stats for display
      const stats = getChatStats(messages, myName)
      setParsedStats(stats)

      setStatus(`✓ Successfully saved ${messages.length} messages for ${person.name}!`)

    } catch (err) {
      setError(`Error processing chat: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('persons')}>←</button>
        <div>
          <h2 className="page-title">Upload Chat</h2>
          <p className="page-subtitle">
            {person.emoji} {person.name} — {person.relationship}
          </p>
        </div>
      </div>

      {/* ---- My Name Input ---- */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="label">Your Name in the Chat *</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Nitin, Me, myself..."
            value={myName}
            onChange={e => setMyName(e.target.value)}
          />
          <p className="text-sm text-muted" style={{ marginTop: '6px' }}>
            This must match EXACTLY how your name appears in the exported chat.
          </p>
        </div>
      </div>

      {/* ---- Upload Method Toggle ---- */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          className={`btn ${uploadMethod === 'file' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setUploadMethod('file')}
        >
          📁 Upload .txt File
        </button>
        <button
          className={`btn ${uploadMethod === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setUploadMethod('paste')}
        >
          📋 Paste Text
        </button>
      </div>

      {/* ---- File Upload Method ---- */}
      {uploadMethod === 'file' && (
        <div className="card fade-in" style={{ marginBottom: '14px' }}>
          {/* Hidden file input */}
          <input
            type="file"
            accept=".txt"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {/* Upload instructions */}
          <div className="alert alert-info" style={{ marginBottom: '14px' }}>
            <strong>How to export WhatsApp chat:</strong><br />
            Open chat → ⋮ Menu → More → Export Chat → Without Media → Save .txt file
          </div>

          {/* Upload button */}
          <button
            className="btn btn-secondary btn-block"
            onClick={() => fileInputRef.current?.click()}
            disabled={!myName.trim() || isProcessing}
          >
            {isProcessing ? (
              <><span className="spinner" /> Processing...</>
            ) : (
              '📁 Choose WhatsApp .txt File'
            )}
          </button>

          {!myName.trim() && (
            <p className="text-sm text-muted" style={{ marginTop: '8px', textAlign: 'center' }}>
              Enter your name above first.
            </p>
          )}
        </div>
      )}

      {/* ---- Paste Method ---- */}
      {uploadMethod === 'paste' && (
        <div className="card fade-in" style={{ marginBottom: '14px' }}>
          <div className="alert alert-info" style={{ marginBottom: '14px' }}>
            Paste your chat in this format:<br />
            <code style={{ fontSize: '11px', opacity: 0.8 }}>
              [date] Name: message text
            </code>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="label">Paste Chat Here</label>
            <textarea
              className="textarea"
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste your WhatsApp or any chat text here..."
              rows={6}
              style={{ minHeight: '140px', fontFamily: 'monospace', fontSize: '11px' }}
            />
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={handlePasteSubmit}
            disabled={!myName.trim() || !pastedText.trim() || isProcessing}
          >
            {isProcessing ? (
              <><span className="spinner" /> Processing...</>
            ) : (
              '🤖 Parse & Save Chat'
            )}
          </button>
        </div>
      )}

      {/* ---- Error message ---- */}
      {error && (
        <div className="alert alert-error fade-in">
          {error}
        </div>
      )}

      {/* ---- Success + Stats ---- */}
      {status && parsedStats && (
        <div className="card fade-in" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
          <div className="alert alert-success" style={{ marginBottom: '12px' }}>
            {status}
          </div>

          {/* Stats grid */}
          <p className="section-title">Chat Analysis</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--indigo-light)' }}>
                {parsedStats.totalMessages}
              </div>
              <div className="text-sm text-muted">Total Messages</div>
            </div>
            <div className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--cyan-light)' }}>
                {parsedStats.userMessageCount}
              </div>
              <div className="text-sm text-muted">Your Messages</div>
            </div>
            <div className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-1)' }}>
                {parsedStats.avgUserMessageLength}
              </div>
              <div className="text-sm text-muted">Avg Msg Length</div>
            </div>
            <div className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', textTransform: 'capitalize', color: parsedStats.dataQuality.color }}>
                {parsedStats.dataQuality.level}
              </div>
              <div className="text-sm text-muted">Data Quality</div>
            </div>
          </div>

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: '12px' }}
            onClick={() => navigate('reply', { person })}
          >
            🤖 Generate Reply Now →
          </button>
        </div>
      )}
    </div>
  )
}

export default ChatUploader
