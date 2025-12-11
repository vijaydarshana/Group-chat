// chat.js

const API_URL = "http://localhost:5000/api/messages";

// auth info
const token = localStorage.getItem("token");
const currentUser = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !currentUser) {
  alert("Please login first");
  window.location.href = "index.html";
}

// ✅ Socket.IO connection WITH AUTH (JWT)
const socket = io("http://localhost:5000", {
  auth: {
    token: token, // same JWT you use for APIs
  },
});

// DOM elements
const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

/* ---------- Helper: escape HTML ---------- */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------- Helper: add message to UI ---------- */
function addMessageToUI(text, isMine, createdAt) {
  const row = document.createElement("div");
  row.className = `message-row ${isMine ? "sent" : "received"}`;

  const timeLabel = createdAt
    ? new Date(createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

  row.innerHTML = `
    <div class="message-bubble">
      <div class="message-text">${escapeHtml(text)}</div>
      <div class="message-meta">
        <span class="message-time">${timeLabel}</span>
      </div>
    </div>
  `;

  messagesContainer.appendChild(row);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/* ---------- Load all existing messages once ---------- */
async function loadMessages() {
  try {
    const res = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!data.success) return;

    messagesContainer.innerHTML = "";

    data.messages.forEach((msg) => {
      const isMine = msg.user_id === currentUser.id;
      addMessageToUI(msg.message, isMine, msg.created_at);
    });
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

/* ---------- Send a message (HTTP API) ---------- */
async function sendMessageToServer(text) {
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
    if (!data.success) {
      alert(data.message || "Failed to send message");
      return null;
    }

    return data.data; // { id, user_id, message, created_at }
  } catch (err) {
    console.error("Error sending message:", err);
    alert("Server error");
    return null;
  }
}

/* ---------- Form submit ---------- */
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  // Send via HTTP; WebSocket broadcast will handle UI
  const saved = await sendMessageToServer(text);
  if (saved) {
    // ❌ DON'T add UI here – will come via "new-message"
    messageInput.value = "";
    messageInput.focus();
  }
});

/* ---------- Listen for new messages from server (Socket.IO) ---------- */
socket.on("new-message", (msg) => {
  // msg = { id, user_id, message, created_at }
  const isMine = msg.user_id === currentUser.id;
  addMessageToUI(msg.message, isMine, msg.created_at);
});

/* ---------- Optional: handle socket errors ---------- */
socket.on("connect_error", (err) => {
  console.error("Socket connect error:", err.message);
});

/* ---------- Initial load ---------- */
loadMessages();
