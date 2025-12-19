const express = require("express");
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

/* =====================================================
   🔐 AUTH MIDDLEWARE (same pattern as your app)
===================================================== */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment");
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, email }
    next();
  } catch (err) {
    console.error("JWT error in AI route:", err.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid token" });
  }
}

/* =====================================================
   🤖 GEMINI SETUP
===================================================== */
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY missing — fallback enabled");
} else {
  genAI = new GoogleGenerativeAI(apiKey);
}

function getModel() {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // ✅ WORKING MODEL
  });
}

/* =====================================================
   🧠 FALLBACK LOGIC (never fail)
===================================================== */
function fallbackPredict(text) {
  if (text.toLowerCase().includes("meet")) {
    return ["tomorrow", "at 5 pm", "at the office"];
  }
  return ["ok", "sure", "sounds good"];
}

function fallbackReplies(message) {
  return [
    "Yes, I’ll be there.",
    "Running late, will join soon.",
    "Can we reschedule?",
  ];
}

/* =====================================================
   🧠 AI FUNCTIONS
===================================================== */
async function predictNext(text) {
  if (!genAI) return fallbackPredict(text);

  try {
    const model = getModel();
    const prompt = `
You are a chat assistant.
Suggest ONLY 3 short next-word or phrase completions.

User text: "${text}"

Return output as JSON array ONLY.
Example:
["tomorrow", "at 5 pm", "at the office"]
    `.trim();

    const result = await model.generateContent(prompt);
    const output = result.response.text().trim();

    return JSON.parse(output);
  } catch (err) {
    console.error("AI Predict Error:", err.message);
    return fallbackPredict(text);
  }
}

async function smartReplies(message) {
  if (!genAI) return fallbackReplies(message);

  try {
    const model = getModel();
    const prompt = `
You are a chat assistant.
Generate ONLY 3 short, natural reply messages.

Incoming message: "${message}"

Return output as JSON array ONLY.
Example:
["Yes, I’ll be there.", "Running late.", "Let’s reschedule."]
    `.trim();

    const result = await model.generateContent(prompt);
    const output = result.response.text().trim();

    return JSON.parse(output);
  } catch (err) {
    console.error("AI Smart Reply Error:", err.message);
    return fallbackReplies(message);
  }
}

/* =====================================================
   🚀 ROUTES
===================================================== */

/**
 * POST /api/ai/predict
 * body: { text }
 */
router.post("/predict", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Text is required" });
    }

    const suggestions = await predictNext(text);
    return res.json({ success: true, suggestions });
  } catch (err) {
    console.error("Predict route error:", err.message);
    return res.json({
      success: true,
      suggestions: fallbackPredict(req.body.text || ""),
    });
  }
});

/**
 * POST /api/ai/smart-replies
 * body: { message }
 */
router.post("/smart-replies", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    const replies = await smartReplies(message);
    return res.json({ success: true, replies });
  } catch (err) {
    console.error("Smart reply route error:", err.message);
    return res.json({
      success: true,
      replies: fallbackReplies(req.body.message || ""),
    });
  }
});

module.exports = router;
