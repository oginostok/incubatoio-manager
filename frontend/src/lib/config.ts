// API Configuration
// In production, this will use the relative /api path since frontend and backend are served from the same domain
// In development, it uses localhost:8000

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_URL = `${API_BASE_URL}/api`;
