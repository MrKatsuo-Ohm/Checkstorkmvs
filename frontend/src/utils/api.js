const API_URL = "https://checkstorkmvs-1.onrender.com";

export const getStock = async () => {
  const res = await fetch(`${API_URL}/api/stock`);
  return res.json();
};

export const addStock = async (data) => {
  const res = await fetch(`${API_URL}/api/stock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  return res.json();
};