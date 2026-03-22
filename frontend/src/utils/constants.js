export const categories = {
  hardware: {
    name: 'ฮาร์ดแวร์',
    icon: 'Cpu',
    subcategories: ['CPU', 'GPU', 'RAM PC', 'RAM Notebook', 'Motherboard', 'PSU', 'Case', 'SSD M.2', 'SSD SATA', 'SSD External', 'HDD Internal', 'HDD External', 'Cooling', 'Case Fan', 'Optical Drive', 'Sound Card']
  },
  accessories: {
    name: 'อุปกรณ์เสริม',
    icon: 'Mouse',
    subcategories: ['เมาส์', 'คีย์บอร์ด', 'หูฟัง/หูฟังไร้สาย', 'ลำโพง', 'ลำโพง Bluetooth', 'เว็บแคม', 'ไมโครโฟน/Content Creator', 'แผ่นรองเมาส์', 'Hub USB', 'Adapter Notebook', 'Adapter Smartphone', 'Cable', 'Card Reader', 'Connector/Hub', 'Controller', 'Cooler Pad', 'Joystick', 'Monitor Arm', 'Power Bank']
  },
  monitors: {
    name: 'จอมอนิเตอร์',
    icon: 'Monitor',
    subcategories: ['จอมอนิเตอร์']
  },
  networking: {
    name: 'อุปกรณ์เครือข่าย',
    icon: 'Wifi',
    subcategories: ['Router', 'Mobile Router', 'Switch', 'Access Point', 'สาย LAN', 'LAN CARD', 'Wireless USB', 'Wireless PCI', 'IP Camera']
  },
  software: {
    name: 'ซอฟต์แวร์',
    icon: 'Code',
    subcategories: ['Windows License', 'Office License', 'Antivirus', 'อื่นๆ']
  },
  storage: {
    name: 'อุปกรณ์จัดเก็บ',
    icon: 'HardDrive',
    subcategories: ['Flash Drive', 'Memory Card', 'Enclosure', 'External', 'DVD External']
  },
  notebook: {
    name: 'โน้ตบุ๊ก',
    icon: 'Laptop',
    subcategories: ['Notebook ทั่วไป', 'Notebook Gaming', 'Notebook Ultrathin', 'Film Notebook', 'Bag Notebook']
  },
  peripherals: {
    name: 'อุปกรณ์ต่อพ่วง',
    icon: 'Layers',
    subcategories: ['Plug/Surge Protector']
  },
  // แก้: เปลี่ยนจาก "Printer" (P ใหญ่) → "printer" (p เล็ก) ให้สม่ำเสมอ
  printer: {
    name: 'Printer & Ink',
    icon: 'Printer',
    subcategories: ['Printer', 'Toner/Ink', 'Scanner']
  },
  // แก้: ลบช่องว่างนำหน้า "misc " → "misc" และแก้ icon ลบ space ต่อท้าย
  misc: {
    name: 'อุปกรณ์อื่นๆ',
    icon: 'MoreHorizontal',
    subcategories: ['Cleaning', 'อื่นๆ']
  }
}

export const API_BASE = '/api'
