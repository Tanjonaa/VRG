const BASE = '/api'

const req = async (method, path, body) => {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('vrg_token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  if (data.token) localStorage.setItem('vrg_token', data.token)
  return data
}

export const api = {
  get:  (path)       => req('GET',    path),
  post: (path, body) => req('POST',   path, body),
  put:  (path, body) => req('PUT',    path, body),
}

export const saveToken  = (t) => localStorage.setItem('vrg_token', t)
export const clearToken = ()  => localStorage.removeItem('vrg_token')
