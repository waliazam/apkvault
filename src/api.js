export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export function getAdminToken() {
  return window.localStorage.getItem('appvault_admin_token') || '';
}

export function setAdminToken(token) {
  if (token) {
    window.localStorage.setItem('appvault_admin_token', token);
  } else {
    window.localStorage.removeItem('appvault_admin_token');
  }
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAdminToken();
  const isFormData = options.body instanceof FormData;

  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function fetchPublicData() {
  const [appsData, postsData, staticPageData] = await Promise.all([
    apiFetch('/apps'),
    apiFetch('/posts?type=all'),
    apiFetch('/static-pages'),
  ]);

  return {
    apps: appsData.apps || [],
    posts: postsData.posts || [],
    staticPages: Object.fromEntries((staticPageData.pages || []).map((page) => [page.path, page])),
  };
}
