# KumbhSaarthi – Pilgrimage Crowd Management

A React-based application for managing visitor flow and operations at temples and pilgrimage sites. This repository is a separately branded clone of the TempleFlow project.

## Features
- Visitor and staff/admin login flows
- Visitor registration and booking management
- Crowd and capacity dashboard
- Visitor check-in and check-out workflows
- QR scanning and wristband scanning screens
- Parking, VIP pass, puja and prasad workflows
- Emergency alert interface
- Notifications, profile and settings
- Responsive React interface

## Tech stack
- React 18 and React Router
- Firebase Authentication and Cloud Firestore
- Recharts
- HTML5 QR scanning and QR code generation
- CSS

## Run locally
1. Install Node.js (LTS recommended).
2. Clone this repository.
3. Install dependencies with `npm install`.
4. Add the required Firebase configuration as environment variables (see below).
5. Start the app with `npm start`.

## Environment variables
Create a local `.env` file (never commit it) with the Firebase values used by `src/firebase.js`:

```env
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=
```

For Netlify, add the same variables under Site configuration → Environment variables. The project uses Firebase configuration from the environment; no credentials are included in this repository.

## Build
```bash
npm run build
```

## Deployment
Connect this repository to Netlify, use `npm run build` as the build command and `build` as the publish directory. The `public/_redirects` file provides SPA route fallback.

## Important backend note
The app is configured to use Firebase Authentication and Cloud Firestore. To make KumbhSaarthi fully independent of TempleFlow, configure it with a separate Firebase project and its own environment variables. Reusing the original Firebase project will share authentication users and Firestore data between both apps.
