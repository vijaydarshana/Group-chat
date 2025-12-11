// personal-chat.js

// ---------- CONFIG ----------
const API_FIND_USER_BY_EMAIL = "http://localhost:5000/api/auth/user"; // GET ?email=...
const SOCKET_URL = "http://localhost:5000";

// ---------- AUTH ----------
const token = localStorage.getItem("token");
const currentUser = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !currentUser) {
  alert("Please login first");
  window.location.href = "index.html";
}

// ---------- SOCKET (auth via token) ----------
const socket = io(SOCKET_URL, { auth: { token } });

// ---------- DOM ----------
const searchInput = document.getElementById("search-email");
const searchBtn = document.getElementById("search-btn");
const recentUsers = document.getElementById("recent-users");
const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const headerTitle = document.getElementById("chat-header-title");
const leaveBtn = document.getElementById("leave-btn");

// ---------- STATE ----------
let activeUser = null;       // { id, email, name? }
let activeRoomId = null;
let joined = false;

// ---------- HELPERS ----------
function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// deterministic room id — always same for two users
function buildRoomId(userAId, userBId) {
  const a = Number(userAId);
  const b = Number(userBId);
  const sorted = [a, b].sort((x, y) => x - y);
  return `room-${sorted[0]}-${sorted[1]}`;
}

function addMessageToUI({ text, isMine, createdAt }) {
  const row = document.createElement("div");
  row.className = `message-row ${isMine ? "sent" : "received"}`;
  const timeLabel = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  row.innerHTML = `
    <div class="message-bubble">
      <div class="message-text">${escapeHtml(text)}</div>
      <div class="message-meta"><span class="message-time">${timeLabel}</span></div>
    </div>
  `;
  messagesContainer.appendChild(row);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// wipe messages area
function clearMessages() {
  messagesContainer.innerHTML = "";
}

// show active chat header
function setActiveHeader(user) {
  if (!user) {
    headerTitle.textContent = "Select or search a user to start";
  } else {
    headerTitle.textContent = `Chat with ${user.email} (id: ${user.id})`;
  }
}

// ---------- SEARCH BY EMAIL ----------
async function findUserByEmail(email) {
  try {
    if (!email) return null;
    const url = new URL(API_FIND_USER_BY_EMAIL);
    url.searchParams.set("email", email);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("Find user failed:", res.status, text);
      return null;
    }
    const data = await res.json();
    // expected: { success: true, user: { id, email, ... } } OR { success:false }
    if (data && data.user) return data.user;
    // if API returns different shape, return data directly if it looks like a user
    if (data && data.id) return data;
    return null;
  } catch (err) {
    console.error("findUserByEmail error:", err);
    return null;
  }
}

// ---------- JOIN / LEAVE ROOM ----------
function joinRoomForUser(user) {
  if (!user) return;
  // leave previous if present
  if (activeRoomId && joined) {
    socket.emit("leave_room", { roomId: activeRoomId });
    // don't immediately set joined=false until ack (but for safety)
    joined = false;
  }

  activeUser = user;
  activeRoomId = buildRoomId(currentUser.id, user.id);
  clearMessages();
  setActiveHeader(user);

  console.log("CLIENT: emitting join_room", { roomId: activeRoomId });
  socket.emit("join_room", { roomId: activeRoomId });

  // wait for ack
  socket.once("joined_room", (data) => {
    console.log("CLIENT: joined_room ack", data);
    if (data && (data.roomId === activeRoomId)) {
      joined = true;
    }
  });
}

function leaveActiveRoom() {
  if (!activeRoomId) return;
  console.log("CLIENT: emitting leave_room", { roomId: activeRoomId });
  socket.emit("leave_room", { roomId: activeRoomId });
  activeUser = null;
  activeRoomId = null;
  joined = false;
  clearMessages();
  setActiveHeader(null);
}

// ---------- UI: hook up recent users clicks ----------
recentUsers.addEventListener("click", (ev) => {
  const item = ev.target.closest(".user-item");
  if (!item) return;
  const id = Number(item.getAttribute("data-user-id"));
  const email = item.getAttribute("data-user-email");
  if (!id) return;
  joinRoomForUser({ id, email });
});

// ---------- UI: search button ----------
searchBtn.addEventListener("click", async () => {
  const email = searchInput.value.trim();
  if (!email) {
    alert("Enter an email");
    return;
  }

  // try to find user via API
  const user = await findUserByEmail(email);
  if (!user) {
    alert("User not found (server must provide a /api/auth/user?email=...), or use recent list.");
    return;
  }

  // join room with that user
  joinRoomForUser(user);
});

// Also allow Enter key in input
searchInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// ---------- Send message (emit to room) ----------
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  if (!activeRoomId || !activeUser) {
    alert("Select or search a user first");
    return;
  }
  if (!joined) {
    alert("Joining room, wait a moment");
    return;
  }

  const payload = {
    roomId: activeRoomId,
    text,
    to: activeUser.id,
  };

  console.log("CLIENT: emit new_message", payload);
  socket.emit("new_message", payload);

  // optimistic UI for sender
  addMessageToUI({ text, isMine: true, createdAt: new Date() });
  messageInput.value = "";
  messageInput.focus();
});

// ---------- Leave button ----------
leaveBtn.addEventListener("click", () => {
  leaveActiveRoom();
});

// ---------- Socket listeners ----------

// Received personal message (server emits new_message to the room)
socket.on("new_message", (payload) => {
  console.log("CLIENT: received new_message payload:", payload, "activeRoomId:", activeRoomId);
  const roomId = payload.roomId || payload.room_id;
  const from = payload.from || payload.sender_id;
  const text = payload.message || payload.text;
  const createdAt = payload.createdAt || payload.created_at;

  // ignore messages for other rooms
  if (!activeRoomId || roomId !== activeRoomId) {
    console.warn("CLIENT: message for another room — ignoring. payload.roomId:", roomId, "activeRoomId:", activeRoomId);
    return;
  }

  const isMine = from === currentUser.id;
  addMessageToUI({ text, isMine, createdAt });
});

// ack for send
socket.on("message_sent", (saved) => {
  console.log("CLIENT: message_sent ack:", saved);
});

// optional: leave ack (server can emit joined_room/left_room if implemented)
socket.on("left_room", (data) => {
  console.log("CLIENT: left_room ack", data);
  // if server acked left, ensure local state cleared
  if (data && data.roomId === activeRoomId) {
    joined = false;
  }
});

// error
socket.on("connect_error", (err) => {
  console.error("Socket connect error:", err && err.message);
});
