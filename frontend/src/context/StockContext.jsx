import React, { createContext, useContext, useState, useCallback } from "react";
import { stockApi } from "../utils/api";

const StockContext = createContext(null);

export function StockProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stockApi.getAll();
      setItems(res.data.data); // 🔥 แก้ตรงนี้
    } catch (err) {
      showToast("โหลดข้อมูลไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const createItem = useCallback(
    async (data) => {
      if (items.length >= 999) {
        showToast("ถึงขีดจำกัด 999 รายการแล้ว", "error");
        return false;
      }
      setLoading(true);
      try {
        const res = await stockApi.create(data);
        setItems((prev) => [...prev, res.data]);
        showToast("เพิ่มสินค้าสำเร็จ!", "success");
        return true;
      } catch (err) {
        showToast(err.message || "เกิดข้อผิดพลาด", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [items.length, showToast],
  );

  const updateItem = useCallback(
    async (id, data) => {
      setLoading(true);
      try {
        const res = await stockApi.update(id, data);
        setItems((prev) => prev.map((i) => (i.id === id ? res.data : i)));
        showToast("บันทึกการแก้ไขสำเร็จ!", "success");
        return true;
      } catch (err) {
        showToast(err.message || "เกิดข้อผิดพลาด", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  const deleteItem = useCallback(
    async (id) => {
      setLoading(true);
      try {
        await stockApi.delete(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast("ลบสินค้าสำเร็จ!", "success");
        return true;
      } catch (err) {
        console.error("Delete failed:", err);
        showToast(err.message || "ลบไม่สำเร็จ กรุณาลองใหม่", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  return (
    <StockContext.Provider
      value={{
        items,
        loading,
        toast,
        fetchItems,
        createItem,
        updateItem,
        deleteItem,
        showToast,
      }}
    >
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock must be used inside StockProvider");
  return ctx;
}
