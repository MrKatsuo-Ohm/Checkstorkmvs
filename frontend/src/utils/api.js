const BASE = '/api/stock'

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const stockApi = {
  getAll: () => request(BASE),
  getById: (id) => request(`${BASE}/${id}`),
  getStats: () => request(`${BASE}/stats`),
  create: (body) => request(BASE, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`${BASE}/${id}`, { method: 'DELETE' })
}
