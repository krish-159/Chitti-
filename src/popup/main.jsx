// main.jsx — Entry Point of the React App
// This is the very first file React runs
// It finds <div id="root"> in popup.html and mounts the entire app there

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
