// ReplyDraft.jsx — The AI Reply Generator Screen
// ============================================================
// This is the core feature screen.
// User enters the incoming message → Chitti generates a reply
// in the style of the user's past chats with that person.
//
// This screen is used in both Assistance Mode and for quick generation.
// ============================================================

import React, { useState, useEffect } from 'react'
import { generateReply } from '../services/groqService.js'
import { loadChatHistory } from '../services/chatParser.js'
import usePersons from '../hooks/usePersons.js'
import useSettings from '../hooks/useSettings.js'

// Mood options the user can select for this specific reply
const MOODS = ['casual', 'friendly', 'playful', 'professional', 'formal', 'loving', 'funny / sarcastic', 'serious', 'busy', 'excited']

function ReplyDraft({ navigate, person: initialPerson, incomingMessage: initialMessage }) {
  const { persons } = usePersons()
  const { apiKey }  = useSettings()

  // Which person are we replying as for
  const [selectedPerson, setSelectedPerson] = useState(initialPerson || null)

  // The message the other person sent
  const [theirMessage, setTheirMessage] = useState(initialMessage || '')

  // What mood to reply in
  const [mood, setMood] = useState(initialPerson?.currentMood || 'casual')

  // Generated AI reply
  const [generatedReply, setGeneratedReply] = useState('')

  // State flags
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError]               = useState('')
  const [copied, setCopied]             = useState(false)

  // Chat history for the selected person
  const [chatHistory, setChatHistory] = useState([])

  // When the selected person changes, load their chat history
  useEffect(() => {
    if (selectedPerson) {
      loadChatHistory(selectedPerson.name).then(history => {
        setChatHistory(history)
      })
      setMood(selectedPerson.currentMood || 'casual')
    }
  }, [selectedPerson])

  // ---- Generate the AI reply ----
  async function handleGenerate() {
    // Validations
    if (!selectedPerson) {
      setError('Please select a person first.')
      return
    }
    if (!theirMessage.trim()) {
      setError("Please enter what they said (even 'hello' works).")
      return
    }
    if (!apiKey) {
      setError('No API key found. Please add it in Settings → API Key.')
      return
    }

    setIsGenerating(true)
    setError('')
    setGeneratedReply('')

    try {
      // Call the Groq API through our service
      const reply = await generateReply({
        apiKey,
        chatHistory,
        incomingMessage: theirMessage,
        person: { ...selectedPerson, currentMood: mood },
        model: settings.model   // Pass the model the user selected in Settings
      })

      setGeneratedReply(reply)

    } catch (err) {
      setError(err.message || 'Failed to generate reply. Check your API key in Settings.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ---- Copy reply to clipboard ----
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedReply)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = generatedReply
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('home')}>←</button>
        <div>
          <h2 className="page-title">Generate Reply</h2>
          <p className="page-subtitle">AI mimics your style 🤖</p>
        </div>
      </div>

      {/* ---- Person Selector ---- */}
      <div className="form-group">
        <label className="label">Replying To</label>
        <select
          className="select"
          value={selectedPerson?.name || ''}
          onChange={e => {
            const found = persons.find(p => p.name === e.target.value)
            setSelectedPerson(found || null)
            setGeneratedReply('')
            setError('')
          }}
        >
          <option value="">— Select a person —</option>
          {persons.map(p => (
            <option key={p.name} value={p.name}>
              {p.emoji} {p.name} ({p.relationship})
            </option>
          ))}
        </select>

        {/* Show warning if no chat history */}
        {selectedPerson && chatHistory.length === 0 && (
          <div className="alert alert-info" style={{ marginTop: '8px' }}>
            ⚠️ No chat history for {selectedPerson.name} yet.{' '}
            <span
              style={{ color: 'var(--indigo-light)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate('upload', { person: selectedPerson })}
            >
              Upload chat →
            </span>
            {' '}(Chitti will still try, just less accurately)
          </div>
        )}

        {/* Show chat data info */}
        {chatHistory.length > 0 && (
          <p className="text-sm text-muted" style={{ marginTop: '6px' }}>
            📚 {chatHistory.length} messages loaded for context
          </p>
        )}
      </div>

      {/* ---- Their Message Input ---- */}
      <div className="form-group">
        <label className="label">Their Message</label>
        <textarea
          className="textarea"
          placeholder="What did they say? Paste their message here..."
          value={theirMessage}
          onChange={e => setTheirMessage(e.target.value)}
          rows={3}
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* ---- Mood Selector ---- */}
      <div className="form-group">
        <label className="label">Reply Mood / Tone</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {MOODS.map(m => (
            <button
              key={m}
              onClick={() => setMood(m)}
              style={{
                background: mood === m ? 'rgba(32, 129, 138, 0.12)' : 'rgba(24, 35, 53, 0.04)',
                border: `1px solid ${mood === m ? '#20818a' : 'rgba(24, 35, 53, 0.08)'}`,
                borderRadius: '999px',
                padding: '5px 12px',
                color: mood === m ? 'var(--indigo)' : 'var(--text-3)',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textTransform: 'capitalize'
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Error display ---- */}
      {error && (
        <div className="alert alert-error fade-in">
          {error}
        </div>
      )}

      {/* ---- Generate Button ---- */}
      <button
        className="btn btn-primary btn-block"
        onClick={handleGenerate}
        disabled={isGenerating || !selectedPerson || !theirMessage.trim()}
        style={{ marginBottom: '14px' }}
      >
        {isGenerating ? (
          <><span className="spinner" /> Generating in your style...</>
        ) : (
          '🤖 Generate Reply'
        )}
      </button>

      {/* ---- Generated Reply Display ---- */}
      {generatedReply && (
        <div className="card fade-in" style={{ borderColor: 'rgba(32, 129, 138, 0.25)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span className="section-title" style={{ marginBottom: 0 }}>Generated Reply</span>
            <span className="badge badge-green">AI Mimicked</span>
          </div>

          {/* The actual reply text */}
          <div style={{
            background: 'rgba(32, 129, 138, 0.05)',
            border: '1px solid rgba(32, 129, 138, 0.15)',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '14px',
            lineHeight: '1.7',
            color: 'var(--text-1)',
            marginBottom: '12px',
            wordBreak: 'break-word'
          }}>
            {generatedReply}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Copy button */}
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>

            {/* Regenerate button */}
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? '...' : '↻ Regenerate'}
            </button>
          </div>

          {/* Tip: works anywhere on the page */}
          <div className="alert alert-info" style={{ marginTop: '12px' }}>
            💡 <strong>Tip:</strong> You can also use the Chitti button that appears when you click any text box on WhatsApp Web, Instagram, LinkedIn, etc.
          </div>
        </div>
      )}

      {/* ---- Empty state prompt ---- */}
      {!generatedReply && !isGenerating && (
        <div className="empty-state" style={{ padding: '20px' }}>
          <span className="empty-state-icon">🤖</span>
          <p className="empty-state-text">
            Select a person, enter what they said, pick a mood, and let Chitti generate your reply.
          </p>
        </div>
      )}
    </div>
  )
}

export default ReplyDraft
