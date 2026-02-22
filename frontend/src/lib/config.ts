// API Configuration
// In production, VITE_API_URL should be set to "" (empty) so that API calls use the relative /api path
// In development (no .env), it falls back to localhost:8000

const rawUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL = rawUrl !== undefined ? rawUrl : "http://localhost:8000";
export const API_URL = `${API_BASE_URL}/api`;
