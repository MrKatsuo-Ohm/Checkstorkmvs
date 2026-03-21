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
      const data = await stockApi.getAll();
      // normalize MongoDB _id → id เพื่อให้ทุกที่ใช้ item.id ได้เลย
      const normalized = Array.isArray(data)
        ? data.map(i => ({ ...i, id: i._id || i.id }))
        : [];
      setItems(normalized);
    } catch (err) {
      showToast("โหลดข้อมูลไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const createItem = useCallback(
    async (data) => {
      // แก้: เพิ่มขีดจำกัดเป็น 9,999 รายการ
      if (items.length >= 9999) {
        showToast("ถึงขีดจำกัด 9,999 รายการแล้ว", "error");
        return false;
      }
      setLoading(true);
      try {
        const newItem = await stockApi.create(data);
        const normalized = { ...newItem, id: newItem._id || newItem.id };
        setItems((prev) => [...prev, normalized]);
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
        const updated = await stockApi.update(id, data);
        const normalizedUpdated = { ...updated, id: updated._id || updated.id || id };
        setItems((prev) =>
          prev.map((i) => (i.id === id ? normalizedUpdated : i))
        );
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
