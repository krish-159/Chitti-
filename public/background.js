// ============================================================
// background.js — The Brain That Runs in the Background
// ============================================================
// This is a Chrome "Service Worker" — it runs silently even
// when the popup is closed. Its jobs:
//
//  1. Receive GENERATE_REPLY requests from content.js
//     → Load chat history from storage
//     → Build a system prompt that teaches AI to mimic the user
//     → Call Groq API
//     → Return the reply
//
//  2. Receive GENERATE_SUGGESTION requests
//     → Similar to above but for suggestion/autocomplete mode
//
// VIVA TIP: We call the API from background.js (not content.js)
// because background.js can access chrome.storage directly and
// doesn't have Content Security Policy (CSP) restrictions.
// ============================================================


// ============================================================
// SECTION 1: MESSAGE LISTENER
// Listens for requests from content.js or the popup
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Request to generate a full reply (Assistance + Agent mode)
  if (message.type === 'GENERATE_REPLY') {
    handleGenerateReply(message, sendResponse);
    return true; // IMPORTANT: return true means "I'll respond asynchronously later"
  }

  // Request to generate a suggestion/autocomplete (Suggestion mode)
  if (message.type === 'GENERATE_SUGGESTION') {
    handleGenerateSuggestion(message, sendResponse);
    return true;
  }

  // Popup tells us settings changed
  if (message.type === 'SETTINGS_UPDATED') {
    console.log('Chitti: Settings were updated');
    sendResponse({ success: true });
    return true;
  }
});


// ============================================================
// SECTION 2: GENERATE REPLY HANDLER
// For Assistance Mode and Agent Mode
// ============================================================

async function handleGenerateReply(message, sendResponse) {
  try {
    // Step 1: Load everything we need from Chrome storage
    const storageData = await chrome.storage.local.get([
      'chitti_apiKey',
      'chitti_settings',
      `chitti_history_${message.personName}` // Chat history for THIS specific person
    ]);

    const apiKey     = storageData['chitti_apiKey'] || '';
    const settings   = storageData['chitti_settings'] || {};
    
    // Prefer dynamically scraped history from the screen, fallback to saved storage
    const chatHistory = message.dynamicHistory || storageData[`chitti_history_${message.personName}`] || [];

    // Step 2: Check if we have an API key
    if (!apiKey) {
      sendResponse({
        success: false,
        error: '⚠️ No Groq API key found! Go to Chitti popup → Settings and add your key.'
      });
      return;
    }

    // Step 3: Call the Groq AI API
    const reply = await callGroqForReply(
      apiKey,
      chatHistory,
      message.incomingMessage,
      message.personName,
      message.personSettings || {},
      settings.model || 'llama-3.1-8b-instant' // Use model from settings
    );

    // Step 4: Send the reply back to content.js
    sendResponse({ success: true, reply });

  } catch (error) {
    console.error('Chitti background error (GENERATE_REPLY):', error);
    sendResponse({ success: false, error: error.message });
  }
}


// ============================================================
// SECTION 3: GENERATE SUGGESTION HANDLER
// For Suggestion Mode — completes what the user is typing
// ============================================================

async function handleGenerateSuggestion(message, sendResponse) {
  try {
    const storageData = await chrome.storage.local.get([
      'chitti_apiKey',
      'chitti_settings',
      `chitti_history_${message.personName}`
    ]);

    const apiKey      = storageData['chitti_apiKey'] || '';
    const settings    = storageData['chitti_settings'] || {};
    
    // Prefer dynamically scraped history from the screen, fallback to saved storage
    const chatHistory = message.dynamicHistory || storageData[`chitti_history_${message.personName}`] || [];

    if (!apiKey) {
      sendResponse({ success: false, error: 'No API key' });
      return;
    }

    const suggestion = await callGroqForSuggestion(
      apiKey,
      chatHistory,
      message.currentText,
      message.personName,
      message.personSettings || {},
      settings.model || 'llama-3.1-8b-instant'
    );

    sendResponse({ success: true, suggestion });

  } catch (error) {
    console.error('Chitti background error (GENERATE_SUGGESTION):', error);
    sendResponse({ success: false, error: error.message });
  }
}


// ============================================================
// SECTION 4: GROQ API CALL — Generate a Full Reply
// ============================================================

async function callGroqForReply(apiKey, chatHistory, incomingMessage, personName, personSettings, model) {
  // Build the system prompt (this teaches the AI HOW to mimic the user)
  const systemPrompt = buildReplySystemPrompt(chatHistory, personName, personSettings);

  // Call Groq's API (it follows the OpenAI API format)
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model, // Which Groq model to use (from settings)
      messages: [
        // System message = our instructions for the AI
        { role: 'system', content: systemPrompt },

        // User message = the actual task for this call
        {
          role: 'user',
          content: `${personName} just sent this message: "${incomingMessage}"\n\nWrite the reply now. Just the reply, nothing else.`
        }
      ],
      max_tokens: 250,   // Max reply length (250 tokens ≈ 180 words — enough for texting)
      temperature: 0.85  // Creativity: 0.0 = boring/repetitive, 1.0 = chaotic, 0.85 = natural
    })
  });

  // Handle API errors
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(`Groq API Error ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
  }

  const data  = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim();

  if (!reply) throw new Error('Groq returned an empty response. Try again.');
  return reply;
}


// ============================================================
// SECTION 5: GROQ API CALL — Generate a Suggestion/Autocomplete
// ============================================================

async function callGroqForSuggestion(apiKey, chatHistory, currentText, personName, personSettings, model) {
  // Use fewer messages for suggestion (we need a quick response)
  const recentMessages = chatHistory.slice(-30);
  const historyText = recentMessages.length > 0
    ? recentMessages.map(m => `${m.sender}: ${m.text}`).join('\n')
    : 'No history available.';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You complete text messages. The user is talking to ${personName} (${personSettings.relationship || 'friend'}).
Based on their writing style from past messages below, complete the message they started typing.
Output ONLY the complete message — including what they already typed. Keep it short and natural.

PAST WRITING STYLE (User's messages only):
${historyText}`
        },
        {
          role: 'user',
          content: `The user started typing: "${currentText}"\n\nComplete this message in their style:`
        }
      ],
      max_tokens: 120,  // Suggestions should be short
      temperature: 0.75 // Slightly less creative for suggestions
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(`Groq API Error ${response.status}: ${errorBody.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}


// ============================================================
// SECTION 6: SYSTEM PROMPT BUILDER
// This is the most important part — it teaches the AI to
// sound EXACTLY like the user, not like a generic AI.
// ============================================================

function buildReplySystemPrompt(chatHistory, personName, personSettings) {
  // Take only the last 60 messages to stay within the AI's token limit
  // VIVA TIP: "Token" = roughly one word. AI models have a max input size
  // (called "context window"). We limit to 60 messages to stay safe.
  const recentMessages = chatHistory.slice(-60);

  // Format the chat history as a readable dialogue
  // Label the user's messages as "User" and the other person's as the person's name
  const historyText = recentMessages.length > 0
    ? recentMessages
        .map(msg => {
          const senderName = msg.sender ? msg.sender : (msg.isUser ? 'User' : personName);
          return `${senderName}: ${msg.text}`;
        })
        .join('\n')
    : `No chat history yet. Reply in a natural, ${personSettings.currentMood || 'casual'} tone.`;

  // Get context about this person
  const relationship = personSettings.relationship  || 'friend';
  const mood         = personSettings.currentMood   || 'casual';
  const notes        = personSettings.notes         || '';

  // This is the SYSTEM PROMPT — the instruction manual we give the AI
  return `You are mimicking a specific person's (the "User") texting style. Your ONLY job is to write a reply that sounds EXACTLY like the User would write — their vocabulary, humor, emoji use, reply length, and punctuation habits.

RELATIONSHIP CONTEXT:
- The User's relationship with ${personName}: ${relationship}
- Mood/tone for this reply: ${mood}
- Special notes: ${notes || 'None'}

PAST CONVERSATION — Learn the User's style from the "User:" lines:
${historyText}

YOUR STRICT RULES:
1. Output ONLY the reply — no quotes, no "Reply:", no explanation
2. Match vocabulary: if they use "bro", "lol", "fr", "ngl", use those
3. Match emoji patterns exactly (or the lack of emojis)
4. Match reply LENGTH — short texter = short reply, long texter = longer reply
5. Match punctuation — if they skip periods, skip them. If they use "..." a lot, use it
6. Sound 100% human and real — not like an AI assistant
7. Do NOT be formal unless their style is always formal
8. Max 4 sentences unless the User normally writes more`;
}
