// ============================================================
// content.js — Chitti's Main Content Script (All 3 Modes)
// ============================================================
// This file is automatically injected into EVERY website.
// It powers all three Chitti modes:
//
//  MODE 1: ASSISTANCE MODE
//    → A floating ⚡ button appears near any text input
//    → User clicks it, selects a person, gets a reply
//    → Reviews the reply, clicks Insert
//
//  MODE 2: AGENT MODE (Full Autopilot)
//    → A MutationObserver watches the page 24/7
//    → When a new incoming message is detected, Chitti
//      auto-generates a reply and auto-sends it
//    → A 3-second countdown toast shows so user can cancel
//
//  MODE 3: SUGGESTION MODE
//    → Chitti watches what the user is typing
//    → After 1.5 seconds of pause, it suggests a full reply
//    → A suggestion bar appears below the text box
//    → User presses Tab to accept the suggestion
//
// VIVA TIP: This is exactly how Grammarly works!
// It injects into every page, watches for text inputs,
// and adds its own floating UI. Platforms can't block this
// because it runs at the browser (Chrome Extension) level,
// not the website level.
// ============================================================


// ============================================================
// SECTION 1: GLOBAL STATE VARIABLES
// ============================================================

const CHITTI_ICON_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAAB9klEQVR4nJWSS2sUQRDHq6u757HZXXX2oSxZWJ8YSAyJK34HL549JOBNkm/iyVvOXrzGq4KXgCSIoIi6kPhIzLiJromJMZOZ3Zkq6dnZjSIebBq6uqk/v/pXl+BwD/5nqb+fEiIhBAAIgPSENPyHgJml60BCQATMxAIFACdDzR8CIkKtHzx7tbF/MNO8UsS42P1ATgPtE0BJHyeGHmJKlJt/svr+1v3F2khuxNIk1b0b49frXoKjEjJBRmBmVFZna3vh4eN6azX02ztEqnb6bq+3MHuzXDIABAYQOCiGUWvf33q98lJLimxFOV101Jvl5/6nz6htZpMNAH0BS4nJUTDVnJibn/nWBfeUB/ni+s/unfnZ6WsTydGhRARDyDwYNREBIlv23OKjvYPDq43Rk65ze+qyAsUUI1CfMDDNBJbVjeK3rbVyxcuXvB+730tSdIK4UYrAKoDygGMAobJu2u7S0vK6/2Vzsx0EwXRzsrX2MadVFMVj56uT42NnL1Up7CGmAmMIZXu7EwbBhXP1asV7uvKidqaqtGIm/2twMRr+G5uSGFiAIIDWu41SsaCU7MWJbeud3X1EWXBFtVJOazFWMw/cxyjVDcOEGIVg5nSihO2khrN+Hv+0aVn6gIY+uPXrHYyeIWSgdJssZjrOToPfBtYIfwH2s+1jFJghAgAAAABJRU5ErkJggg==';

let currentMode = 'assistance';   // Which mode is currently active
let savedPersons = [];             // Array of person objects saved by user
let savedApiKey = '';              // Groq API key from settings
let userName = 'Me';               // User's own name (for identifying their messages)

// --- Assistance Mode State ---
let chittiButton = null;          // The floating ⚡ button element
let chittiPanel = null;           // The expanded panel element
let activeElement = null;         // Text input currently focused by user
let isGenerating = false;         // Prevent double-clicking generate button

// --- Agent Mode State ---
let agentObserver = null;         // MutationObserver that watches for new messages
let agentActive = false;          // Whether agent mode is currently running
let processedMessages = new Set();// Track which messages we already replied to (async safe)
let pendingMessages   = new Set();// Synchronous lock — prevents double-fire from MutationObserver
let lastAgentReplyTime = 0;       // Global debounce for agent mode (prevents multiple triggers)

// --- Auto-Pilot (Grammarly) Mode State ---
let autoPilotActive = false;      // Whether Grammarly-style auto-pilot is ON
let autoPilotTimer  = null;       // Debounce timer — wait before generating after focus
let autoPilotLocked = false;      // Prevent firing again while a reply is being generated

// --- Auto-Profiler State ---
let autoProfilerInterval = null;  // Interval that checks for contact changes
let lastObservedContact = null;   // The last contact name we observed and profiled
let chatMessageObserver = null;   // Watches the chat container for scrolling/new messages

// --- Suggestion Mode State ---
let suggestionBar = null;         // The suggestion UI bar element
let currentSuggestion = '';       // The current AI suggestion text
let suggestionTimer = null;       // Debounce timer (waits for typing to pause)
let suggestionTargetEl = null;    // Which text input we're suggesting for


// ============================================================
// SECTION 2: INITIALIZATION
// Load settings from Chrome storage, then start the right mode
// ============================================================

function init() {
  // Load all saved data when content script first starts
  chrome.storage.local.get(
    ['chitti_persons', 'chitti_settings', 'chitti_apiKey', 'chitti_userName'],
    (data) => {
      savedPersons  = data.chitti_persons || [];
      savedApiKey   = data.chitti_apiKey || '';
      userName      = data.chitti_userName || 'Me';
      currentMode   = data.chitti_settings?.mode || 'assistance';

      // Set up all event listeners (mode-switching happens inside these)
      setupEventListeners();

      // If Agent Mode was saved as active, start it immediately
      if (currentMode === 'agent') {
        startAgentMode();
      } else if (currentMode === 'suggestion') {
        showToast('💡 Chitti Suggestion Mode is ON — pausing while typing will suggest replies', 3500);
      }

      // Start Auto-Pilot if it was previously ON
      if (data.chitti_settings?.autoPilot) {
        autoPilotActive = true;
        showToast('🤖 Chitti Auto-Pilot is ON — click any chat box for an instant reply', 3500);
      }

      // Always start the background auto-profiler to extract chat history
      startAutoProfiler();
    }
  );

  // IMPORTANT: Listen for real-time changes from the popup
  // When user changes mode in the popup, content.js immediately switches
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.chitti_settings) {
      const newMode = changes.chitti_settings.newValue?.mode;
      if (newMode && newMode !== currentMode) {
        switchMode(newMode);
      }
      // Handle Auto-Pilot toggle
      const newAutoPilot = changes.chitti_settings.newValue?.autoPilot;
      if (newAutoPilot !== undefined && newAutoPilot !== autoPilotActive) {
        if (newAutoPilot) {
          autoPilotActive = true;
          showToast('🤖 Auto-Pilot ON — click any chat input for an instant AI reply', 3000);
        } else {
          stopAutoPilot();
        }
      }
    }
    if (changes.chitti_persons) {
      savedPersons = changes.chitti_persons.newValue || [];
    }
    if (changes.chitti_apiKey) {
      savedApiKey = changes.chitti_apiKey.newValue || '';
    }
    if (changes.chitti_userName) {
      userName = changes.chitti_userName.newValue || 'Me';
    }
  });
}

// Switch between modes cleanly
function switchMode(newMode) {
  // Clean up old mode
  if (currentMode === 'agent')      stopAgentMode();
  if (currentMode === 'suggestion') stopSuggestionMode();
  // Hide assistance mode button too
  if (chittiButton) chittiButton.style.display = 'none';
  if (chittiPanel)  chittiPanel.style.display = 'none';

  currentMode = newMode;

  // Start new mode
  if (newMode === 'agent') {
    startAgentMode();
  } else if (newMode === 'suggestion') {
    showToast('💡 Suggestion Mode ON — type in any chat box and pause for a suggestion', 3000);
  } else if (newMode === 'assistance') {
    showToast('🤝 Assistance Mode ON — click the ⚡ button near any text box', 3000);
  }
}


// ============================================================
// SECTION 3: ASSISTANCE MODE
// Shows a floating ⚡ button whenever user clicks into a text input
// ============================================================

// Create the small floating ⚡ Chitti button
function createChittiButton() {
  if (chittiButton) return; // Don't create twice

  chittiButton = document.createElement('div');
  chittiButton.id = 'chitti-float-btn';
  chittiButton.innerHTML = `
    <img src="${CHITTI_ICON_BASE64}" alt="Chitti" style="width: 16px; height: 16px; border-radius: 4px; object-fit: contain; vertical-align: middle; margin-right: 4px;" />
    <span class="chitti-label">Chitti</span>
  `;

  // When button is clicked, open or close the panel
  chittiButton.addEventListener('mousedown', (e) => {
    e.preventDefault(); // IMPORTANT: prevents text input from losing focus
    e.stopPropagation();
    togglePanel();
  });

  document.body.appendChild(chittiButton);
}

// Create the expanded panel (person selector + generate button + reply)
function createChittiPanel() {
  if (chittiPanel) return;

  chittiPanel = document.createElement('div');
  chittiPanel.id = 'chitti-panel';
  chittiPanel.innerHTML = buildPanelHTML();

  document.body.appendChild(chittiPanel);
  setupPanelEvents();
}

// Build the HTML for the panel
function buildPanelHTML() {
  // Build person dropdown options from saved persons
  const personOptions = savedPersons.length > 0
    ? savedPersons.map(p =>
        `<option value="${p.name}">${p.name} (${p.relationship})</option>`
      ).join('')
    : '<option value="">No persons saved — open Chitti popup first</option>';

  // Mood options for override
  const moodOptions = ['casual','friendly','playful','professional','formal','loving','funny / sarcastic','serious']
    .map(m => `<option value="${m}">${m}</option>`).join('');

  return `
    <div class="chitti-panel-header">
      <span class="chitti-panel-logo">
        <img src="${CHITTI_ICON_BASE64}" alt="Chitti" style="width: 16px; height: 16px; border-radius: 4px; object-fit: contain; vertical-align: middle; margin-right: 2px;" />
        Chitti
      </span>
      <button class="chitti-close-btn" id="chitti-close">✕</button>
    </div>

    <div class="chitti-panel-body">

      <!-- Who are you replying to? -->
      <label class="chitti-label-text">Replying to:</label>
      <select class="chitti-select" id="chitti-person-select">
        <option value="">— Select a person —</option>
        ${personOptions}
      </select>

      <!-- Mood override (optional) -->
      <label class="chitti-label-text">Tone override (optional):</label>
      <select class="chitti-select" id="chitti-mood-select">
        <option value="">Use person's default mood</option>
        ${moodOptions}
      </select>

      <!-- What did they say? -->
      <label class="chitti-label-text">Their message (optional context):</label>
      <textarea
        class="chitti-textarea"
        id="chitti-context-input"
        placeholder="Paste what they said for better accuracy..."
        rows="2"
      ></textarea>

      <!-- Main generate button -->
      <button class="chitti-generate-btn" id="chitti-generate-btn">
        <span id="chitti-btn-text">🤖 Generate Reply</span>
      </button>

      <!-- Generated reply appears here -->
      <div class="chitti-reply-area" id="chitti-reply-area" style="display:none;">
        <div class="chitti-reply-text" id="chitti-reply-text"></div>
        <div class="chitti-reply-actions">
          <button class="chitti-insert-btn" id="chitti-insert-btn">✓ Insert</button>
          <button class="chitti-regen-btn" id="chitti-regen-btn">↻ Again</button>
        </div>
      </div>

      <!-- Error messages appear here -->
      <div class="chitti-error" id="chitti-error" style="display:none;"></div>

    </div>
  `;
}

// Attach event listeners to buttons inside the panel
function setupPanelEvents() {
  document.getElementById('chitti-close')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    hidePanel();
  });

  document.getElementById('chitti-generate-btn')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    generateReplyForAssistance();
  });

  document.getElementById('chitti-insert-btn')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    insertGeneratedReply();
  });

  document.getElementById('chitti-regen-btn')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    generateReplyForAssistance(); // Ask AI again
  });
}

// Position the button right below the focused text input
function positionButtonNearInput(inputEl) {
  const rect = inputEl.getBoundingClientRect();

  // Bottom-right of the text input
  chittiButton.style.left = `${Math.max(10, window.scrollX + rect.right - 105)}px`;
  chittiButton.style.top  = `${window.scrollY + rect.bottom + 6}px`;

  // Position panel above the input box
  if (chittiPanel && chittiPanel.style.display !== 'none') {
    const panelLeft = window.scrollX + rect.right - 310;
    const panelTop  = window.scrollY + rect.top - 10;
    chittiPanel.style.left = `${Math.max(10, panelLeft)}px`;
    chittiPanel.style.top  = `${Math.max(10, panelTop - 400)}px`;
  }
}

// Toggle the panel open/closed
function togglePanel() {
  if (!chittiPanel) createChittiPanel();

  const isVisible = chittiPanel.style.display === 'flex';

  if (isVisible) {
    hidePanel();
  } else {
    // Refresh persons list in case user added new ones in the popup
    chrome.storage.local.get(['chitti_persons'], (data) => {
      savedPersons = data.chitti_persons || [];
      const select = document.getElementById('chitti-person-select');
      
      const platform = detectPlatform();
      const contactName = getContactName(platform);
      const dynamicHistory = scrapeVisibleChatHistory(contactName, platform);
      
      if (select) {
        const opts = savedPersons.map(p =>
          `<option value="${p.name}">${p.name} (${p.relationship})</option>`
        ).join('');
        select.innerHTML = `<option value="">— Select a person —</option>${opts}`;
        
        // Auto-select the detected person
        let person = findPersonByName(contactName);
        if (!person && contactName) {
           person = { name: contactName, relationship: 'friend', currentMood: 'casual' };
           savedPersons.push(person);
           chrome.storage.local.set({ chitti_persons: savedPersons });
           select.innerHTML += `<option value="${person.name}">${person.name} (${person.relationship})</option>`;
        }
        if (person) {
           select.value = person.name;
        }
      }
      
      // Auto-fill context so user doesn't have to copy-paste
      const contextInput = document.getElementById('chitti-context-input');
      if (contextInput && dynamicHistory.length > 0) {
         // Get the last message from the other person
         const theirLastMsg = [...dynamicHistory].reverse().find(m => m.sender !== 'User');
         if (theirLastMsg) {
             contextInput.value = theirLastMsg.text;
         }
      }
    });

    chittiPanel.style.display = 'flex';
    positionButtonNearInput(activeElement);
    hideReplyArea();
    hideChittiError();
  }
}

function hidePanel() {
  if (chittiPanel) chittiPanel.style.display = 'none';
}

// Call Groq AI and generate a reply (Assistance Mode)
async function generateReplyForAssistance() {
  if (isGenerating) return;

  const personName    = document.getElementById('chitti-person-select')?.value;
  const moodOverride  = document.getElementById('chitti-mood-select')?.value || null;
  const theirMessage  = document.getElementById('chitti-context-input')?.value?.trim() || 'Hello';
  const generateBtn   = document.getElementById('chitti-generate-btn');
  const btnText       = document.getElementById('chitti-btn-text');

  // Validation
  if (!personName) {
    showChittiError('Please select a person first!');
    return;
  }
  if (!savedApiKey) {
    showChittiError('No API key! Add it in Chitti popup → Settings ⚙️');
    return;
  }

  // Show loading state
  isGenerating = true;
  btnText.textContent = '⏳ Generating...';
  generateBtn.disabled = true;
  hideReplyArea();
  hideChittiError();

  try {
    // Find the selected person's settings
    const person = savedPersons.find(p => p.name === personName) || {};

    // If user chose a mood override, use it for this request
    if (moodOverride) person.currentMood = moodOverride;

    // Send request to background.js (which calls the Groq API)
    // We use background.js because it can access chrome.storage and make API calls
    
    const platform = detectPlatform();
    const dynamicHistory = scrapeVisibleChatHistory(person.name, platform);

    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_REPLY',
      personName,
      incomingMessage: theirMessage,
      personSettings: person,
      dynamicHistory: dynamicHistory
    });

    if (response.success) {
      showGeneratedReply(response.reply);
    } else {
      showChittiError(response.error || 'Something went wrong. Check your API key in Settings.');
    }
  } catch (err) {
    showChittiError('Cannot connect to Chitti. Try reloading the page.');
    console.error('Chitti Assistance error:', err);
  } finally {
    // Reset button back to normal
    isGenerating = false;
    btnText.textContent = '🤖 Generate Reply';
    generateBtn.disabled = false;
  }
}

// Show the generated reply in the panel
function showGeneratedReply(replyText) {
  const replyArea = document.getElementById('chitti-reply-area');
  const replyEl   = document.getElementById('chitti-reply-text');
  if (replyArea && replyEl) {
    replyEl.textContent = replyText;
    replyArea.style.display = 'flex';
  }
}

// Insert the generated reply into the text box
let lastInsertTime = 0;
function insertGeneratedReply() {
  const now = Date.now();
  if (now - lastInsertTime < 1000) return; // Debounce clicks to prevent double insertion
  lastInsertTime = now;

  const replyText = document.getElementById('chitti-reply-text')?.textContent;
  if (!replyText || !activeElement) return;

  insertTextIntoElement(activeElement, replyText);
  hidePanel();
}


// ============================================================
// SECTION 4: AGENT MODE — Full Autopilot
// Watches the page 24/7 using MutationObserver.
// When a new incoming message is detected, auto-generates
// and auto-sends a reply in the user's style.
// ============================================================

function startAgentMode() {
  if (agentActive) return; // Don't start twice
  agentActive = true;

  console.log('🤖 Chitti: Agent Mode STARTED');
  showToast('🤖 Agent Mode ON — Chitti is watching for incoming messages', 4000);

  // Take a snapshot of all existing messages so we don't reply to old ones
  snapshotExistingMessages();

  // MutationObserver watches for DOM changes (new elements appearing)
  // VIVA TIP: MutationObserver is a browser API that fires a callback
  // whenever the DOM changes. WhatsApp/Instagram update their DOM when
  // new messages arrive, so we can detect new messages this way.
  agentObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        for (const newNode of mutation.addedNodes) {
          if (newNode.nodeType !== Node.ELEMENT_NODE) continue;
          // Check if this new element contains an incoming message
          handleNewDOMNode(newNode);
        }
      } else if (mutation.type === 'characterData' || mutation.type === 'attributes') {
        // For text changes or attribute updates, check the target node or its parent
        if (mutation.target.nodeType === Node.ELEMENT_NODE) {
          handleNewDOMNode(mutation.target);
        } else if (mutation.target.parentElement) {
          handleNewDOMNode(mutation.target.parentElement);
        }
      }
    }
  });

  // Watch the entire body for any DOM changes, including deep children
  agentObserver.observe(document.body, {
    childList: true,   // Watch for added/removed children
    subtree: true,     // Watch the whole DOM tree, not just direct children
    characterData: true, // Watch for text changes inside nodes
    attributes: true   // Sometimes WhatsApp updates data attributes instead of replacing nodes
  });
}

function stopAgentMode() {
  if (agentObserver) {
    agentObserver.disconnect(); // Stop watching
    agentObserver = null;
  }
  agentActive = false;
  processedMessages.clear();
  pendingMessages.clear();   // Also clear the synchronous lock
  console.log('🤖 Chitti: Agent Mode STOPPED');
  showToast('🤖 Agent Mode OFF', 2000);
}

// Build a set of existing message texts so we don't reply to them on page load
function snapshotExistingMessages() {
  const platform = detectPlatform();

  if (platform === 'whatsapp') {
    // WhatsApp Web: incoming messages have class 'message-in'
    document.querySelectorAll('.message-in').forEach(el => {
      const textEl = el.querySelector('.selectable-text span') || el.querySelector('span.copyable-text');
      const text = textEl?.textContent?.trim();
      if (text) {
        const key = text.substring(0, 100);
        processedMessages.add(key);
        pendingMessages.add(key); // Also lock in pendingMessages
      }
    });

  } else if (platform === 'instagram') {
    // Instagram DMs
    document.querySelectorAll('[role="row"]').forEach(el => {
      const text = el.textContent?.trim();
      if (text) {
        const key = text.substring(0, 100);
        processedMessages.add(key);
        pendingMessages.add(key);
      }
    });

  } else {
    // Generic: snapshot all visible text content
    document.querySelectorAll('[data-message-id], .message, .msg-in, .received').forEach(el => {
      const text = el.textContent?.trim();
      if (text) {
        const key = text.substring(0, 100);
        processedMessages.add(key);
        pendingMessages.add(key);
      }
    });
  }

  console.log(`Chitti: Snapshotted ${processedMessages.size} existing messages`);
}

// Check a newly added DOM node for incoming messages
function handleNewDOMNode(node) {
  const platform = detectPlatform();
  let messageInfo = null;

  // Try to extract message from this node based on the platform
  if (platform === 'whatsapp') {
    messageInfo = extractWhatsAppMessage(node);
  } else if (platform === 'instagram') {
    messageInfo = extractInstagramMessage(node);
  } else {
    messageInfo = extractGenericIncomingMessage(node);
  }

  if (!messageInfo) return; // Not a message we recognize
  if (!messageInfo.text)   return; // Empty message

  const messageKey = messageInfo.text.substring(0, 100);

  // DOUBLE-REPLY FIX:
  // MutationObserver fires multiple times for the same incoming message
  // (once for the parent div, once for child text nodes).
  // pendingMessages is a SYNCHRONOUS lock — updated immediately before the
  // async delay so subsequent DOM events for the same message bail out instantly.
  if (pendingMessages.has(messageKey)) return;
  pendingMessages.add(messageKey); // Lock synchronously RIGHT NOW

  // Also check the async-safe processed set (for page reloads / history)
  if (processedMessages.has(messageKey)) return;
  processedMessages.add(messageKey); // Mark as processed

  // GLOBAL DEBOUNCE: Ignore any new message nodes if we just queued a reply
  // in the last 2.5 seconds. This catches DOM re-renders where text changes slightly.
  const now = Date.now();
  if (now - lastAgentReplyTime < 2500) {
    return;
  }
  lastAgentReplyTime = now;

  // Find the contact name from the page
  const contactName = getContactName(platform);

  // Find that contact in our saved persons list
  let person = findPersonByName(contactName);

  if (!person) {
    // Zero-setup auto-creation
    person = {
      id: Date.now().toString(),
      name: contactName || 'Unknown Contact',
      relationship: 'friend', // default
      currentMood: 'casual',  // default
      messageCount: 0
    };
    
    // Auto-save them so they appear in the UI dashboard later
    chrome.storage.local.get(['chitti_persons'], (data) => {
      const existing = data.chitti_persons || [];
      if (!existing.some(p => p.name === person.name)) {
        existing.push(person);
        chrome.storage.local.set({ chitti_persons: existing });
        // Local state will also be updated by storage.onChanged listener in init()
      }
    });
    
    console.log(`Chitti Agent: Auto-created profile for "${contactName}"`);
  }

  // Add a small random delay (0.5s–2s) to feel more human
  const delay = 500 + Math.random() * 1500;
  setTimeout(() => {
    agentAutoReply(person, messageInfo.text, platform);
  }, delay);
}

// WhatsApp Web: Extract message text from a new DOM node
function extractWhatsAppMessage(node) {
  // Check if the node is (or contains) an incoming message
  // WhatsApp marks incoming messages with class 'message-in'
  
  // Element.closest() checks if the node itself or any of its ancestors match the selector
  const isOrInsideMsg = node.nodeType === Node.ELEMENT_NODE && node.closest?.('.message-in');
  const hasInMsg = node.querySelector?.('.message-in');

  if (!isOrInsideMsg && !hasInMsg) return null;

  // Find the actual wrapper
  const msgEl = isOrInsideMsg ? node.closest('.message-in') : node.querySelector('.message-in');

  // Try multiple selectors because WhatsApp updates its DOM structure often
  const textEl =
    msgEl?.querySelector('.selectable-text span') ||
    msgEl?.querySelector('span.copyable-text') ||
    msgEl?.querySelector('[data-pre-plain-text] + * span') ||
    msgEl?.querySelector('span[dir="ltr"]') ||
    msgEl?.querySelector('span[dir="auto"]');

  const text = textEl?.textContent?.trim();
  if (!text || text.length === 0) return null;

  return { text };
}

// Instagram: Extract message from new DOM node
function extractInstagramMessage(node) {
  // Instagram DM messages — try common selectors
  const isRow = node.getAttribute?.('role') === 'row';
  const hasRow = node.querySelector?.('[role="row"]');

  if (!isRow && !hasRow) return null;

  const rowEl = isRow ? node : node.querySelector('[role="row"]');
  const text = rowEl?.querySelector('[dir="auto"]')?.textContent?.trim() ||
               rowEl?.textContent?.trim();

  if (!text) return null;

  // Skip if this looks like OUR OWN message (usually aligned right)
  // Instagram puts user's own messages on the right side
  const isOwnMsg = rowEl?.querySelector('[style*="justify-content: flex-end"]') ||
                   rowEl?.querySelector('[style*="margin-left: auto"]');
  if (isOwnMsg) return null;

  return { text };
}

// Generic fallback: detect incoming messages on any platform
function extractGenericIncomingMessage(node) {
  // Try common class names used by messaging apps
  const incomingSelectors = [
    '.message-in', '.msg-in', '.incoming', '.received',
    '[data-direction="incoming"]', '[data-sender]'
  ];

  for (const selector of incomingSelectors) {
    const found = node.matches?.(selector) ? node : node.querySelector?.(selector);
    if (found) {
      const text = found.textContent?.trim();
      if (text) return { text };
    }
  }

  return null;
}

// Auto-generate and send a reply (Agent Mode)
async function agentAutoReply(person, incomingText, platform) {
  if (!savedApiKey) {
    showToast('⚠️ No API key! Add it in Chitti popup → Settings', 4000);
    return;
  }

  showToast(`🤖 Chitti: Generating reply for ${person.name}...`, 2000);

  try {
    // Scrape history from screen autonomously
    const dynamicHistory = scrapeVisibleChatHistory(person.name, platform);

    // Call Groq via background.js
    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_REPLY',
      personName: person.name,
      incomingMessage: incomingText,
      personSettings: person,
      dynamicHistory: dynamicHistory
    });

    if (!response.success) {
      showToast('⚠️ Chitti could not generate reply: ' + response.error, 3000);
      return;
    }

    const replyText = response.reply;

    // Find the text box to type into
    const replyInput = findReplyInput(platform);
    if (!replyInput) {
      showToast('⚠️ Chitti: Could not find the reply text box', 3000);
      return;
    }

    // Type the reply into the box
    window.isChittiFocusing = true;
    replyInput.focus();
    insertTextIntoElement(replyInput, replyText);
    setTimeout(() => { window.isChittiFocusing = false; }, 100);

    // Show a countdown toast — user has 3 seconds to cancel before it sends
    showAgentCountdown(replyInput, replyText, person.name, platform);

  } catch (err) {
    showToast('⚠️ Chitti Agent: An error occurred', 3000);
    console.error('Chitti Agent error:', err);
  }
}

// Show a countdown UI before auto-sending — allows user to cancel
function showAgentCountdown(inputEl, replyText, personName, platform) {
  // Remove any existing countdown
  document.getElementById('chitti-agent-toast')?.remove();

  let timeLeft = 3;
  let cancelled = false;

  // Create the countdown toast element
  const toast = document.createElement('div');
  toast.id = 'chitti-agent-toast';
  toast.innerHTML = `
    <div class="chitti-agent-header">
      <span>🤖 Replying as you to <strong>${personName}</strong></span>
      <span class="chitti-agent-timer">
        Sending in <span id="chitti-countdown-num">${timeLeft}</span>s
      </span>
    </div>
    <div class="chitti-agent-preview">
      "${replyText.substring(0, 90)}${replyText.length > 90 ? '...' : ''}"
    </div>
    <button class="chitti-agent-cancel-btn" id="chitti-cancel-send">✕ Cancel</button>
  `;
  document.body.appendChild(toast);

  // Handle cancel button
  document.getElementById('chitti-cancel-send')?.addEventListener('click', () => {
    cancelled = true;
    clearInterval(countdownInterval);
    toast.remove();
    // Clear the typed text from the input
    insertTextIntoElement(inputEl, '');
    showToast('❌ Auto-reply cancelled', 2000);
  });

  // Countdown: update number every second
  const countdownInterval = setInterval(() => {
    timeLeft--;
    const numEl = document.getElementById('chitti-countdown-num');
    if (numEl) numEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      toast.remove();

      // Only send if not cancelled
      if (!cancelled) {
        autoSendMessage(inputEl, platform);
        showToast(`⚡ Chitti replied to ${personName}!`, 3000);
      }
    }
  }, 1000);
}

// Find the reply input box on different platforms
function findReplyInput(platform) {
  if (platform === 'whatsapp') {
    // WhatsApp Web uses a Lexical-based contenteditable div as the message input
    // Try multiple selectors in order of reliability (most specific first)
    return (
      document.querySelector('div[data-lexical-editor="true"]') ||
      document.querySelector('div[contenteditable="true"][title="Type a message"]') ||
      document.querySelector('div[contenteditable="true"][aria-label="Type a message"]') ||
      document.querySelector('div[contenteditable="true"][aria-placeholder]') ||
      document.querySelector('footer div[contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"][data-tab="10"]')
    );
  }

  if (platform === 'instagram') {
    return (
      document.querySelector('div[contenteditable="true"][aria-label="Message..."]') ||
      document.querySelector('div[contenteditable="true"][aria-label*="essage"]') ||
      document.querySelector('textarea[placeholder*="essage"]')
    );
  }

  if (platform === 'telegram') {
    return (
      document.querySelector('div.input-message-input[contenteditable="true"]') ||
      document.querySelector('#editable-message-text')
    );
  }

  if (platform === 'twitter') {
    return (
      document.querySelector('div[data-testid="dmComposerTextInput"]') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]')
    );
  }

  // Generic fallback: any contenteditable or textarea
  return (
    document.activeElement?.contentEditable === 'true' ? document.activeElement : null
  ) ||
    document.querySelector('div[contenteditable="true"]') ||
    document.querySelector('textarea:not([readonly])');
}

// Auto-send the message (click the Send button or simulate Enter)
function autoSendMessage(inputEl, platform) {
  if (platform === 'whatsapp') {
    // WhatsApp Web has a Send button — we give Lexical 300ms to update its internal
    // React state after the paste event before clicking send
    setTimeout(() => {
      const sendBtn =
        document.querySelector('[data-testid="send"]') ||
        document.querySelector('button[data-icon="send"]') ||
        document.querySelector('span[data-icon="send"]')?.closest('button');

      if (sendBtn) {
        sendBtn.click();
      } else {
        // Last resort: simulate Enter key press
        inputEl.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', keyCode: 13, bubbles: true, cancelable: true
        }));
      }
    }, 300);
    return;
  }

  if (platform === 'instagram') {
    // Instagram DM send button
    const sendBtn = [...document.querySelectorAll('div[role="button"]')]
      .find(el => el.textContent?.trim().toLowerCase() === 'send');
    if (sendBtn) {
      sendBtn.click();
      return;
    }
  }

  if (platform === 'telegram') {
    // Telegram: Enter sends the message
    inputEl.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', keyCode: 13, bubbles: true, cancelable: true
    }));
    return;
  }

  // Universal fallback: press Enter key
  inputEl.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter', keyCode: 13, bubbles: true, cancelable: true
  }));
  inputEl.dispatchEvent(new KeyboardEvent('keyup', {
    key: 'Enter', keyCode: 13, bubbles: true
  }));
}

// Get the contact name from the current conversation
function getContactName(platform) {
  if (platform === 'whatsapp') {
    // WhatsApp Web DM header shows the contact's name
    const el =
      document.querySelector('header span[title]') ||
      document.querySelector('header ._ao3e') ||
      document.querySelector('[data-testid="conversation-info-header-chat-title"] span');
    return el?.getAttribute('title')?.trim() || el?.textContent?.trim() || null;
  }

  if (platform === 'instagram') {
    // Instagram DM thread header
    const el =
      document.querySelector('header a h2') ||
      document.querySelector('div[role="main"] header h2') ||
      document.querySelector('._aacl._aaco._aacw');
    return el?.textContent?.trim() || null;
  }

  if (platform === 'telegram') {
    const el = document.querySelector('.peer-title') || document.querySelector('.username');
    return el?.textContent?.trim() || null;
  }

  if (platform === 'twitter') {
    const el = document.querySelector('[data-testid="DM_Conversation_Avatar"]') ||
               document.querySelector('h2[role="heading"]');
    return el?.textContent?.trim() || null;
  }

  return null;
}

// Scrape visible chat history from the screen (up to 100 messages)
function scrapeVisibleChatHistory(personName, platform) {
  const history = [];

  if (platform === 'whatsapp') {
    // Select both incoming and outgoing messages
    const messageNodes = document.querySelectorAll('.message-in, .message-out');
    
    messageNodes.forEach(node => {
      const isIncoming = node.classList.contains('message-in');
      
      const textEl = 
        node.querySelector('.selectable-text span') || 
        node.querySelector('span.copyable-text') || 
        node.querySelector('[data-pre-plain-text] + * span') ||
        node.querySelector('span[dir="ltr"]') ||
        node.querySelector('span[dir="auto"]');
        
      const text = textEl?.textContent?.trim();
      
      if (text && text.length > 0) {
        history.push({
          sender: isIncoming ? personName : 'User',
          text: text,
          isUser: !isIncoming
        });
      }
    });
  } else if (platform === 'instagram') {
    const rows = document.querySelectorAll('[role="row"]');
    rows.forEach(row => {
      const text = row.querySelector('[dir="auto"]')?.textContent?.trim() || row.textContent?.trim();
      if (!text) return;
      
      // Instagram puts user's own messages on the right side
      const isOwnMsg = row.querySelector('[style*="justify-content: flex-end"]') ||
                       row.querySelector('[style*="margin-left: auto"]');
                       
      history.push({
        sender: isOwnMsg ? 'User' : personName,
        text: text,
        isUser: !!isOwnMsg
      });
    });
  }

  // Slice to max 100 messages to prevent token limits
  return history.slice(-100);
}


// ============================================================
// SECTION 5: SUGGESTION MODE
// While user types, after a pause, shows an AI-generated
// suggestion in a bar below the text input.
// Tab key = accept the suggestion.
// ============================================================

function stopSuggestionMode() {
  clearTimeout(suggestionTimer);
  hideSuggestion();
}

// Called on every keyup event when suggestion mode is active
function handleSuggestionTyping(element) {
  // Cancel any previous pending suggestion request
  clearTimeout(suggestionTimer);
  hideSuggestion();

  const typedText = getElementText(element);
  if (!typedText || typedText.trim().length < 4) return; // Too short to suggest

  // Wait 1.5 seconds after user stops typing, then generate a suggestion
  // VIVA TIP: This is called "debouncing" — we don't want to call the API
  // on every single keystroke, so we wait until the user pauses.
  suggestionTimer = setTimeout(async () => {
    await fetchAndDisplaySuggestion(element, typedText);
  }, 1500);
}

// Call Groq AI to get a suggestion, then display it
async function fetchAndDisplaySuggestion(element, currentText) {
  if (!savedApiKey) return;
  if (currentMode !== 'suggestion') return; // Mode might have changed

  // Try to figure out who this conversation is with
  const platform = detectPlatform();
  const contactName = getContactName(platform);
  const person = findPersonByName(contactName) || savedPersons[0];

  if (!person) return; // No person to base the style on

  try {
    // Scrape history from screen autonomously
    const dynamicHistory = scrapeVisibleChatHistory(person.name, platform);

    // Ask background.js to generate a suggestion completion
    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_SUGGESTION',
      personName: person.name,
      currentText: currentText,
      personSettings: person,
      dynamicHistory: dynamicHistory
    });

    // If the mode changed or element lost focus, discard
    if (currentMode !== 'suggestion') return;
    if (document.activeElement !== element && !element.contains(document.activeElement)) return;

    if (response.success && response.suggestion) {
      suggestionTargetEl = element;
      currentSuggestion  = response.suggestion;
      showSuggestion(element, response.suggestion);
    }
  } catch (err) {
    console.error('Chitti suggestion error:', err);
  }
}

// Show the suggestion bar below the text input
function showSuggestion(element, suggestion) {
  // Create the suggestion bar element if it doesn't exist
  if (!suggestionBar) {
    suggestionBar = document.createElement('div');
    suggestionBar.id = 'chitti-suggestion-bar';
    document.body.appendChild(suggestionBar);
  }

  const rect = element.getBoundingClientRect();

  suggestionBar.innerHTML = `
    <span class="chitti-suggest-icon">💡</span>
    <span class="chitti-suggest-text">${suggestion}</span>
    <span class="chitti-suggest-hint">Tab ↹</span>
    <button class="chitti-suggest-x" id="chitti-suggest-dismiss">✕</button>
  `;

  // Position above the text input (pop up instead of down)
  suggestionBar.style.left  = `${window.scrollX + rect.left}px`;
  suggestionBar.style.bottom = `${window.innerHeight - rect.top + 8}px`;
  suggestionBar.style.top = 'auto'; // ensure top is cleared
  suggestionBar.style.minWidth = `${Math.max(260, rect.width)}px`;
  suggestionBar.style.display = 'flex';

  document.getElementById('chitti-suggest-dismiss')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    hideSuggestion();
  });
}

function hideSuggestion() {
  if (suggestionBar) suggestionBar.style.display = 'none';
  currentSuggestion  = '';
  suggestionTargetEl = null;
}

// Replace the input's content with the suggestion
function acceptSuggestion() {
  if (!currentSuggestion || !suggestionTargetEl) return;
  insertTextIntoElement(suggestionTargetEl, currentSuggestion);
  hideSuggestion();
}


// ============================================================
// SECTION 6: UTILITY FUNCTIONS
// ============================================================

// Detect which platform/website we are currently on
function detectPlatform() {
  const host = window.location.hostname;
  if (host.includes('web.whatsapp.com'))  return 'whatsapp';
  if (host.includes('instagram.com'))     return 'instagram';
  if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
  if (host.includes('web.telegram.org') || host.includes('telegram.org')) return 'telegram';
  if (host.includes('linkedin.com'))      return 'linkedin';
  if (host.includes('discord.com'))       return 'discord';
  if (host.includes('mail.google.com'))   return 'gmail';
  return 'generic';
}

// Find a saved person by contact name (case-insensitive, partial match)
function findPersonByName(contactName) {
  if (!contactName) return null;
  const lower = contactName.toLowerCase().trim();
  return savedPersons.find(p => {
    const pLower = p.name.toLowerCase().trim();
    return lower.includes(pLower) || pLower.includes(lower) || pLower === lower;
  }) || null;
}

// Check if an element is something the user can type into
function isTextInput(element) {
  if (!element) return false;
  return (
    element.tagName === 'TEXTAREA' ||
    (element.tagName === 'INPUT' && ['text', 'search', 'email'].includes(element.type)) ||
    element.contentEditable === 'true' ||
    element.getAttribute('role') === 'textbox' ||
    element.getAttribute('role') === 'combobox'
  );
}

// Get current text from any type of input element
function getElementText(element) {
  if (!element) return '';
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return element.value || '';
  }
  if (element.contentEditable === 'true') {
    return element.textContent || element.innerText || '';
  }
  return '';
}

// Insert text into any type of input element
// This works for WhatsApp/Instagram (contenteditable) and normal textareas/inputs
function insertTextIntoElement(element, text) {
  element.focus();

  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    // Standard input/textarea
    element.value = text;
    // These events tell React/Vue/Angular that the value changed
    element.dispatchEvent(new Event('input',  { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

  } else if (element.contentEditable === 'true') {
    // contenteditable div — used by WhatsApp, Instagram, LinkedIn, Discord, Telegram
    // WhatsApp Web uses a Lexical editor (React-based) which requires special handling.
    // The most reliable approach is using the DataTransfer clipboard API to paste,
    // which triggers all the internal React synthetic events that Lexical listens to.
    element.focus();

    // Step 1: Clear existing content aggressively for Lexical
    // 1. Select all via execCommand
    document.execCommand('selectAll', false, null);
    
    // 2. Simulate Ctrl+A / Cmd+A
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, metaKey: true, bubbles: true }));
    
    // 3. Simulate Backspace keydown
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', keyCode: 8, bubbles: true }));
    
    // 4. Simulate beforeinput delete
    element.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true }));
    
    // 5. Fallback execCommand delete
    document.execCommand('delete', false, null);
    
    // 6. Clear innerHTML as a last resort fallback, just in case
    if (element.textContent.trim().length > 0) {
      element.innerHTML = '';
      element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

    // Step 2: Try standard execCommand first (most reliable, triggers native trusted events)
    let inserted = false;
    const originalText = element.textContent || '';
    
    try {
      document.execCommand('insertText', false, text);
      const newText = element.textContent || '';
      if (newText !== originalText && newText.includes(text)) {
        inserted = true;
      }
    } catch (e) {
      console.warn('execCommand insertText failed, trying paste fallback:', e);
    }

    // Step 3: Fallback to paste event if execCommand did not insert the text
    if (!inserted) {
      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        element.dispatchEvent(new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        }));
      } catch (e) {
        console.error('Paste event fallback failed:', e);
      }
    }

    // Step 4: Always fire a generic input event to trigger React/Vue/Angular state bindings
    // We do NOT pass `data: text` to prevent Lexical or other editors from double-inserting
    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
}

// Show a brief notification toast in the top-right corner
function showToast(message, duration = 3000) {
  // Remove any existing toast first
  document.getElementById('chitti-toast')?.remove();

  const toast = document.createElement('div');
  toast.id = 'chitti-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Animate in (small trick: requestAnimationFrame ensures CSS transition fires)
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Animate out and remove after the duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-16px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Show/hide helpers for assistance mode panel
function showChittiError(message) {
  const el = document.getElementById('chitti-error');
  if (el) { el.textContent = message; el.style.display = 'block'; }
}
function hideChittiError() {
  const el = document.getElementById('chitti-error');
  if (el) el.style.display = 'none';
}
function hideReplyArea() {
  const el = document.getElementById('chitti-reply-area');
  if (el) el.style.display = 'none';
}


// ============================================================
// SECTION 7: EVENT LISTENERS
// These listen to the whole document and react based on mode
// ============================================================

function setupEventListeners() {

  // When user clicks into a text input
  document.addEventListener('focusin', (e) => {
    if (!isTextInput(e.target)) return;
    activeElement = e.target;

    // Assistance Mode: show the floating ⚡ button
    if (currentMode === 'assistance') {
      createChittiButton();
      chittiButton.style.display = 'flex';
      positionButtonNearInput(activeElement);
    }

    // Auto-Pilot Mode: generate and paste a reply automatically
    // (Like Grammarly — fires when cursor lands in a chat text box)
    if (autoPilotActive && !window.isChittiFocusing) {
      handleAutoPilotFocus(e.target);
    }

  }, true); // true = capture phase (fires before the website's own events)


  // When user leaves a text input
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      const focused = document.activeElement;
      const inPanel  = chittiPanel?.contains(focused);
      const inBtn    = chittiButton?.contains(focused);
      const inSugBar = suggestionBar?.contains(focused);

      // Only hide if user didn't click our own UI
      if (!inPanel && !inBtn && !inSugBar && !isTextInput(focused)) {
        if (chittiButton) chittiButton.style.display = 'none';
        hidePanel();
      }
    }, 200); // 200ms delay to let mousedown events fire first
  }, true);


  // When user types — for suggestion mode
  document.addEventListener('keyup', (e) => {
    if (currentMode === 'suggestion' && isTextInput(e.target)) {
      handleSuggestionTyping(e.target);
    }
  }, true);


  // Special keys
  document.addEventListener('keydown', (e) => {
    // Tab key: accept the current suggestion
    if (e.key === 'Tab' && currentSuggestion && suggestionTargetEl) {
      e.preventDefault(); // Prevent Tab from moving focus
      acceptSuggestion();
    }

    // Escape: dismiss suggestion
    if (e.key === 'Escape' && currentSuggestion) {
      hideSuggestion();
    }
  }, true);


  // Reposition button and suggestion bar when page scrolls
  window.addEventListener('scroll', () => {
    if (activeElement && chittiButton && chittiButton.style.display !== 'none') {
      positionButtonNearInput(activeElement);
    }
    if (suggestionTargetEl && suggestionBar && suggestionBar.style.display !== 'none') {
      const rect = suggestionTargetEl.getBoundingClientRect();
      suggestionBar.style.left  = `${window.scrollX + rect.left}px`;
      suggestionBar.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    }
  }, { passive: true });

  // Periodically check if we are on an Instagram post page to show the Mass-Reply button
  setInterval(checkInstagramInfluencerMode, 2000);
}


// ============================================================
// SECTION 8: INSTAGRAM INFLUENCER MASS-REPLY
// Auto-replies to all comments on an Instagram post
// ============================================================

let massReplyBtn = null;
let isMassReplying = false;

function checkInstagramInfluencerMode() {
  const isInstaPost = window.location.hostname.includes('instagram.com') && 
                     (window.location.pathname.includes('/p/') || window.location.pathname.includes('/reel/'));
  
  if (isInstaPost && currentMode === 'agent') {
    if (!massReplyBtn) createMassReplyButton();
    massReplyBtn.style.display = 'flex';
  } else {
    if (massReplyBtn) massReplyBtn.style.display = 'none';
  }
}

function createMassReplyButton() {
  massReplyBtn = document.createElement('div');
  massReplyBtn.id = 'chitti-mass-reply-btn';
  massReplyBtn.innerHTML = `
    <img src="${CHITTI_ICON_BASE64}" alt="Chitti" style="width: 16px; height: 16px; border-radius: 4px; object-fit: contain; vertical-align: middle; margin-right: 4px;" />
    <span>Auto-Reply to Comments</span>
  `;
  
  massReplyBtn.addEventListener('click', () => {
    if (isMassReplying) return;
    runInstagramMassReply();
  });

  document.body.appendChild(massReplyBtn);
}

async function runInstagramMassReply() {
  isMassReplying = true;
  massReplyBtn.innerHTML = `<span class="chitti-icon">⏳</span><span>Replying...</span>`;
  
  // Find the persona to use (looks for "Followers", "Public", or defaults to first person)
  const persona = findPersonByName('Followers') || findPersonByName('Public') || savedPersons[0];
  
  if (!persona) {
    showToast('⚠️ No personas saved! Create a "Followers" person in Chitti.', 4000);
    stopMassReply();
    return;
  }

  showToast(`⚡ Starting Mass-Reply using "${persona.name}" persona...`, 3000);

  // Get all comment elements
  // Instagram comments are typically in ul > li structures inside the article
  const commentNodes = document.querySelectorAll('ul > div > li > div');
  let repliedCount = 0;

  for (let node of commentNodes) {
    // Stop if user navigated away
    if (!isMassReplying) break;

    // Try to find the comment text and the reply button
    const textEl = node.querySelector('span[dir="auto"]');
    const replyBtn = Array.from(node.querySelectorAll('div[role="button"]')).find(el => el.textContent === 'Reply');
    
    if (!textEl || !replyBtn) continue;
    
    const commentText = textEl.textContent.trim();
    if (commentText.length < 2) continue;

    // Check if we already processed this one (using the set from Agent Mode)
    const commentKey = 'insta_cmt_' + commentText.substring(0, 50);
    if (processedMessages.has(commentKey)) continue;

    // Check if there is already a reply by the user (usually nested ul)
    // A bit complex to detect perfectly, so we just rely on processedMessages
    
    processedMessages.add(commentKey);
    
    showToast(`🤖 Generating reply for: "${commentText.substring(0,20)}..."`, 2000);

    try {
      // 1. Generate Reply
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_REPLY',
        personName: persona.name,
        incomingMessage: commentText,
        personSettings: persona
      });

      if (response.success && response.reply) {
        // 2. Click "Reply" on the comment
        replyBtn.click();
        
        // Wait for text box to focus
        await new Promise(r => setTimeout(r, 500));
        
        // 3. Find the input and insert text
        const inputEl = findReplyInput('instagram');
        if (inputEl) {
          // Remove the "@username " prefix Instagram auto-adds if we want, or just append
          insertTextIntoElement(inputEl, inputEl.textContent + " " + response.reply);
          
          // Wait a moment for React to register
          await new Promise(r => setTimeout(r, 800));
          
          // 4. Click Send
          autoSendMessage(inputEl, 'instagram');
          repliedCount++;
          
          // Wait 3-5 seconds before next comment to avoid rate limits
          await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
        }
      }
    } catch (err) {
      console.error("Mass reply error:", err);
    }
  }

  showToast(`✅ Mass-Reply finished! Sent ${repliedCount} replies.`, 4000);
  stopMassReply();
}

function stopMassReply() {
  isMassReplying = false;
  if (massReplyBtn) {
    massReplyBtn.innerHTML = `
      <img src="${CHITTI_ICON_BASE64}" alt="Chitti" style="width: 16px; height: 16px; border-radius: 4px; object-fit: contain; vertical-align: middle; margin-right: 4px;" />
      <span>Auto-Reply to Comments</span>
    `;
  }
}

// ============================================================
// SECTION 9: AUTO-PILOT MODE (Grammarly-Style)
// ============================================================
// When autoPilotActive is true and the user clicks into ANY chat
// text box, Chitti:
//  1. Detects platform + contact name
//  2. Loads saved WhatsApp history for that contact
//  3. Calls Groq AI to generate a reply
//  4. Pastes the reply into the active text box
//  5. Shows a 3-second countdown so user can cancel
//
// This is triggered from the focusin event in setupEventListeners()
// ============================================================

function stopAutoPilot() {
  autoPilotActive = false;
  autoPilotLocked = false;
  clearTimeout(autoPilotTimer);
  showToast('🤖 Auto-Pilot OFF', 2000);
}

// Called when user clicks into a text input while Auto-Pilot is ON
async function handleAutoPilotFocus(inputEl) {
  // Don't fire if already generating or locked
  if (autoPilotLocked) return;
  if (!savedApiKey) {
    showToast('⚠️ No API key! Add it in Chitti popup → Settings', 4000);
    return;
  }

  const platform    = detectPlatform();
  const contactName = getContactName(platform);

  // Only work on chat platforms where we know who we're talking to
  // For generic sites, still try but with first saved person as fallback
  let person = findPersonByName(contactName);

  // If we can't match a saved person and there's no contact name, skip
  if (!person && !contactName && savedPersons.length === 0) {
    return;
  }

  // Create a temporary person profile if not saved yet
  if (!person) {
    person = {
      id: Date.now().toString(),
      name: contactName || 'Contact',
      relationship: 'friend',
      currentMood: 'casual',
      messageCount: 0
    };
  }

  autoPilotLocked = true; // Lock to prevent re-firing while processing

  // Debounce: wait 800ms after focus before generating
  // (avoids triggering when user just quickly tabs through fields)
  clearTimeout(autoPilotTimer);
  autoPilotTimer = setTimeout(async () => {
    // Check if the same element is still focused
    if (document.activeElement !== inputEl && !inputEl.contains(document.activeElement)) {
      autoPilotLocked = false;
      return;
    }

    // Only trigger on chat platforms for the demo — skip generic inputs
    // (avoids being intrusive on search boxes, form fields etc.)
    const chatPlatforms = ['whatsapp', 'instagram', 'telegram', 'twitter', 'discord'];
    if (!chatPlatforms.includes(platform) && !contactName) {
      autoPilotLocked = false;
      return;
    }

    showToast(`🤖 Auto-Pilot: Generating reply for ${person.name}...`, 2000);

    try {
      // Scrape chat history from the visible screen
      const dynamicHistory = scrapeVisibleChatHistory(person.name, platform);

      // Get the last incoming message as context
      const theirLastMsg = [...dynamicHistory].reverse().find(m => m.sender !== 'User');
      const incomingText = theirLastMsg?.text || 'Hello';

      // Also load saved history from WA export (stored by ChatUploader)
      const storageKey = `chitti_history_${person.name}`;
      chrome.storage.local.get([storageKey], async (data) => {
        const savedHistory = data[storageKey] || [];

        // Merge: prefer live screen-scraped history, supplement with saved history
        // Use saved history for style learning (older messages), live for context (recent)
        const mergedHistory = [
          ...savedHistory.slice(-40),   // Up to 40 old messages for style learning
          ...dynamicHistory.slice(-20)  // Up to 20 live messages for current context
        ];

        try {
          const response = await chrome.runtime.sendMessage({
            type: 'GENERATE_REPLY',
            personName: person.name,
            incomingMessage: incomingText,
            personSettings: person,
            dynamicHistory: mergedHistory
          });

          if (!response.success) {
            showToast('⚠️ Auto-Pilot: ' + (response.error || 'Could not generate reply'), 3000);
            autoPilotLocked = false;
            return;
          }

          const replyText = response.reply;

          // Verify the input is still focused and empty (don't overwrite if user already typed)
          const currentText = getElementText(inputEl);
          if (currentText && currentText.trim().length > 0) {
            // User already typed something — don't overwrite
            autoPilotLocked = false;
            return;
          }

          // Paste the reply into the text box
          insertTextIntoElement(inputEl, replyText);

          // Show countdown toast — user has 3 seconds to cancel before "accepting" it
          // (we don't auto-SEND, just paste — user still manually presses Enter/Send)
          showAutoPilotCountdown(inputEl, replyText, person.name);

        } catch (err) {
          showToast('⚠️ Auto-Pilot error. Check API key.', 3000);
          console.error('Auto-Pilot error:', err);
          autoPilotLocked = false;
        }
      });

    } catch (err) {
      showToast('⚠️ Auto-Pilot error', 3000);
      console.error('Auto-Pilot focus error:', err);
      autoPilotLocked = false;
    }
  }, 800);
}

// Show the auto-pilot paste notification (simpler than agent countdown — no auto-send)
function showAutoPilotCountdown(inputEl, replyText, personName) {
  // Remove any existing toast
  document.getElementById('chitti-agent-toast')?.remove();

  const toast = document.createElement('div');
  toast.id = 'chitti-agent-toast';
  toast.innerHTML = `
    <div class="chitti-agent-header">
      <span>🤖 Auto-Pilot pasted reply for <strong>${personName}</strong></span>
      <span class="chitti-agent-timer" style="background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.2);">
        ✓ Pasted
      </span>
    </div>
    <div class="chitti-agent-preview">
      "${replyText.substring(0, 90)}${replyText.length > 90 ? '...' : ''}"
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="chitti-agent-cancel-btn" id="chitti-autopilot-clear" style="flex: 1;">
        ✕ Clear Text
      </button>
      <button class="chitti-agent-cancel-btn" id="chitti-autopilot-ok" style="flex: 1; background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.2); color: #10b981;">
        ✓ Keep It
      </button>
    </div>
  `;
  document.body.appendChild(toast);

  // Clear button — removes text from input
  document.getElementById('chitti-autopilot-clear')?.addEventListener('click', () => {
    insertTextIntoElement(inputEl, '');
    toast.remove();
    autoPilotLocked = false; // Unlock so it can fire again
    showToast('❌ Reply cleared', 1500);
  });

  // Keep button — just dismisses the toast, text stays
  document.getElementById('chitti-autopilot-ok')?.addEventListener('click', () => {
    toast.remove();
    autoPilotLocked = false; // Unlock for next chat
    showToast('✓ Reply kept! Press Enter/Send when ready.', 2000);
  });

  // Auto-dismiss after 8 seconds if user does nothing
  setTimeout(() => {
    if (document.getElementById('chitti-agent-toast') === toast) {
      toast.remove();
      autoPilotLocked = false;
    }
  }, 8000);
}


// ============================================================
// SECTION 10: AUTO-PROFILER (Auto History Extraction)
// ============================================================
// When extension is on, this continuously checks which chat is open.
// If it finds a new contact, it:
// 1. Creates a person profile (if they don't exist).
// 2. Scrapes the visible chat history on screen.
// 3. Merges the scraped history with saved history in storage.
// 4. Sets up an observer to catch lazy-loaded older messages on scroll.
// ============================================================

function startAutoProfiler() {
  if (autoProfilerInterval) return;
  console.log('🤖 Auto-Profiler started');

  // Check every 2 seconds if we moved to a different chat
  autoProfilerInterval = setInterval(() => {
    const platform = detectPlatform();
    // Only auto-profile on supported chat platforms (WhatsApp, IG, Telegram)
    if (!['whatsapp', 'instagram', 'telegram'].includes(platform)) return;

    const currentContact = getContactName(platform);
    if (!currentContact) return;

    // If we moved to a new chat, trigger extraction
    if (currentContact !== lastObservedContact) {
      lastObservedContact = currentContact;
      console.log(`🤖 Auto-Profiler: Entered chat with ${currentContact}`);
      
      // Stop old message observer
      if (chatMessageObserver) {
        chatMessageObserver.disconnect();
        chatMessageObserver = null;
      }

      // Initial extraction
      handleChatHistoryExtraction(currentContact, platform);

      // Set up mutation observer to catch newly lazy-loaded messages when scrolling up
      setupHistoryObserver(currentContact, platform);
    }
  }, 2000);
}

function stopAutoProfiler() {
  if (autoProfilerInterval) {
    clearInterval(autoProfilerInterval);
    autoProfilerInterval = null;
  }
  if (chatMessageObserver) {
    chatMessageObserver.disconnect();
    chatMessageObserver = null;
  }
  lastObservedContact = null;
}

function handleChatHistoryExtraction(contactName, platform) {
  // 1. Ensure profile exists
  let person = findPersonByName(contactName);
  
  // If it's a new person, save them automatically
  if (!person) {
    person = {
      name: contactName,
      relationship: 'friend', // default
      emoji: '👤',
      currentMood: 'casual',
      messageCount: 0
    };
    savedPersons.push(person);
    chrome.storage.local.set({ chitti_persons: savedPersons });
    console.log(`🤖 Auto-Profiler: Created new profile for ${contactName}`);
  }

  // 2. Scrape visible history
  const newMessages = scrapeVisibleChatHistory(contactName, platform);
  if (newMessages.length === 0) return;

  // 3. Merge with existing saved history
  const storageKey = `chitti_history_${contactName}`;
  chrome.storage.local.get([storageKey], (data) => {
    const existingHistory = data[storageKey] || [];
    
    // Deduplicate: create a Map keyed by the first 100 chars of the message text
    // to prevent saving duplicates of the same message
    const uniqueMessages = new Map();
    
    // Add existing ones first
    existingHistory.forEach(msg => {
      const key = `${msg.sender}_${msg.text.substring(0, 100)}`;
      uniqueMessages.set(key, msg);
    });
    
    const prevCount = uniqueMessages.size;

    // Add new ones
    newMessages.forEach(msg => {
      const key = `${msg.sender}_${msg.text.substring(0, 100)}`;
      if (!uniqueMessages.has(key)) {
        uniqueMessages.set(key, { ...msg, timestamp: new Date().toISOString() });
      }
    });

    const newCount = uniqueMessages.size;

    // 4. Save back to storage if there are new messages
    if (newCount > prevCount) {
      const updatedHistory = Array.from(uniqueMessages.values());
      // Sort chronologically (assuming older messages were at the top when scraped)
      // Actually, since we use timestamp now, it might be tricky, but maintaining order is fine
      chrome.storage.local.set({ [storageKey]: updatedHistory }, () => {
        console.log(`🤖 Auto-Profiler: Added ${newCount - prevCount} new messages to ${contactName}'s history (Total: ${newCount})`);
        
        // Update person's message count in chitti_persons
        const personIndex = savedPersons.findIndex(p => p.name.toLowerCase() === contactName.toLowerCase());
        if (personIndex !== -1) {
          savedPersons[personIndex].messageCount = newCount;
          chrome.storage.local.set({ chitti_persons: savedPersons });
        }
      });
    }
  });
}

function setupHistoryObserver(contactName, platform) {
  // Find the container where messages are added
  let container = document.body; // fallback to body
  if (platform === 'whatsapp') {
    // The main chat scroll area in WhatsApp Web
    container = document.querySelector('div[role="application"]') || document.body;
  }

  chatMessageObserver = new MutationObserver((mutations) => {
    // If nodes are added, wait 500ms and trigger extraction
    // (debounced so we don't spam it during fast scrolling)
    let addedNodes = false;
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        addedNodes = true;
        break;
      }
    }
    
    if (addedNodes) {
      // Very simple debounce
      if (!window._historyExtractTimer) {
        window._historyExtractTimer = setTimeout(() => {
          if (lastObservedContact === contactName) {
            handleChatHistoryExtraction(contactName, platform);
          }
          window._historyExtractTimer = null;
        }, 1000);
      }
    }
  });

  chatMessageObserver.observe(container, { childList: true, subtree: true });
}

// ============================================================
// SECTION 11: START
// ============================================================
init();
console.log('✅ Chitti content script loaded! Open any chat and type something.');

