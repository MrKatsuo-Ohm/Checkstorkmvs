const API_URL = "https://checkstorkmvs-1.onrender.com";

export const stockApi = {
  getStock: async () => {
    const res = await fetch(`${API_URL}/api/stock`);
    return res.json();
  }
};