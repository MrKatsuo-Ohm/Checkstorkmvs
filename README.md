# ระบบจัดการสต๊อกอุปกรณ์คอมพิวเตอร์

แอปพลิเคชันจัดการสต๊อกอุปกรณ์คอมพิวเตอร์ แบ่งเป็น React Frontend + Node.js Backend

---

## 📁 โครงสร้างโปรเจค

```
it-stock-app/
├── backend/              ← Node.js + Express API Server
│   ├── models/
│   │   └── Stock.js      ← In-memory database model
│   ├── routes/
│   │   └── stock.js      ← REST API routes
│   ├── server.js         ← Entry point
│   └── package.json
│
├── frontend/             ← React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── StockModal.jsx
│   │   │   └── Toast.jsx
│   │   ├── context/
│   │   │   └── StockContext.jsx   ← Global state (React Context)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── AddForm.jsx
│   │   │   ├── LowStock.jsx
│   │   │   └── Reports.jsx
│   │   ├── utils/
│   │   │   ├── api.js         ← API fetch functions
│   │   │   ├── constants.js   ← Categories data
│   │   │   └── helpers.js     ← Format utilities
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

---

## 🚀 วิธีติดตั้งและรัน

### 1. ติดตั้ง Backend

```bash
cd backend
npm install
npm run dev     # development (nodemon)
# หรือ
npm start       # production
```

Backend จะรันที่ `http://localhost:5000`

### 2. ติดตั้ง Frontend

```bash
cd frontend
npm install
npm run dev     # development (Vite)
# หรือ
npm run build   # build สำหรับ production
```

Frontend จะรันที่ `http://localhost:3000`

---

## 🔌 API Endpoints

| Method | URL | คำอธิบาย |
|--------|-----|-----------|
| GET | `/api/stock` | ดึงรายการสินค้าทั้งหมด |
| GET | `/api/stock/stats` | ดูสถิติสรุป |
| GET | `/api/stock/:id` | ดูสินค้าชิ้นเดียว |
| POST | `/api/stock` | เพิ่มสินค้าใหม่ |
| PUT | `/api/stock/:id` | แก้ไขสินค้า |
| DELETE | `/api/stock/:id` | ลบสินค้า |

### ตัวอย่าง Request Body (POST/PUT)

```json
{
  "name": "AMD Ryzen 5 5600X",
  "category": "hardware",
  "subcategory": "CPU",
  "quantity": 10,
  "min_stock": 5,
  "price": 7500,
  "location": "ชั้น A-01",
  "notes": "AM4 Socket"
}
```

---

## 💾 Database

ปัจจุบันใช้ **In-Memory Storage** (ข้อมูลหายเมื่อรีสตาร์ท)

### เปลี่ยนเป็น MongoDB (แนะนำ)

```bash
npm install mongoose
```

แก้ไข `backend/models/Stock.js` ให้ใช้ Mongoose Schema แทน array

### เปลี่ยนเป็น SQLite (ง่าย ไม่ต้องติดตั้ง server)

```bash
npm install better-sqlite3
```

---

## ⚙️ Environment Variables

สร้างไฟล์ `backend/.env`:

```env
PORT=5000
NODE_ENV=development
```

---

## 🛠️ Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Lucide Icons |
| Backend | Node.js, Express.js |
| State | React Context API |
| Font | Noto Sans Thai (Google Fonts) |
