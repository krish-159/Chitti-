// useSettings.js — Custom Hook for App Settings
// ============================================================
// Manages Groq API key, active mode, and other preferences.
//
// Default settings are applied if nothing is saved yet.
// The API key is pre-filled for demo purposes.
// ============================================================

import { useState, useEffect } from 'react'

const SETTINGS_KEY = 'chitti_settings'
const API_KEY_STORAGE = 'chitti_apiKey'

// Default settings when user first installs Chitti
const DEFAULT_SETTINGS = {
  mode: 'suggestion',       // 'suggestion' | 'assistance' | 'agent'
  model: 'llama-3.1-8b-instant', // Groq model to use
  maxMessages: 60,          // How many past messages to send to AI
  autoInsert: false,        // Agent mode: auto insert without confirmation
  autoPilot: false,         // Grammarly-style auto-pilot mode
}

function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [apiKey, setApiKeyState] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Load settings from Chrome storage on first render
  useEffect(() => {
    chrome.storage.local.get([SETTINGS_KEY, API_KEY_STORAGE], (data) => {
      if (data[SETTINGS_KEY]) {
        setSettings({ ...DEFAULT_SETTINGS, ...data[SETTINGS_KEY] })
      }
      if (data[API_KEY_STORAGE]) {
        setApiKeyState(data[API_KEY_STORAGE])
      } else {
        // Pre-fill demo API key for OJT project
        // ⚠️ VIVA NOTE: In a real production app, the API key would live
        // on a backend server (Node.js/Express) so users can't see it.
        // For this student demo, we store it in Chrome's local storage
        // (chrome.storage.local) which is like localStorage but shared
        // across all parts of the extension (popup, background, content script).
        const demoKey = ''
        setApiKeyState(demoKey)
        chrome.storage.local.set({ [API_KEY_STORAGE]: demoKey })
      }
    })
  }, [])

  // ---- Save all settings to Chrome storage ----
  function saveSettings(newSettings, newApiKey) {
    setIsSaving(true)

    const dataToSave = {
      [SETTINGS_KEY]: newSettings || settings,
      [API_KEY_STORAGE]: newApiKey !== undefined ? newApiKey : apiKey
    }

    chrome.storage.local.set(dataToSave, () => {
      setSettings(dataToSave[SETTINGS_KEY])
      if (newApiKey !== undefined) setApiKeyState(newApiKey)
      setIsSaving(false)

      // Show success message briefly
      setSaveMessage('✓ Settings saved!')
      setTimeout(() => setSaveMessage(''), 2500)
    })
  }

  // ---- Update just the active mode ----
  function setMode(newMode) {
    const updatedSettings = { ...settings, mode: newMode }
    saveSettings(updatedSettings, apiKey)
  }

  // ---- Toggle Auto-Pilot (Grammarly Mode) ----
  function setAutoPilot(enabled) {
    const updatedSettings = { ...settings, autoPilot: enabled }
    saveSettings(updatedSettings, apiKey)
  }

  return {
    settings,
    apiKey,
    isSaving,
    saveMessage,
    setMode,
    setAutoPilot,
    saveSettings
  }
}

export default useSettings
