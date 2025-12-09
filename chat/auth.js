// ------------------ ELEMENTS ------------------
const loginTab = document.getElementById("login-tab");
const signupTab = document.getElementById("signup-tab");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

const BASE_URL = "http://localhost:5000/api/auth";

// ------------------ TAB SWITCHING ------------------
loginTab.addEventListener("click", () => {
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  loginForm.classList.add("active");
  signupForm.classList.remove("active");
});

signupTab.addEventListener("click", () => {
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
  signupForm.classList.add("active");
  loginForm.classList.remove("active");
});

// ------------------ HELPERS ------------------
const showError = (msg) => alert("Error: " + msg);
const showSuccess = (msg) => alert(msg);

// ------------------ LOGIN ------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const identifier = document.getElementById("login-identifier").value.trim();
  const password = document.getElementById("login-password").value;

  if (!identifier || !password) {
    return showError("All fields are required");
  }

  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (!data.success) {
      return showError(data.message || "Login failed");
    }

    // ✅ Save token and user
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    showSuccess("Login successful!");

    // ✅ Redirect to chat page
    window.location.href = "chat.html";
  } catch (err) {
    console.error(err);
    showError("Server error. Please try again.");
  }
});

// ------------------ SIGNUP ------------------
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const phone = document.getElementById("signup-phone").value.trim();
  const password = document.getElementById("signup-password").value;

  if (!name || !email || !phone || !password) {
    return showError("All fields are required");
  }

  try {
    const res = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });

    const data = await res.json();

    if (!data.success) {
      return showError(data.message || "Signup failed");
    }

    // ✅ Save token and user
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    showSuccess("Signup successful!");

    // ✅ Redirect to chat page
    window.location.href = "chat.html";
  } catch (err) {
    console.error(err);
    showError("Server error. Please try again.");
  }
});
