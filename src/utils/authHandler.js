/**
 * Authentication handler utility that checks for auth errors
 * and redirects to login page when authentication issues occur
 */

/**
 * Handles errors in API responses and redirects to login page if authentication fails
 * @param {Error|Response|Object} errorOrResponse - The error or response from an API call
 * @param {Object} options - Additional options
 * @param {boolean} options.shouldRedirect - Whether to redirect (defaults to true)
 * @param {boolean} options.clearAuth - Whether to clear auth data (defaults to true)
 * @returns {boolean} - Returns true if authentication error was detected
 */
export const handleAuthError = (errorOrResponse, options = {}) => {
  const { shouldRedirect = true, clearAuth = true } = options;
  let isAuthError = false;

  try {
    // Case 1: Handle Response object
    if (errorOrResponse instanceof Response) {
      if (errorOrResponse.status === 401 || errorOrResponse.status === 403) {
        console.error(`Authentication error: ${errorOrResponse.status} ${errorOrResponse.statusText}`);
        isAuthError = true;
      }
    }
    // Case 2: Handle Error object
    else if (errorOrResponse instanceof Error) {
      const errorMessage = errorOrResponse.message.toLowerCase();
      if (
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('unauthenticated') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('token expired') ||
        errorMessage.includes('token invalid') ||
        errorMessage.includes('not logged in') ||
        errorMessage.includes('jwt') ||
        errorMessage.includes('auth') ||
        errorMessage.includes('permission') ||
        errorMessage.includes('login required')
      ) {
        console.error(`Authentication error: ${errorOrResponse.message}`);
        isAuthError = true;
      }
    }
    // Case 3: Handle error object with status code
    else if (typeof errorOrResponse === 'object' && errorOrResponse !== null) {
      if (
        errorOrResponse.status === 401 ||
        errorOrResponse.status === 403 ||
        (errorOrResponse.error && 
         typeof errorOrResponse.error === 'string' && 
         (errorOrResponse.error.toLowerCase().includes('auth') || 
          errorOrResponse.error.toLowerCase().includes('token') ||
          errorOrResponse.error.toLowerCase().includes('login')))
      ) {
        console.error('Authentication error detected in response object');
        isAuthError = true;
      }
    }

    // If we detected an auth error
    if (isAuthError) {
      if (clearAuth) {
        // Clear all authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('userInfo');
      }

      if (shouldRedirect) {
        // Prevent infinite redirects and ensure we go to login
        if (!window.location.pathname.includes('/login')) {
          console.log('Redirecting to login page due to authentication error');
          // Force reload to clear any React state
          window.location.href = '/';
        }
      }
    }
    
    return isAuthError;
  } catch (e) {
    console.error('Error in auth error handler:', e);
    
    // On critical error in the handler itself, attempt to redirect anyway
    if (shouldRedirect) {
      window.location.href = '/';
    }
    
    return false;
  }
};

/**
 * Checks if the token exists and redirects to login if it doesn't
 * @returns {boolean} - Returns true if authenticated, false otherwise
 */
export const checkAuthentication = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (!token) {
    // Prevent infinite redirects
    if (!window.location.pathname.includes('/')) {
      console.log('No auth token found, redirecting to login page');
      window.location.href = '/';
    }
    return false;
  }
  
  // Check if token is expired (if JWT)
  try {
    if (token.includes('.')) {
      // This is likely a JWT token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      
      if (Date.now() >= expiry) {
        console.log('Token expired, redirecting to login page');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        
        if (!window.location.pathname.includes('/')) {
          window.location.href = '/';
        }
        return false;
      }
    }
  } catch (e) {
    // If we can't parse the token, assume it's valid
    console.warn('Could not verify token expiration:', e);
  }
  
  return true;
};

/**
 * Wrapper for fetch that handles authentication errors
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export const authFetch = async (url, options = {}) => {
  // Check authentication before making the request
  checkAuthentication();
  
  // Add authorization header if token exists
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  try {
    const response = await fetch(url, options);
    
    // Check if response indicates auth error
    if (response.status === 401 || response.status === 403) {
      handleAuthError(response);
      throw new Error(`Authentication error: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    // Handle network errors or other exceptions
    const isAuthError = handleAuthError(error);
    
    if (!isAuthError) {
      // If it's not an auth error, just rethrow
      throw error;
    } else {
      // If it is an auth error, throw a more specific error
      throw new Error('Authentication failed. Redirecting to login...');
    }
  }
};

export default {
  handleAuthError,
  checkAuthentication,
  authFetch
};
