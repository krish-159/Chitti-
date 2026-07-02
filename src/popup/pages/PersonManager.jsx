// PersonManager.jsx — Manage All Saved People
// Shows list of saved persons + form to add a new person

import React, { useState } from 'react'
import PersonCard from '../components/PersonCard.jsx'
import usePersons from '../hooks/usePersons.js'

// Relationship options for the dropdown
const RELATIONSHIPS = [
  'best friend',
  'close friend',
  'friend',
  'colleague',
  'classmate',
  'crush',
  'partner',
  'family',
  'boss / senior',
  'acquaintance'
]

// Mood options
const MOODS = [
  'casual',
  'friendly',
  'playful',
  'professional',
  'formal',
  'loving',
  'funny / sarcastic',
  'serious'
]

// Emoji options for person avatar
const EMOJIS = ['👤', '👦', '👧', '🧑', '👨', '👩', '🧔', '👱', '🧒', '🤝', '⭐', '🔥', '💫']

function PersonManager({ navigate }) {
  const { persons, addPerson, deletePerson } = usePersons()

  // Whether the "Add Person" form is showing
  const [showAddForm, setShowAddForm] = useState(false)

  // Form field values
  const [form, setForm] = useState({
    name: '',
    relationship: 'friend',
    emoji: '👤',
    currentMood: 'casual',
    notes: ''
  })

  // Error message for form validation
  const [formError, setFormError] = useState('')

  // Handle form input changes
  function handleFormChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (formError) setFormError('') // Clear error when user types
  }

  // Submit the Add Person form
  function handleAddPerson() {
    // Validate: name is required
    if (!form.name.trim()) {
      setFormError('Please enter a name.')
      return
    }

    // Try to add the person
    const success = addPerson({
      name: form.name.trim(),
      relationship: form.relationship,
      emoji: form.emoji,
      currentMood: form.currentMood,
      notes: form.notes
    })

    if (success) {
      // Reset form and hide it
      setForm({ name: '', relationship: 'friend', emoji: '👤', currentMood: 'casual', notes: '' })
      setShowAddForm(false)
      setFormError('')
    } else {
      setFormError(`"${form.name}" already exists in your list.`)
    }
  }

  return (
    <div>
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('home')}>←</button>
        <div>
          <h2 className="page-title">People</h2>
          <p className="page-subtitle">{persons.length} person{persons.length !== 1 ? 's' : ''} added</p>
        </div>
        {/* Add person button */}
        <button
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add'}
        </button>
      </div>

      {/* ---- Add Person Form (shown/hidden) ---- */}
      {showAddForm && (
        <div className="card fade-in" style={{ marginBottom: '16px' }}>
          <p className="section-title" style={{ marginBottom: '14px' }}>➕ Add New Person</p>

          {/* Name input */}
          <div className="form-group">
            <label className="label">Name *</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Raj, Priya, Boss..."
              value={form.name}
              onChange={e => handleFormChange('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
            />
          </div>

          {/* Emoji picker (simple buttons) */}
          <div className="form-group">
            <label className="label">Avatar</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleFormChange('emoji', emoji)}
                  style={{
                    background: form.emoji === emoji ? 'rgba(32, 129, 138, 0.12)' : 'rgba(24, 35, 53, 0.04)',
                    border: `1px solid ${form.emoji === emoji ? '#20818a' : 'rgba(24, 35, 53, 0.08)'}`,
                    borderRadius: '8px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    transition: 'all 0.15s'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship dropdown */}
          <div className="form-group">
            <label className="label">Relationship</label>
            <select
              className="select"
              value={form.relationship}
              onChange={e => handleFormChange('relationship', e.target.value)}
            >
              {RELATIONSHIPS.map(rel => (
                <option key={rel} value={rel}>{rel}</option>
              ))}
            </select>
          </div>

          {/* Default mood dropdown */}
          <div className="form-group">
            <label className="label">Default Tone / Mood</label>
            <select
              className="select"
              value={form.currentMood}
              onChange={e => handleFormChange('currentMood', e.target.value)}
            >
              {MOODS.map(mood => (
                <option key={mood} value={mood}>{mood}</option>
              ))}
            </select>
          </div>

          {/* Extra notes */}
          <div className="form-group">
            <label className="label">Extra Notes (optional)</label>
            <textarea
              className="textarea"
              placeholder="e.g. We always talk about cricket, they use a lot of memes..."
              value={form.notes}
              onChange={e => handleFormChange('notes', e.target.value)}
              rows={2}
              style={{ minHeight: '60px' }}
            />
          </div>

          {/* Error display */}
          {formError && (
            <div className="alert alert-error" style={{ marginBottom: '12px' }}>
              {formError}
            </div>
          )}

          {/* Submit button */}
          <button className="btn btn-primary btn-block" onClick={handleAddPerson}>
            ✓ Save Person
          </button>
        </div>
      )}

      {/* ---- Persons List ---- */}
      {persons.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">👥</span>
          <p className="empty-state-text">
            No people added yet.<br />
            <strong>Tip:</strong> Open a chat on WhatsApp Web while Chitti is active and a profile will be created automatically!
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            + Add First Person
          </button>
        </div>
      ) : (
        <div>
          <p className="section-title">Saved People</p>
          {persons.map(person => (
            <PersonCard
              key={person.name}
              person={person}
              onUpload={(p) => navigate('upload', { person: p })}
              onReply={(p) => navigate('reply', { person: p, message: '' })}
              onDelete={deletePerson}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default PersonManager
