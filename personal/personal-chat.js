/*************************************************
 * CONFIG
 *************************************************/
const SOCKET_URL = "http://localhost:5000";
const API_FIND_USER_BY_EMAIL = "http://localhost:5000/api/auth/user";
const AI_URL = "http://localhost:5000/api/ai";

const token = localStorage.getItem("token");
const currentUser = JSON.parse(localStorage.getItem("user") || "null");

/*************************************************
 * DOM REFERENCES
 *************************************************/
const searchInput = document.getElementById("search-email");
const searchBtn = document.getElementById("search-btn");
const recentUsers = document.getElementById("recent-users");
const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const headerTitle = document.getElementById("chat-header-title");
const leaveBtn = document.getElementById("leave-btn");

const typingSuggestions = document.getElementById("typing-suggestions");
const smartReplies = document.getElementById("smart-replies");

/*************************************************
 * AUTH GUARD
 *************************************************/
if (!token || !currentUser) {
  alert("Please login first");
  window.location.href = "index.html";
}

/*************************************************
 * SOCKET
 *************************************************/
const socket = io(SOCKET_URL, { auth: { token } });

socket.on("connect", () => console.log("Socket connected"));
socket.on("connect_error", err => console.error("Socket error:", err.message));

/*************************************************
 * HELPERS
 *************************************************/
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTime(time) {
  return new Date(time || Date.now())
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildRoomIdFromEmails(a, b) {
  return "room-" + [a.toLowerCase(), b.toLowerCase()].sort().join("--");
}

function addMessageToUI({ text, isMine, senderName, createdAt }) {
  const li = document.createElement("li");
  li.className = `message-row ${isMine ? "sent" : "received"}`;

  li.innerHTML = `
    <div class="message-bubble">
      <div class="message-sender">${isMine ? "You" : escapeHtml(senderName)}</div>
      <div class="message-text">${escapeHtml(text)}</div>
      <div class="message-time">${formatTime(createdAt)}</div>
    </div>
  `;

  messagesContainer.appendChild(li);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function clearMessages() {
  messagesContainer.innerHTML = "";
}

function setHeader(user, extra = "") {
  headerTitle.textContent = user
    ? `Chat with ${user.name || user.email} ${extra}`
    : "Select a user to start chat";
}

/*************************************************
 * STATE
 *************************************************/
let activeUser = null;
let activeRoomId = null;
let joined = false;

/*************************************************
 * API
 *************************************************/
async function findUserByEmail(email) {
  try {
    const url = new URL(API_FIND_USER_BY_EMAIL);
    url.searchParams.set("email", email);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

/*************************************************
 * JOIN ROOM FLOW
 *************************************************/
async function searchAndJoinByEmail(email) {
  if (!email) return alert("Enter email");
  if (email === currentUser.email) return alert("Cannot chat with yourself");

  const user = await findUserByEmail(email);
  if (!user) return alert("User not found");

  const roomId = buildRoomIdFromEmails(currentUser.email, user.email);
  joinRoom(user, roomId);
}

function joinRoom(user, roomId) {
  if (activeRoomId) socket.emit("leave_room", { roomId: activeRoomId });

  activeUser = user;
  activeRoomId = roomId;
  joined = false;

  clearMessages();
  setHeader(user, "(joining...)");

  socket.emit("join_room", { roomId });

  socket.once("joined_room", data => {
    if (data.roomId === roomId) {
      joined = true;
      setHeader(user, "(online)");
    }
  });
}

/*************************************************
 * DOM EVENTS
 *************************************************/
searchBtn.onclick = () => searchAndJoinByEmail(searchInput.value.trim());
searchInput.onkeyup = e => e.key === "Enter" && searchBtn.click();

leaveBtn.onclick = () => {
  if (activeRoomId) socket.emit("leave_room", { roomId: activeRoomId });
  activeUser = null;
  activeRoomId = null;
  joined = false;
  clearMessages();
  setHeader(null);
};

messageForm.onsubmit = e => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !joined) return;

  socket.emit("new_message", {
    roomId: activeRoomId,
    text,
    to: activeUser.id
  });

  addMessageToUI({
    text,
    isMine: true,
    senderName: "You",
    createdAt: new Date().toISOString()
  });

  messageInput.value = "";
  typingSuggestions.innerHTML = "";
  smartReplies.innerHTML = "";
};

/*************************************************
 * SOCKET LISTENERS
 *************************************************/
socket.on("new_message", payload => {
  if (payload.roomId !== activeRoomId) return;

  const isMine = payload.from === currentUser.id;
  if (isMine) return;

  addMessageToUI({
    text: payload.text,
    isMine: false,
    senderName: payload.fromName,
    createdAt: payload.createdAt
  });

  fetchSmartReplies(payload.text);
});

/*************************************************
 * AI – SMART REPLIES
 *************************************************/
async function fetchSmartReplies(message) {
  try {
    const res = await fetch(`${AI_URL}/smart-replies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    smartReplies.innerHTML = "";

    (data.replies || []).forEach(r => {
      const btn = document.createElement("button");
      btn.textContent = r;
      btn.onclick = () => {
        messageInput.value = r;
        messageForm.dispatchEvent(new Event("submit"));
      };
      smartReplies.appendChild(btn);
    });
  } catch (err) {
    console.error("Smart reply error:", err);
  }
}

/*************************************************
 * AI – PREDICTIVE TYPING
 *************************************************/
let aiTimer;

messageInput.addEventListener("input", () => {
  clearTimeout(aiTimer);
  const text = messageInput.value.trim();
  if (text.length < 5) return;

  aiTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${AI_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });

      const data = await res.json();
      typingSuggestions.innerHTML = "";

      (data.suggestions || []).forEach(s => {
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
      console.error("Predict error:", err);
    }
  }, 500);
});
