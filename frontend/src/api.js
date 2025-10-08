// api.js
/*import axios from "axios";

// Adjust BASE_URL to your FastAPI backend (or keep mock if not ready yet)
const BASE_URL = "http://localhost:8000";

const API = axios.create({
  baseURL: BASE_URL,
});

export default API;
*/
// src/api.js
import axios from "axios";

const BASE_URL = "http://localhost:8000";

const API = axios.create({
  baseURL: BASE_URL,
});

// 🔹 Attach JWT token to every request if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🔹 Login user and save token
export const loginUser = async (credentials) => {
  const res = await API.post("/token", credentials, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const token = res.data.access_token;
  if (token) {
    localStorage.setItem("token", token);
  }
  return res.data;
};

// 🔹 Fetch past reviews for logged-in user
export const fetchReviews = async () => {
  const res = await API.get("/past-reviews");
  return res.data;
};

// 🔹 Generate a new review for given code
export const generateReview = async (code) => {
  const res = await API.post("/generate-review", { code });
  return res.data;
};

// 🔹 Get predefined rejection reasons
export const getRejectionReasons = async () => {
  const res = await API.get("/rejection-reasons");
  return res.data;
};

// 🔹 Submit feedback with multiple rejection reasons and section-level feedback
export const submitFeedback = async (reviewId, feedback, rejectionReasons = [], customReason = null, sectionStates = null) => {
  // Prepare detailed section feedback
  const sectionFeedback = sectionStates ? {
    review_section: sectionStates.review,
    original_code_section: sectionStates.originalCode,
    optimized_code_section: sectionStates.optimizedCode,
    explanation_section: sectionStates.explanation,
    security_analysis_section: sectionStates.securityAnalysis
  } : {};

  const res = await API.post("/submit-feedback", {
    review_id: reviewId,
    feedback,
    rejection_reasons: rejectionReasons,
    custom_rejection_reason: customReason,
    section_feedback: sectionFeedback
  });
  return res.data;
};

export default API;
