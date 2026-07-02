// chatParser.js — WhatsApp Chat Export Parser
// ============================================================
// WhatsApp lets you export chats as .txt files.
// This file reads that .txt content and converts it into
// a structured array of message objects.
//
// VIVA TIP: Parsing means reading raw text and extracting
// useful structured data from it. Like reading a resume and
// pulling out the name, skills, and experience separately.
//
// WHATSAPP EXPORT FORMAT:
// [03/07/2025, 10:30:45] John: Hey what's up?
// [03/07/2025, 10:31:02] Me: nothing much lol
// [03/07/2025, 10:31:15] John: haha same
//
// After parsing, we get:
// [
//   { sender: 'John', text: 'Hey what's up?', timestamp: '...' },
//   { sender: 'Me', text: 'nothing much lol', timestamp: '...' },
//   ...
// ]
// ============================================================

// ---- Parse WhatsApp .txt export ----
export function parseWhatsAppChat(rawText, userName) {
  // Split the text into individual lines
  const lines = rawText.split('\n')

  // Array to store parsed messages
  const messages = []

  // WhatsApp format patterns to detect messages
  // Format 1: [DD/MM/YYYY, HH:MM:SS] Name: Message
  // Format 2: DD/MM/YYYY, HH:MM - Name: Message (older WhatsApp versions)
  const messagePattern = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]?\s*[-–]\s*(.+?):\s*(.+)$/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines
    if (!line) continue

    // Skip WhatsApp system messages
    if (isSystemMessage(line)) continue

    // Try to match the message pattern
    const match = line.match(messagePattern)

    if (match) {
      const date    = match[1]  // e.g. "03/07/2025"
      const time    = match[2]  // e.g. "10:30:45"
      const sender  = match[3]  // e.g. "John" or "Me"
      const text    = match[4]  // e.g. "Hey what's up?"

      // Skip media messages (WhatsApp shows these as placeholders)
      if (isMediaMessage(text)) continue

      // Skip very long messages (likely copied articles or forwards)
      if (text.length > 500) continue

      messages.push({
        sender: sender.trim(),
        text: text.trim(),
        timestamp: `${date} ${time}`,
        isUser: isUserMessage(sender, userName)  // Is this the user's own message?
      })

      // Handle multi-line messages (continuation from previous line)
    } else if (messages.length > 0 && !line.match(/^\[?\d{1,2}\/\d/)) {
      // This line doesn't start with a date — it's continuation of the last message
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && line.length < 300) {
        lastMessage.text += ' ' + line
      }
    }
  }

  return messages
}

// ---- Check if a line is a WhatsApp system message ----
function isSystemMessage(line) {
  const systemPatterns = [
    'Messages and calls are end-to-end encrypted',
    'created this group',
    'added you',
    'left',
    'changed the subject',
    'changed this group',
    'Your security code with',
    'This message was deleted',
    'null',
    'changed their phone number',
    'joined using this group\'s invite link',
    'security code changed'
  ]

  return systemPatterns.some(pattern =>
    line.toLowerCase().includes(pattern.toLowerCase())
  )
}

// ---- Check if a message is a media placeholder ----
function isMediaMessage(text) {
  const mediaPatterns = [
    '<Media omitted>',
    'image omitted',
    'video omitted',
    'audio omitted',
    'document omitted',
    'sticker omitted',
    'GIF omitted',
    'Contact card omitted',
    'Location:',
    '‎‪',
  ]

  return mediaPatterns.some(pattern =>
    text.toLowerCase().includes(pattern.toLowerCase())
  )
}

// ---- Determine if a message was sent by the user ----
function isUserMessage(senderName, userName) {
  if (!userName) return false

  // Check if sender name matches the user's name (case-insensitive)
  return senderName.toLowerCase().includes(userName.toLowerCase()) ||
         senderName.toLowerCase() === 'you' ||
         senderName.toLowerCase() === 'me'
}

// ---- Parse manually pasted chat text (generic format) ----
// For when users paste chat in any format (not just WhatsApp)
export function parseManualChat(rawText, myName, theirName) {
  const lines = rawText.split('\n').filter(line => line.trim())
  const messages = []

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    // Check if line starts with known names
    if (myName && trimmedLine.toLowerCase().startsWith(myName.toLowerCase() + ':')) {
      messages.push({
        sender: myName,
        text: trimmedLine.substring(myName.length + 1).trim(),
        isUser: true
      })
    } else if (theirName && trimmedLine.toLowerCase().startsWith(theirName.toLowerCase() + ':')) {
      messages.push({
        sender: theirName,
        text: trimmedLine.substring(theirName.length + 1).trim(),
        isUser: false
      })
    }
    // If line doesn't match either name pattern, skip it
  }

  return messages
}

// ---- Get statistics about the parsed chat ----
export function getChatStats(messages, userName) {
  const userMessages   = messages.filter(m => m.isUser)
  const theirMessages  = messages.filter(m => !m.isUser)
  const totalMessages  = messages.length

  // Calculate average user message length
  const avgLength = userMessages.length > 0
    ? Math.round(userMessages.reduce((sum, m) => sum + m.text.length, 0) / userMessages.length)
    : 0

  // Find most used words (basic analysis)
  const allUserText = userMessages.map(m => m.text).join(' ').toLowerCase()
  const wordCount = {}
  allUserText.split(/\s+/).forEach(word => {
    if (word.length > 3) { // Only count words longer than 3 chars
      wordCount[word] = (wordCount[word] || 0) + 1
    }
  })

  return {
    totalMessages,
    userMessageCount: userMessages.length,
    theirMessageCount: theirMessages.length,
    avgUserMessageLength: avgLength,
    dataQuality: getDataQualityLevel(userMessages.length)
  }
}

// ---- Data quality level based on user message count ----
function getDataQualityLevel(userMessageCount) {
  if (userMessageCount >= 700) return { level: 'excellent', color: '#10b981' }
  if (userMessageCount >= 400) return { level: 'good',      color: '#f59e0b' }
  if (userMessageCount >= 200) return { level: 'basic',     color: '#f97316' }
  return { level: 'insufficient', color: '#ef4444' }
}

// ---- Save parsed chat to Chrome storage ----
export function saveChatHistory(personName, messages) {
  return new Promise((resolve, reject) => {
    const storageKey = `chitti_history_${personName}`
    chrome.storage.local.set({ [storageKey]: messages }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(messages.length)
      }
    })
  })
}

// ---- Load chat history for a person from Chrome storage ----
export function loadChatHistory(personName) {
  return new Promise((resolve) => {
    const storageKey = `chitti_history_${personName}`
    chrome.storage.local.get([storageKey], (data) => {
      resolve(data[storageKey] || [])
    })
  })
}
