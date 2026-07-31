// API Client helper for Django backend communication

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'; // Django server dev port

// Helper to retrieve CSRF token from document.cookie
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Set credentials include so session cookies are sent back and forth
  options.credentials = 'include';
  
  options.headers = {
    ...options.headers,
  };

  // Add Authorization header token if available (for cross-domain authentication fallback)
  const authToken = localStorage.getItem('auth_token');
  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Add CSRF token for mutating requests (POST, PUT, DELETE)
  const method = options.method ? options.method.toUpperCase() : 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      options.headers['X-CSRFToken'] = csrfToken;
    }
  }

  // Handle JSON request body serialization
  if (options.body && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, options);
    
    // Attempt to parse JSON response
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = data && data.detail ? data.detail : (data && typeof data === 'object' ? JSON.stringify(data) : response.statusText);
      const err = new Error(errorMsg || `Request failed with status ${response.status}`);
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export async function downloadFile(endpoint, defaultFilename = 'report.xlsx') {
  const url = `${API_BASE_URL}${endpoint}`;
  const authToken = localStorage.getItem('auth_token');
  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const csrfToken = getCookie('csrftoken');
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Download failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data && data.detail) errorMsg = data.detail;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  let filename = defaultFilename;
  const disposition = response.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '');
    }
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  downloadFile,
  baseUrl: API_BASE_URL,
};
