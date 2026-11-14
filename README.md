# 🌱 AgriLink LK – Farmer-to-Buyer Online Marketplace

## 📌 Project Overview

**AgriLink LK** is a Simple web-based agricultural marketplace designed to connect Sri Lankan farmers directly with buyers, eliminating the need for intermediaries.

The platform allows farmers to list and manage their agricultural products, set prices, and handle customer orders, while buyers can browse available products, compare prices, and place orders conveniently.

AgriLink LK aims to promote fair pricing, improve market accessibility, and support local farmers through a simple, transparent, and user-friendly digital marketplace.

## 🎯 Project Objectives

- Connect local farmers directly with buyers.
- Reduce dependency on intermediaries.
- Promote fair and transparent agricultural pricing.
- Provide an easy platform for managing agricultural products and orders.
- Support digital transformation in Sri Lanka's agricultural sector.

## ✨ Key Features

### 👨‍🌾 Farmer Features

- Farmer registration and secure login.
- Add agricultural products with images, prices, and quantities.
- View, update, and delete listed products.
- Manage product availability and stock levels.
- View and manage incoming customer orders.
- Accept, reject, and update order statuses.
- Monitor product inventory and sales information.

### 🛒 Buyer Features

- Buyer registration and secure login.
- Browse available agricultural products.
- Search and filter products by category.
- View product details, prices, and availability.
- Place orders directly with farmers.
- View order history and track order status.
- Cancel pending orders.

### 🔐 Authentication & Security

- Role-based authentication for farmers and buyers.
- Secure login using JSON Web Tokens (JWT).
- Password encryption using bcryptjs.
- Protected API routes and user-specific access control.
- Server-side input validation.

## 🛠️ Technologies Used

**Frontend**

- HTML5
- CSS3
- JavaScript

**Backend**

- Node.js
- Express.js

**Database**

- MongoDB
- Mongoose

**Authentication & Other Tools**

- JSON Web Tokens (JWT)
- bcryptjs
- Multer
- Chart.js

## ⚙️ Installation & Setup

### Prerequisites

- Node.js (v18 or later)
- MongoDB
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/gdhspchathuranga/AgrilinkLK.git
cd AgriLink-LK
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/agrilinklk
JWT_SECRET=your_secure_jwt_secret
```

### 4. Start the Application

```bash
npm start
```

### 5. Open the Application

Visit:

[http://localhost:5000](http://localhost:5000)

## 🌍 Project Impact

AgriLink LK supports Sri Lanka's agricultural community by providing a digital platform that improves communication between farmers and buyers, encourages transparent pricing, and creates better market opportunities for local agricultural producers.

## 🚀 Future Enhancements

- Flutter-based mobile application.
- Online payment integration.
- Real-time notifications.
- Delivery tracking and management.
- Product ratings and reviews.

## 📄 License

This project is developed for educational and learning purposes.
