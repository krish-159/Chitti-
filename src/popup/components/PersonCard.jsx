// PersonCard.jsx — Shows a saved person in the list
//
// Props:
//   person      - the person object { name, relationship, messageCount, emoji }
//   onUpload    - called when "Upload Chat" button is clicked
//   onReply     - called when "Get Reply" button is clicked
//   onDelete    - called when delete button is clicked

import React from 'react'

function PersonCard({ person, onUpload, onReply, onDelete }) {
  return (
    <div className="person-card card card-sm" style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Avatar circle with emoji or first letter */}
        <div className="person-avatar">
          {person.emoji || person.name.charAt(0).toUpperCase()}
        </div>

        {/* Person info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="person-name">{person.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span className="badge badge-cyan">{person.relationship}</span>
            {/* Show message count */}
            {person.messageCount > 0 && (
              <span className="badge badge-indigo">
                💬 {person.messageCount} msgs
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {/* Upload chat history */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onUpload(person)}
            title="Upload chat history"
          >
            📁
          </button>

          {/* Generate reply */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onReply(person)}
            title="Generate Reply"
          >
            🤖
          </button>

          {/* Delete person */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onDelete(person.name)}
            title="Delete"
            style={{ color: '#ef4444' }}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Progress bar showing how much chat data is available */}
      {person.messageCount > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px'
          }}>
            <span className="text-sm text-muted">Chat data quality</span>
            <span className="text-sm text-muted">
              {getDataQuality(person.messageCount)}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{
            height: '3px',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (person.messageCount / 700) * 100)}%`,
              background: getBarColor(person.messageCount),
              borderRadius: '999px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

// Helper: Quality label based on message count
function getDataQuality(count) {
  if (count >= 700) return '🟢 Excellent'
  if (count >= 400) return '🟡 Good'
  if (count >= 200) return '🟠 Basic'
  return '🔴 Needs more data'
}

// Helper: Progress bar color based on message count
function getBarColor(count) {
  if (count >= 700) return 'linear-gradient(90deg, #10b981, #06b6d4)'
  if (count >= 400) return 'linear-gradient(90deg, #f59e0b, #10b981)'
  if (count >= 200) return 'linear-gradient(90deg, #ef4444, #f59e0b)'
  return '#ef4444'
}

export default PersonCard
