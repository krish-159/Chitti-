// usePersons.js — Custom Hook for Managing Saved People
// ============================================================
// This hook handles all Create / Read / Update / Delete operations
// for the list of people the user has saved.
//
// VIVA TIP: A "custom hook" in React is just a regular JavaScript
// function that starts with "use" and can use React's useState/useEffect.
// We use it to separate data logic from UI logic.
//
// STORAGE: We use chrome.storage.local (Chrome's version of localStorage)
// because it's shared between the popup, background, and content scripts.
// Regular localStorage is separate for each browser context.
// ============================================================

import { useState, useEffect } from 'react'

// The key we use to store persons in Chrome storage
const PERSONS_KEY = 'chitti_persons'

function usePersons() {
  // persons = array of person objects
  // Example: [{ name: "Raj", relationship: "best friend", emoji: "🧑", messageCount: 500 }]
  const [persons, setPersons] = useState([])

  // Load persons from Chrome storage when the hook first runs
  useEffect(() => {
    loadPersons()
  }, [])

  // ---- Load persons from storage ----
  function loadPersons() {
    chrome.storage.local.get([PERSONS_KEY], (data) => {
      setPersons(data[PERSONS_KEY] || [])
    })
  }

  // ---- Add a new person ----
  function addPerson(personData) {
    // personData = { name, relationship, emoji, notes, currentMood }

    // Check: don't add duplicate names
    const alreadyExists = persons.find(
      p => p.name.toLowerCase() === personData.name.toLowerCase()
    )
    if (alreadyExists) return false

    // Create the full person object
    const newPerson = {
      name: personData.name,
      relationship: personData.relationship || 'friend',
      emoji: personData.emoji || '👤',
      notes: personData.notes || '',
      currentMood: personData.currentMood || 'casual',
      messageCount: 0,           // No chat history yet
      dateAdded: Date.now()      // Timestamp of when person was added
    }

    const updatedPersons = [...persons, newPerson]

    // Save to Chrome storage
    chrome.storage.local.set({ [PERSONS_KEY]: updatedPersons }, () => {
      setPersons(updatedPersons) // Also update React state
    })

    return true
  }

  // ---- Update an existing person's settings ----
  function updatePerson(personName, updatedFields) {
    const updatedPersons = persons.map(p =>
      p.name === personName
        ? { ...p, ...updatedFields } // Merge new fields into old object
        : p
    )

    chrome.storage.local.set({ [PERSONS_KEY]: updatedPersons }, () => {
      setPersons(updatedPersons)
    })
  }

  // ---- Update message count (called after uploading chat history) ----
  function updateMessageCount(personName, count) {
    updatePerson(personName, { messageCount: count })
  }

  // ---- Delete a person AND their chat history ----
  function deletePerson(personName) {
    const updatedPersons = persons.filter(p => p.name !== personName)

    // Also delete their chat history from storage
    const historyKey = `chitti_history_${personName}`
    chrome.storage.local.remove([historyKey], () => {
      chrome.storage.local.set({ [PERSONS_KEY]: updatedPersons }, () => {
        setPersons(updatedPersons)
      })
    })
  }

  // Return everything the component needs
  return {
    persons,
    addPerson,
    updatePerson,
    updateMessageCount,
    deletePerson,
    refreshPersons: loadPersons
  }
}

export default usePersons
