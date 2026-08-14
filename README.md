# 🏥 Medical ERP & Barcode Management System

![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Ready-green?style=for-the-badge&logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

A premium, fast, and highly secure Medical ERP designed to streamline pharmacy and medical shop operations. This application offers end-to-end management from inventory and barcode generation to billing, analytics, and distributor tracking.

---

## ✨ Key Features

- 📊 **Smart Dashboard**: Real-time insights into today's revenue, active stock value, low stock warnings, and 90-day expiry alerts.
- 📦 **Purchase & Inventory**: Add new medicine stocks, track batches, distributors, MRP, and purchase dates.
- 🏷️ **Thermal Barcode Generation**: Auto-generates Code128 barcodes for medicines. Highly optimized for 50mm x 25mm thermal labels with one-click bulk printing.
- 🛒 **Quick Sell / POS**: Scanner-ready Point of Sale system. Scan barcodes to instantly add to cart, calculate totals, and checkout.
- 📈 **Advanced Analytics**: Track distributor performance, view daily sales history, and manage revenue effectively.
- 💾 **Data Security**: Secure database connection using Mongoose, with backup & restore utilities built-in.

---

## 🚀 Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, Lucide React (Icons)
- **Backend**: Next.js API Routes (Node.js)
- **Database**: MongoDB (Mongoose ORM)
- **Libraries**: `react-barcode`, `react-to-print`, `html5-qrcode`, `react-hot-toast`, `recharts`

---

## 💻 Getting Started (For Developers)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas)

### 2. Installation
Clone the repository and install the required dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and configure your MongoDB connection string and authentication secrets:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/medical-erp
NEXTAUTH_SECRET=your_super_secret_key_here
NEXTAUTH_URL=http://localhost:3000
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🛠️ Build for Production
To create an optimized production build:
```bash
npm run build
npm run start
```

---

## 📐 Architecture & Design

- **Mobile-First Responsive Design**: The UI is built entirely with Tailwind CSS ensuring it scales beautifully from mobile devices to 4K desktop screens.
- **Micro-Animations**: Clean hover states and transition delays are used to make the application feel alive and premium.
- **Modular Components**: Features like `CameraScanner`, `StatCards`, and `ExpiryAlerts` are broken down into reusable React components.

---
*Developed & Designed with Mahadev❤️ for modern medical businesses.*
