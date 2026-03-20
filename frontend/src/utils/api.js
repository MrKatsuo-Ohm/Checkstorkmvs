const API_URL = ''

async function handleResponse(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const json = await res.json()
      msg = json.error || json.message || msg
    } catch {}
    throw new Error(msg)
  }
  const json = await res.json()
  return json.data ?? json
}

export const stockApi = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/api/stock`)
    return handleResponse(res)
  },

  create: async (data) => {
    const res = await fetch(`${API_URL}/api/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(res)
  },

  update: async (id, data) => {
    const res = await fetch(`${API_URL}/api/stock/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(res)
  },

  delete: async (id) => {
    const res = await fetch(`${API_URL}/api/stock/${id}`, {
      method: 'DELETE'
    })
    return handleResponse(res)
  }
}
