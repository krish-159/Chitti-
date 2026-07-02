// App.jsx — The Root Component (Main Controller)
// This component decides WHICH screen to show
// It's like a TV remote — it switches channels (screens)

import React, { useState } from 'react'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import PersonManager from './pages/PersonManager.jsx'
import ChatUploader from './pages/ChatUploader.jsx'
import ReplyDraft from './pages/ReplyDraft.jsx'
import Settings from './pages/Settings.jsx'

function App() {
  // currentScreen = which page is showing right now
  // We start on 'home' screen
  const [currentScreen, setCurrentScreen] = useState('home')

  // selectedPerson = the person card the user clicked on
  const [selectedPerson, setSelectedPerson] = useState(null)

  // incomingMessage = the message someone sent (for reply generation)
  const [incomingMessage, setIncomingMessage] = useState('')

  // navigate() — this function switches screens
  // Call it like: navigate('settings') or navigate('upload', { person: personObject })
  const navigate = (screen, data = {}) => {
    setCurrentScreen(screen)
    if (data.person !== undefined) setSelectedPerson(data.person)
    if (data.message !== undefined) setIncomingMessage(data.message)
  }

  // Decide which page component to render based on currentScreen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <Home navigate={navigate} />

      case 'persons':
        return <PersonManager navigate={navigate} />

      case 'upload':
        return <ChatUploader navigate={navigate} person={selectedPerson} />

      case 'reply':
        return <ReplyDraft navigate={navigate} person={selectedPerson} incomingMessage={incomingMessage} />

      case 'settings':
        return <Settings navigate={navigate} />

      default:
        return <Home navigate={navigate} />
    }
  }

  return (
    <div className="app-container">
      {/* Top navigation bar */}
      <Navbar currentScreen={currentScreen} navigate={navigate} />

      {/* Main content area — changes based on currentScreen */}
      <main className="main-content">
        <div className="fade-in">
          {renderScreen()}
        </div>
      </main>
    </div>
  )
}

export default App
