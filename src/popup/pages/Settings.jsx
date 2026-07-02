// Settings.jsx — App Settings Page
// ============================================================
// Handles:
//  - Groq API key (required for AI to work)
//  - Active mode selection
//  - About / how-to info
//
// API KEY VIVA EXPLANATION:
// We store the API key in chrome.storage.local (Chrome's secure storage).
// This is the correct approach for a client-side Chrome extension.
// In a production app, the API key would be on a backend server so
// users can't see it. For this demo/OJT project, we store it locally
// and the user enters their own key — similar to how Postman stores API keys.
// ============================================================

import React, { useState, useEffect } from 'react'
import useSettings from '../hooks/useSettings.js'
import { testApiKey } from '../services/groqService.js'

function Settings({ navigate }) {
  const { settings, apiKey, isSaving, saveMessage, setMode, saveSettings } = useSettings()

  // Local state for the API key input (separate from saved state)
  const [localApiKey, setLocalApiKey] = useState('')
  const [showApiKey, setShowApiKey]   = useState(false)  // Toggle visibility

  // API key test result
  const [testResult, setTestResult] = useState(null)
  const [isTesting, setIsTesting]   = useState(false)

  // Your Name — needed so the chat parser knows which messages are YOURS
  // VIVA TIP: When WhatsApp exports a chat, messages are labelled by
  // the sender's saved name. We need to know YOUR name to tell
  // AI "these are the messages you should mimic"
  const [userName, setUserName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  // Load settings and userName from storage
  useEffect(() => {
    if (apiKey) setLocalApiKey(apiKey)
  }, [apiKey])

  useEffect(() => {
    chrome.storage.local.get(['chitti_userName'], (data) => {
      if (data.chitti_userName) setUserName(data.chitti_userName)
    })
  }, [])

  // Save userName to Chrome storage
  function handleSaveUserName() {
    if (!userName.trim()) return
    chrome.storage.local.set({ chitti_userName: userName.trim() }, () => {
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2500)
    })
  }

  // ---- Save all settings ----
  function handleSave() {
    saveSettings(settings, localApiKey.trim())
    // Also save userName if filled in
    if (userName.trim()) {
      chrome.storage.local.set({ chitti_userName: userName.trim() })
    }
  }

  // ---- Test if the API key is valid ----
  async function handleTestKey() {
    if (!localApiKey.trim()) {
      setTestResult({ valid: false, message: 'Please enter an API key first.' })
      return
    }
    setIsTesting(true)
    setTestResult(null)
    const result = await testApiKey(localApiKey.trim())
    setTestResult(result)
    setIsTesting(false)
  }

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('home')}>←</button>
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-subtitle">Configure Chitti</p>
        </div>
      </div>

      {/* ============================================================
          SECTION 0: YOUR NAME (Critical for Chat Parsing)
          ============================================================ */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <p className="section-title">👤 Your Name</p>

        {/* Why this matters */}
        <div className="alert alert-info" style={{ marginBottom: '12px', fontSize: '11px' }}>
          <strong>Why do we need this?</strong> When you export a WhatsApp chat,
          messages are labelled by your saved name. Chitti needs your exact name
          (as it appears in the chat export) to know which messages are YOURS —
          so the AI can learn YOUR style, not the other person's.
          <br /><br />
          Example: In the export file, your messages show as{' '}
          <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '4px' }}>
            Nitin Patel: hey what's up
          </code>
          — type <strong>Nitin Patel</strong> here.
        </div>

        <div className="form-group">
          <label className="label">Your Name (as in chat export)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="input"
              type="text"
              placeholder="e.g. Nitin, Nitin Patel, Me..."
              value={userName}
              onChange={e => setUserName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveUserName()}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              style={{ flexShrink: 0 }}
              onClick={handleSaveUserName}
              disabled={!userName.trim()}
            >
              ✓ Save
            </button>
          </div>
        </div>

        {nameSaved && (
          <div className="alert alert-success fade-in">
            ✓ Name saved! Now when you upload chat history, Chitti will correctly identify your messages.
          </div>
        )}
      </div>

      {/* ============================================================
          SECTION 1: API KEY
          ============================================================ */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <p className="section-title">🔑 Groq API Key</p>

        {/* Explanation box */}
        <div className="alert alert-info" style={{ marginBottom: '12px', fontSize: '11px' }}>
          <strong>What is this?</strong> The API key is a password that lets Chitti use Groq's AI.
          Get a free key at{' '}
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--cyan-light)' }}
          >
            console.groq.com/keys
          </a>
          <br /><br />
          <strong>Is it safe?</strong> The key is stored only in your browser's Chrome storage — never sent
          anywhere except to Groq's official API.
        </div>

        {/* API key input */}
        <div className="form-group">
          <label className="label">API Key</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="input"
              type={showApiKey ? 'text' : 'password'}
              placeholder="gsk_..."
              value={localApiKey}
              onChange={e => setLocalApiKey(e.target.value)}
              style={{ flex: 1 }}
            />
            {/* Toggle show/hide */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{ flexShrink: 0, borderRadius: '12px' }}
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Test + Save buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={handleTestKey}
            disabled={isTesting || !localApiKey.trim()}
          >
            {isTesting ? <><span className="spinner" /> Testing...</> : '🧪 Test Key'}
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : '✓ Save'}
          </button>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`alert ${testResult.valid ? 'alert-success' : 'alert-error'} fade-in`}
               style={{ marginTop: '10px' }}>
            {testResult.message}
          </div>
        )}

        {/* Save success message */}
        {saveMessage && (
          <div className="alert alert-success fade-in" style={{ marginTop: '10px' }}>
            {saveMessage}
          </div>
        )}
      </div>

      {/* ============================================================
          SECTION 2: AI MODEL SELECTION
          ============================================================ */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <p className="section-title">🤖 AI Model</p>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <select
            className="select"
            value={settings.model}
            onChange={e => saveSettings({ ...settings, model: e.target.value }, localApiKey)}
          >
            <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fast, recommended)</option>
            <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Smarter, slower)</option>
            <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Balanced)</option>
          </select>
          <p className="text-sm text-muted" style={{ marginTop: '6px' }}>
            8b = smaller, faster. 70b = bigger, more human-like. Start with 8b.
          </p>
        </div>
      </div>

      {/* ============================================================
          SECTION 3: HOW IT WORKS (Viva Reference)
          ============================================================ */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <p className="section-title">📖 How Chitti Works</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { step: '1', icon: '👥', text: 'Add a person & set relationship context' },
            { step: '2', icon: '📁', text: 'Upload/paste your past chat history with them' },
            { step: '3', icon: '🤖', text: 'Groq AI learns your style from those messages' },
            { step: '4', icon: '🤖', text: 'Click the Chitti button on any website text box to get a mimicked reply' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{
                width: '24px', height: '24px',
                background: 'var(--grad-brand)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '700',
                flexShrink: 0
              }}>
                {item.step}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.5', paddingTop: '3px' }}>
                {item.icon} {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          SECTION 4: PLATFORM SUPPORT INFO
          ============================================================ */}
      <div className="card">
        <p className="section-title">✅ Works On</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {['WhatsApp Web', 'Instagram', 'LinkedIn', 'Telegram', 'Discord', 'Gmail', 'Twitter / X', 'Slack'].map(platform => (
            <span key={platform} className="badge badge-green">{platform}</span>
          ))}
        </div>
        <p className="text-sm text-muted" style={{ marginTop: '10px' }}>
          Works anywhere on the web that has a text input — just click the Chitti button that appears.
        </p>
      </div>

      {/* Bottom version info */}
      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-3)', fontSize: '11px' }}>
        Chitti v1.0.0 — OJT Project 2025
      </div>
    </div>
  )
}

export default Settings
