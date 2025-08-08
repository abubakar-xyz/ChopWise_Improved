// Resolve API base URL for frontend calls. Ensure it includes /api prefix.
export const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://chopwise-improved.onrender.com")
  .replace(/\/$/, '') + '/api';

// Backwards-compatible default export for existing imports
const config = { NEXT_PUBLIC_BACKEND_URL: API_BASE };
export default config;