const API_URL = "https://checkstorkmvs-1.onrender.com/api/stock";

export const getStock = async () => {
  const res = await fetch(`${API_URL}/api/stock`);
  return res.json();
};