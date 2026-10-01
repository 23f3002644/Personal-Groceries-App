const apiBaseUrl = import.meta.env.VITE_API_URL || ''

export function apiFetch(path, options) {
  return fetch(`${apiBaseUrl}${path}`, options)
}
