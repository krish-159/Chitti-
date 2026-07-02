// groqService.js — Groq API Integration
// ============================================================
// This file handles all communication with Groq's AI API.
// It can be called from BOTH the popup (React) and background.js.
//
// VIVA TIP: An API (Application Programming Interface) is like a
// waiter at a restaurant. You (the frontend) tell the waiter (API)
// what you want. The waiter goes to the kitchen (Groq's AI servers)
// and brings back your food (the AI reply).
//
// HOW IT WORKS:
// 1. We send a "system prompt" (instructions for the AI)
// 2. We add the chat history (so AI knows how the user talks)
// 3. We send the incoming message
// 4. Groq returns the generated reply
// ============================================================

// ---- The Groq API endpoint URL ----
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// ---- Build the system prompt that teaches AI to mimic the user ----
export function buildSystemPrompt(chatHistory, person) {
  // Take only the most recent 60 messages (to stay within AI token limits)
  // "Tokens" = words + punctuation. AI models have a max input size.
  const recentMessages = chatHistory.slice(-60)

  // Format chat history as a readable dialogue
  const historyText = recentMessages.length > 0
    ? recentMessages
        .map(msg => `${msg.sender}: ${msg.text}`)
        .join('\n')
    : 'No chat history available yet. Reply in a friendly, casual tone.'

  // Person-specific context
  const relationship = person?.relationship || 'friend'
  const mood        = person?.currentMood  || 'casual'
  const extraNotes  = person?.notes        || ''

  // The full prompt — this is the most important piece of Chitti
  return `You are mimicking a specific person's texting style. Your ONLY job is to generate a reply that sounds EXACTLY like this person would write it — their vocabulary, their humor, their emoji use, their reply length, their punctuation habits.

RELATIONSHIP: The user's relationship with ${person?.name || 'this person'} is: ${relationship}
CURRENT TONE: Reply in a ${mood} mood
SPECIAL NOTES: ${extraNotes || 'None'}

PAST CONVERSATION (LEARN THE USER'S STYLE FROM THIS — every "User" message is written by the person you are mimicking):
${historyText}

YOUR STRICT RULES:
1. Only output the reply — no quotes, no "Reply:", no explanation
2. Match vocabulary: if they use slang like "bro", "lol", "fr", "ngl", use it
3. Match emoji patterns exactly (or match the lack of emojis)
4. Match reply LENGTH — short texter stays short, long texter stays long
5. Match punctuation style — some people don't use periods. Some use "..." everywhere
6. Sound 100% human and natural
7. DO NOT be formal unless the user is always formal
8. Maximum 4 sentences unless the user normally writes more`
}

// ---- Main function: Call Groq AI and get a reply ----
export async function generateReply({ apiKey, chatHistory, incomingMessage, person, model }) {
  // Make sure we have an API key
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Please add your Groq API key in Settings first.')
  }

  // Build the prompt
  const systemPrompt = buildSystemPrompt(chatHistory, person)

  // Make the API call
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`, // Authentication header
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // Which AI model to use
      // llama-3.1-8b-instant = fast (good for real-time suggestions)
      // llama-3.3-70b-versatile = smarter but slower
      model: model || 'llama-3.1-8b-instant', // Use model from settings (passed in from caller)

      messages: [
        // System message = instructions for the AI
        { role: 'system', content: systemPrompt },

        // User message = the task for this specific call
        {
          role: 'user',
          content: `${person?.name || 'Someone'} just sent: "${incomingMessage}"\n\nWrite the reply now.`
        }
      ],

      max_tokens: 250,    // Max length of reply (250 tokens ≈ 180 words)
      temperature: 0.85,  // Creativity: 0.0 = robotic, 1.0 = wild, 0.85 = natural
    })
  })

  // Handle API errors
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = errorBody.error?.message || `HTTP ${response.status} error`
    throw new Error(`Groq API Error: ${errorMessage}`)
  }

  // Parse the JSON response
  const data = await response.json()

  // Extract the generated text from the response structure
  const reply = data.choices?.[0]?.message?.content?.trim()

  if (!reply) {
    throw new Error('Groq returned an empty reply. Try again.')
  }

  return reply
}

// ---- Test if the API key works ----
export async function testApiKey(apiKey) {
  try {
    const testReply = await generateReply({
      apiKey,
      chatHistory: [],
      incomingMessage: 'hello',
      person: { name: 'Test', relationship: 'friend', currentMood: 'casual' }
    })
    return { valid: true, message: 'API key works! ✓' }
  } catch (error) {
    return { valid: false, message: error.message }
  }
}
