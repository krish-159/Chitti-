// Home.jsx — Dashboard (First screen the user sees)
// Shows: Active mode, 3 mode cards, quick stats, quick actions

import React from 'react'
import ModeCard from '../components/ModeCard.jsx'
import useSettings from '../hooks/useSettings.js'
import usePersons from '../hooks/usePersons.js'

function Home({ navigate }) {
  // Get settings (to show which mode is active)
  const { settings, setMode, setAutoPilot } = useSettings()

  // Get persons (to show count in stats)
  const { persons } = usePersons()

  // Count total messages across all persons
  const totalMessages = persons.reduce((sum, p) => sum + (p.messageCount || 0), 0)

  return (
    <div className="home-page">

      {/* ---- Hero Section ---- */}
      <div className="home-hero">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <img
            src="icons/logo.png"
            alt="Chitti Mascot Logo"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              boxShadow: 'var(--shadow-glow)',
              border: '2px solid var(--indigo)',
              padding: '3px',
              background: '#ffffff'
            }}
          />
        </div>
        <div className="home-hero-badge">
          <span className="badge badge-indigo">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--indigo)', display: 'inline-block' }} />
            &nbsp;Active
          </span>
        </div>
        <h1 className="home-hero-title">
          Your AI <span className="gradient-text">Communication</span> Twin
        </h1>
        <p className="home-hero-sub">
          Chitti mimics how YOU talk to each person, in your exact tone and style.
        </p>
      </div>

      {/* ---- Quick Stats Row ---- */}
      <div className="stats-row">
        <div className="stat-card card card-sm">
          <div className="stat-value">{persons.length}</div>
          <div className="stat-label">People Added</div>
        </div>
        <div className="stat-card card card-sm">
          <div className="stat-value">{totalMessages.toLocaleString()}</div>
          <div className="stat-label">Messages Learned</div>
        </div>
        <div className="stat-card card card-sm">
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>
            {settings.mode}
          </div>
          <div className="stat-label">Current Mode</div>
        </div>
      </div>

      {/* ---- Auto-Pilot (Grammarly Mode) Toggle ---- */}
      <div className="card" style={{ marginBottom: '16px', background: 'linear-gradient(145deg, rgba(32,129,138,0.1) 0%, rgba(24,35,53,0.8) 100%)', border: '1px solid rgba(32,129,138,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span> Auto-Pilot
              {settings.autoPilot && <span className="badge badge-green" style={{ fontSize: '10px', padding: '2px 6px' }}>Active</span>}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Like Grammarly, but for chat. Click any text box to auto-generate and paste a reply.
            </p>
          </div>
          {/* Custom Toggle Switch */}
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}>
            <div style={{
              position: 'relative', width: '44px', height: '24px',
              background: settings.autoPilot ? 'var(--cyan)' : 'var(--bg-card-hover)',
              borderRadius: '999px', transition: '0.3s'
            }}>
              <div style={{
                position: 'absolute', top: '2px', left: settings.autoPilot ? '22px' : '2px',
                width: '20px', height: '20px', background: '#fff',
                borderRadius: '50%', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
            <input
              type="checkbox"
              style={{ display: 'none' }}
              checked={settings.autoPilot || false}
              onChange={(e) => setAutoPilot(e.target.checked)}
            />
          </label>
        </div>
      </div>

      {/* ---- Mode Selection Section ---- */}
      <div style={{ marginBottom: '6px' }}>
        <p className="section-title">Manual Modes</p>
      </div>

      {/* Mode Card 1: Suggestion Mode */}
      <ModeCard
        icon="💡"
        title="Suggestion Mode"
        description="Chitti shows a ghost reply suggestion while you type. You decide to use it or not."
        badge="Manual"
        badgeType="indigo"
        isActive={settings.mode === 'suggestion'}
        onClick={() => setMode('suggestion')}
      />

      {/* Mode Card 2: Assistance Mode */}
      <ModeCard
        icon="🤝"
        title="Assistance Mode"
        description="Set your mood and relationship context. Chitti drafts a reply for you to review before sending."
        badge="Semi-auto"
        badgeType="cyan"
        isActive={settings.mode === 'assistance'}
        onClick={() => setMode('assistance')}
      />

      {/* Mode Card 3: Agent Mode */}
      <ModeCard
        icon="🤖"
        title="Agent Mode"
        description="Chitti auto-generates and injects replies for incoming messages. Full autopilot mode."
        badge="Auto"
        badgeType="green"
        isActive={settings.mode === 'agent'}
        onClick={() => setMode('agent')}
      />

      {/* ---- Quick Action Buttons ---- */}
      <div className="divider" />

      <div style={{ display: 'flex', gap: '10px' }}>
        {/* Add a person */}
        <button
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={() => navigate('persons')}
        >
          👥 Manage People
        </button>

        {/* Quick reply generate */}
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => navigate('reply', { person: null })}
        >
          🤖 Get Reply
        </button>
      </div>

      {/* Tip banner */}
      {persons.length === 0 && (
        <div className="alert alert-info" style={{ marginTop: '12px' }}>
          👆 Open any chat on WhatsApp Web! Chitti will automatically extract your chat history and create a profile.
        </div>
      )}
    </div>
  )
}

export default Home
