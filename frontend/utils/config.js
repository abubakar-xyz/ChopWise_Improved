// Resolve API base URL for frontend calls. Append /api only if not present.
const computeBase = () => {
	let raw = process.env.NEXT_PUBLIC_BACKEND_URL;
	if (!raw && typeof window !== 'undefined') {
		// Fallback to same-origin; assumes reverse-proxy or same host deployment
		raw = window.location.origin;
	}
	raw = (raw || "https://chopwise-improved.onrender.com").replace(/\/$/, '');
	return /\/api$/.test(raw) ? raw : `${raw}/api`;
}

export const API_BASE = computeBase();
export const getApiBase = computeBase;

// Backwards-compatible default export for existing imports
const config = { NEXT_PUBLIC_BACKEND_URL: API_BASE };
export default config;