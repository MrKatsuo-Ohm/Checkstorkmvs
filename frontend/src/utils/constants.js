export const categories = {
  hardware: {
    name: 'ฮาร์ดแวร์',
    icon: 'Cpu',
    subcategories: ['CPU', 'GPU', 'RAM PC', 'RAM Notebook', 'Motherboard', 'PSU', 'Case', 'SSD M.2', 'SSD SATA', 'HDD Internal', 'Cooling', 'Case Fan', ]
  },
  accessories: {
    name: 'อุปกรณ์เสริม',
    icon: 'Mouse',
    subcategories: ['เมาส์' ,'เมาส์เกมมิ่ง', 'คีย์บอร์ด','คีย์บอร์ดเกมมิ่ง', 'หูฟัง/หูฟังไร้สาย', 'ลำโพง', 'ลำโพง Bluetooth', 'เว็บแคม', 'ไมโครโฟน/Content Creator', 'แผ่นรองเมาส์', 'Hub USB', 'Adapter Notebook', 'Adapter Smartphone', 'Cable', 'Card Reader', 'Connector/Hub', 'Controller', 'Cooler Pad', 'Joystick', 'Monitor Arm', 'Power Bank' ,'Optical Drive', 'Sound Card']
  },
  monitors: {
    name: 'จอมอนิเตอร์',
    icon: 'Monitor',
    subcategories: ['จอมอนิเตอร์']
  },
  networking: {
    name: 'อุปกรณ์เครือข่าย',
    icon: 'Wifi',
    subcategories: ['อุปกรณ์เน็ตเวิร์ค', 'IP Camera' , 'สาย LAN', ]
  },
  software: {
    name: 'ซอฟต์แวร์',
    icon: 'Code',
    subcategories: ['Windows License', 'Office License', 'Antivirus', ]
  },
  storage: {
    name: 'อุปกรณ์จัดเก็บ',
    icon: 'HardDrive',
    subcategories: ['Flash Drive', 'Memory Card', 'Enclosure', 'External', 'DVD External']
  },
  notebook: {
    name: 'โน้ตบุ๊ก เดสก์ท็อป และ All-in-One',
    icon: 'Laptop',
    subcategories: ['Notebook ทั่วไป', 'Notebook Gaming', 'Notebook Ultrathin', 'Film Notebook', 'Bag Notebook', 'Giftbox Notebook', 'Desktop' ,'All-in-One']
  },
  peripherals: {
    name: 'อุปกรณ์ต่อพ่วง',
    icon: 'Layers',
    subcategories: ['Plug/Surge Protector']
  },
  printer: {
    name: 'Printer & Ink',
    icon: 'Printer',
    subcategories: ['Printer', 'Toner/Ink', 'Scanner']
  },
  misc: {
    name: 'อุปกรณ์อื่นๆ',
    icon: 'MoreHorizontal',
    subcategories: ['Cleaning', 'อื่นๆ']
  }
}

export const API_BASE = '/api'
