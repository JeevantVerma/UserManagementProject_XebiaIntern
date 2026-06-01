# UserManagementProject_XebiaIntern

Simple user management app with admin and user sign-in, user listing, profile photo uploads, and admin enable/disable controls.

## Live URLs

- Frontend: https://xebiaintern.jeevantverma.tech
- Backend: https://usermanagementproject-xebiaintern.onrender.com

## Features

- Admin and user login
- Admin dashboard to add users/admins with profile photo upload
- User list with role, contact, and status
- Enable/disable accounts from the admin dashboard
- Basic validation with frontend hints
- Rate limiting on API routes

## Quick start (local)

### Backend

```
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000` and stores uploads in `backend/uploads`.
MongoDB Atlas is used for data storage.

Default admin credentials:

- Email: admin@example.com
- Password: admin123

### Frontend

```
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment variables

### Backend (.env)

```
MONGO_URI=your_mongodb_atlas_connection_string
PORT=4000
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:4000
```

## Deploy notes

### Render (backend)

- Build command: `npm install`
- Start command: `npm start`
- Env vars: `MONGO_URI`

### Cloudflare Pages (frontend)

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Output directory: `dist`
- Env vars: `VITE_API_URL` (Render backend URL)