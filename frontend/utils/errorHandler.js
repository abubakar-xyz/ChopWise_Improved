/**
 * Sanitize error messages to prevent XSS
 * @param {string} message - The error message to sanitize
 * @returns {string} Sanitized error message
 */
export const sanitizeErrorMessage = (message) => {
  if (!message) return 'An unexpected error occurred';
  // Remove HTML tags and limit length
  return message.replace(/<[^>]*>/g, '').slice(0, 200);
};

/**
 * Standard error handler for API requests
 * @param {Error} error - The error object
 * @param {Function} setError - State setter for error message
 * @param {Function} setLoading - State setter for loading state
 */
export const handleApiError = (error, setError, setLoading) => {
  console.error('API Error:', error);
  
  let errorMessage = 'An unexpected error occurred';
  
  if (error.response) {
    // Server responded with error
    errorMessage = error.response.data?.detail || `Server error: ${error.response.status}`;
  } else if (error.request) {
    // Request made but no response
    errorMessage = 'No response from server. Please check your connection.';
  } else {
    // Request setup error
    errorMessage = error.message;
  }
  
  setError(sanitizeErrorMessage(errorMessage));
  if (setLoading) setLoading(false);
};

/**
 * Validate session ID format
 * @param {string} sessionId - The session ID to validate
 * @returns {boolean} Whether the session ID is valid
 */
export const isValidSessionId = (sessionId) => {
  if (!sessionId) return false;
  // UUID v4 regex pattern
  const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Pattern.test(sessionId);
};

/**
 * Generate request ID for tracking
 * @returns {string} A unique request ID
 */
export const generateRequestId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
