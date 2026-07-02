// Navbar.jsx — Top Navigation Bar
// Shows the Chitti logo and navigation buttons
// Props: currentScreen (which page is active), navigate (function to switch screens)

import React from 'react'

function Navbar({ currentScreen, navigate }) {
  return (
    <nav className="navbar">
      {/* ---- Left: Chitti Logo (click to go Home) ---- */}
      <div className="navbar-logo" onClick={() => navigate('home')} title="Home">
        <img
          src="icons/icon48.png"
          alt="Chitti Mascot"
          style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain' }}
        />
        <span className="navbar-logo-text">Chitti</span>
      </div>

      {/* ---- Right: Navigation icon buttons ---- */}
      <div className="navbar-actions">
        {/* People icon — go to Person Manager */}
        <button
          className={`navbar-btn ${currentScreen === 'persons' ? 'active' : ''}`}
          onClick={() => navigate('persons')}
          title="Manage People"
        >
          👥
        </button>

        {/* Settings icon */}
        <button
          className={`navbar-btn ${currentScreen === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('settings')}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </nav>
  )
}

export default Navbar
