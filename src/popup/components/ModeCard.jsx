// ModeCard.jsx — Displays one of the 3 Chitti Modes
// Used on the Home screen to show Agent / Assistance / Suggestion mode cards
//
// Props:
//   icon       - emoji icon for the mode
//   title      - mode name
//   description- what the mode does
//   badge      - label like "Auto" or "Manual"
//   badgeType  - color of badge: 'indigo' | 'cyan' | 'green'
//   isActive   - is this the currently selected mode?
//   onClick    - function called when card is clicked

import React from 'react'

function ModeCard({ icon, title, description, badge, badgeType = 'indigo', isActive, onClick }) {
  return (
    <div
      className={`mode-card card ${isActive ? 'mode-card-active' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer', marginBottom: '10px' }}
    >
      {/* Card inner layout */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Icon circle */}
        <div className="mode-card-icon">
          {icon}
        </div>

        {/* Text content */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="mode-card-title">{title}</span>
            <span className={`badge badge-${badgeType}`}>{badge}</span>
            {/* Show active indicator */}
            {isActive && <span className="badge badge-green">● Active</span>}
          </div>
          <p className="mode-card-desc">{description}</p>
        </div>
      </div>

      {/* Glow line at bottom when active */}
      {isActive && <div className="mode-card-glow-line" />}
    </div>
  )
}

export default ModeCard
