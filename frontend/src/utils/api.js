const API_URL = "https://checkstorkmvs-1.onrender.com"

export const stockApi = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/api/stock`)
    return res.json()
  },

  create: async (data) => {
    const res = await fetch(`${API_URL}/api/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  update: async (id, data) => {
    const res = await fetch(`${API_URL}/api/stock/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  delete: async (id) => {
    const res = await fetch(`${API_URL}/api/stock/${id}`, {
      method: "DELETE"
    })
    return res.json()
  }
}