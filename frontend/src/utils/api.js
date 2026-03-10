const API_URL = ""

export const stockApi = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/api/stock`)
    const json = await res.json()
    return json.data ?? json
  },

  create: async (data) => {
    const res = await fetch(`${API_URL}/api/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    const json = await res.json()
    return json.data ?? json
  },

  update: async (id, data) => {
    const res = await fetch(`${API_URL}/api/stock/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    const json = await res.json()
    return json.data ?? json
  },

  delete: async (id) => {
    const res = await fetch(`${API_URL}/api/stock/${id}`, {
      method: "DELETE"
    })
    const json = await res.json()
    return json.data ?? json
  }
}
