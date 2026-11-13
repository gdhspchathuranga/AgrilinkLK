# AgriLink LK

Farmer-to-buyer marketplace for Sri Lanka. Node.js + Express + MongoDB backend, plain HTML/CSS/JavaScript frontend.

## Set up
1. Install Node.js (v18 or newer) and MongoDB (or create a free MongoDB Atlas database).
2. In the `backend` folder:
   ```
   npm install
   copy .env.example .env      (Mac/Linux: cp .env.example .env)
   ```
   Open `.env` and set `MONGO_URI` and a long random `JWT_SECRET`.
3. Copy your own hero image to `frontend/css/home.png` (optional, the pages work without it).
4. Create the admin account (once):
   ```
   node createAdmin.js you@example.com YourStrongPassword
   ```
5. Start the server:
   ```
   npm start
   ```
6. Open http://localhost:5000

## Accounts
- Farmers and buyers register on the Register page.
- Admins are created only with `createAdmin.js`.

## Folders
- `backend/models`: User, Product, Order
- `backend/routes`: auth, products (with photo upload), orders, admin
- `backend/uploads`: product photos (created automatically, not committed)
- `frontend`: pages, `css/dashboard.css`, and `js/` (api.js is the shared helper)

## Old files you can delete
`backend/routes/farmer.routes.js`, `backend/routes/buyer.routes.js`, `frontend/edit-product.html`,
`frontend/css/forms.css`, `frontend/css/main.css`, `.env.example.txt`, `.gitignore.txt`
