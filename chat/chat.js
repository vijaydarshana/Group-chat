/*********************************
 * CONFIG
 *********************************/
const API_URL = "http://localhost:5000/api/messages";
const AI_URL = "http://localhost:5000/api/ai";
const SOCKET_URL = "http://localhost:5000";

/*********************************
 * AUTH
 *********************************/
const token = localStorage.getItem("token");
const currentUser = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !currentUser) {
  alert("Please login first");
  window.location.href = "index.html";
}

/*********************************
 * SOCKET.IO
 *********************************/
const socket = io(SOCKET_URL, {
  auth: { token },
});

/*********************************
 * DOM ELEMENTS
 *********************************/
const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const typingSuggestions = document.getElementById("typing-suggestions");
const smartReplies = document.getElementById("smart-replies");
const usernameEl = document.getElementById("username");
const avatarEl = document.getElementById("user-avatar");

/*********************************
 * STATE
 *********************************/
const loadedMessageIds = new Set(); // prevents duplicates

/*********************************
 * HELPERS
 *********************************/
function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function addMessage(message, isMine, id) {
  // prevent duplicate messages
  if (id && loadedMessageIds.has(id)) return;
  if (id) loadedMessageIds.add(id);

  const div = document.createElement("div");
  div.className = `message-row ${isMine ? "sent" : "received"}`;
  div.innerHTML = `
    <div class="message-bubble">
      <div class="message-text">${escapeHtml(message)}</div>
    </div>
  `;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/*********************************
 * LOAD MESSAGE HISTORY (REST)
 *********************************/
async function loadMessages() {
  try {
    const res = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    messagesContainer.innerHTML = "";
    loadedMessageIds.clear();

    (data.messages || []).forEach((m) => {
      addMessage(m.message, m.user_id === currentUser.id, m.id);
    });
  } catch (err) {
    console.error("Load messages error:", err);
  }
}

/*********************************
 * SEND MESSAGE (INSTANT UI)
 *********************************/
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = messageInput.value.trim();
  if (!text) return;

  // 🔥 Optimistic UI (instant display)
  const tempId = "temp-" + Date.now();
  addMessage(text, true, tempId);

  messageInput.value = "";
  typingSuggestions.innerHTML = "";
  smartReplies.innerHTML = "";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();

    // Replace temp ID with DB ID
    if (data?.message?.id) {
      loadedMessageIds.delete(tempId);
      loadedMessageIds.add(data.message.id);
    }
  } catch (err) {
    console.error("Send message error:", err);
  }
});

/*********************************
 * SOCKET RECEIVE (REAL-TIME)
 *********************************/
socket.on("new-message", (msg) => {
  addMessage(msg.message, msg.user_id === currentUser.id, msg.id);

  if (msg.user_id !== currentUser.id) {
    fetchSmartReplies(msg.message);
  }
});

socket.on("connect_error", (err) => {
  console.error("Socket error:", err.message);
});

/*********************************
 * AI PREDICTIVE TYPING
 *********************************/
let typingTimer;

messageInput.addEventListener("input", () => {
  clearTimeout(typingTimer);

  const text = messageInput.value.trim();
  if (text.length < 5) return;

  typingTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${AI_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      typingSuggestions.innerHTML = "";

      (data.suggestions || []).forEach((s) => {
        const span = document.createElement("span");
        span.textContent = s;
        span.onclick = () => {
          messageInput.value += " " + s;
          typingSuggestions.innerHTML = "";
          messageInput.focus();
        };
        typingSuggestions.appendChild(span);
      });
    } catch (err) {
      console.error("AI predict error:", err);
    }
  }, 500);
});

/*********************************
 * AI SMART REPLIES
 *********************************/
async function fetchSmartReplies(message) {
  try {
    const res = await fetch(`${AI_URL}/smart-replies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    smartReplies.innerHTML = "";

    (data.replies || []).forEach((r) => {
      const btn = document.createElement("button");
      btn.textContent = r;
      btn.onclick = () => {
        messageInput.value = r;
        smartReplies.innerHTML = "";
        messageForm.dispatchEvent(new Event("submit"));
      };
      smartReplies.appendChild(btn);
    });
  } catch (err) {
    console.error("AI smart reply error:", err);
  }
}

/*********************************
 * USER INFO
 *********************************/
if (currentUser?.name) {
  usernameEl.innerText = currentUser.name;
  avatarEl.innerText = currentUser.name.charAt(0).toUpperCase();
}

/*********************************
 * INIT
 *********************************/
loadMessages();
