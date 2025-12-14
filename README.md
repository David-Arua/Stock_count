# Farmer–Vendor Marketplace (Stock_count)

This project is a simple marketplace connecting farmers and vendors. It includes:
- Frontend: Multi-page app (Farmer, Vendor, Product Detail, Messages, Landing) built with HTML/CSS/JS
- Backend: Node.js + Express REST API with SQLite for persistence

## Application Overview

- Farmer Portal (farmer.html): Farmers login, add product listings (with images), view incoming purchase requests, and update request status (pending → approved → in-transit → completed).
- Vendor Portal (vendor.html): Vendors login, browse/search products, view their purchase requests and chat with farmers.
- Product Detail (logistics.html): Detailed view of a product, farmer info, and a form for vendors to submit purchase requests; link to start a chat.
- Messages (messages.html): Conversation list and chat between any two users.
- Landing (index.html): Login/Register, then routes users to their respective portals.

## Tech Stack
- Frontend: HTML, CSS, JavaScript (fetch-based API client)
- Backend: Node.js, Express, SQLite3
- DB: SQLite file auto-created and migrated at startup

## Folder Structure

```
Stock_count/
  frontend/
    index.html
    farmer.html
    vendor.html
    logistics.html
    messages.html
    styles/style.css
    js/
      api.js        (REST client)
      farmer.js     (Farmer portal logic)
      vendor.js     (Vendor portal logic)
      logistics.js  (Product detail logic)
      messages.js   (Messaging UI logic)
  backend/
    server.js
    package.json
    README.md
    .gitignore
    models/
      database.js   (SQLite setup + tables)
    routes/
      users.js      (register, login, get users)
      products.js   (CRUD + filters/search)
      requests.js   (create + status updates)
      messages.js   (send + list + conversations)
```

## How It Works

- Auth: Backend verifies login via `POST /api/users/login` (email + password). Registration via `POST /api/users/register`. The frontend stores the returned user in localStorage for session continuity.
- Products: Farmers create listings (`POST /api/products`) including images (as URLs/base64 data). Vendors fetch/search listings (`GET /api/products?search=...`).
- Requests: Vendors create purchase requests (`POST /api/requests`). Farmers update status (`PATCH /api/requests/:id`).
- Messages: Users send messages (`POST /api/messages`), view conversations for a user (`GET /api/messages/conversations/:userId`), and fetch chat threads between two users (`GET /api/messages?userId1=...&userId2=...`).

## Run the Backend

1) Install dependencies
```
cd backend
npm install
```
2) Start the server
```
npm start
```
- Runs on `http://localhost:5000`
- Auto-creates `marketplace.db` and tables (users, products, requests, messages)

## Run the Frontend

Serve the frontend with a simple static server so fetch calls work:
```
cd ../frontend
npx serve -l 3000
```
Open `http://localhost:3000` in your browser.

## Connecting Frontend ↔ Backend

- The frontend API client in `frontend/js/api.js` points to `http://localhost:5000/api` and uses `fetch` for all operations (login, register, products, requests, messages).
- All page scripts (`farmer.js`, `vendor.js`, `logistics.js`, `messages.js`) call these API methods asynchronously and render the results.

## Key Endpoints

- Users: `POST /api/users/register`, `POST /api/users/login`, `GET /api/users/:id`, `GET /api/users`
- Products: `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`
- Requests: `GET /api/requests`, `POST /api/requests`, `PATCH /api/requests/:id`
- Messages: `GET /api/messages`, `GET /api/messages/conversations/:userId`, `POST /api/messages`

## Purpose of the Application

This application demonstrates a streamlined agricultural marketplace:
- Empower farmers to list produce and manage orders
- Enable vendors to discover products, negotiate, and track purchases
- Provide a built-in messaging channel to facilitate direct communication
- Offer transparent status tracking from request to delivery completion

## Next Steps (Optional Enhancements)
- Add JWT-based auth and password hashing (bcrypt)
- Add pagination and sorting for product listings
- Add image upload handling via storage service (e.g., Firebase/AWS S3)
- Implement notifications (WebSockets) for real-time updates
- Add role-based access control and audit logs
