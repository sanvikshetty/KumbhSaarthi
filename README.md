# KumbhSaarthi – Pilgrimage Crowd Management Platform

KumbhSaarthi is a React-based web application designed to support visitor services and operational coordination at large pilgrimage events, with a focus on the crowd-management needs of Nashik Kumbh 2027.

The platform brings visitor registration and bookings together with staff-facing tools for managing entry, services, capacity-related workflows, and emergency communication.

## Live Demo

- **Application:** https://kumbhsaarthi.netlify.app/

## Key Features

### Visitor services
- Visitor registration and login
- Personal dashboard and booking history
- Parking reservations
- VIP pass booking
- Puja booking and prasad ordering
- Profile, settings, and notifications
- Visitor assistance through the concierge chat interface

### Operations and administration
- Role-based interfaces for visitors, staff, managers, and administrators
- Visitor records and booking management
- QR-code scanning for visitor check-in workflows
- Wristband scanning interface
- Parking and daily pass-limit management
- VIP booking, puja booking, and prasad order administration
- Token counter and token display screens
- Emergency alert interface and panic button

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, JavaScript, HTML5, CSS3 |
| Routing | React Router |
| Backend services | Firebase Authentication, Cloud Firestore |
| Charts | Recharts |
| QR functionality | html5-qrcode, jsQR, qrcode.react |
| Email integration | EmailJS |
| HTTP requests | Axios |
| Deployment | Netlify |

## Getting Started

### Prerequisites
- Node.js (LTS version recommended)
- npm
- A Firebase project with Authentication and Cloud Firestore enabled

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/sanvikshetty/KumbhSaarthi.git
   cd KumbhSaarthi
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and add your Firebase configuration:

   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

   Replace the placeholder values with the configuration from your Firebase project. Do not commit your real `.env` file.

4. Start the development server:

   ```bash
   npm start
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000).

## Build for Production

Run:

```bash
npm run build
```

This creates an optimized production build in the `build` directory.

## Netlify Deployment

To deploy the application on Netlify:

1. Import this GitHub repository into Netlify.
2. Set the build command to `npm run build`.
3. Set the publish directory to `build`.
4. Add the Firebase environment variables listed above in the Netlify site configuration.
5. Trigger a new deployment.

The repository includes a `public/_redirects` file for client-side route fallback.

## Firebase Configuration

The application initializes Firebase using environment variables in `src/firebase.js`. Configure Firebase Authentication and Cloud Firestore in the Firebase project before running the application.

For a separate KumbhSaarthi deployment, use a dedicated Firebase project and its own environment variables. Sharing the same Firebase project with another application can result in shared authentication users and Firestore data.

## Project Structure

```text
src/
├── components/   # Shared UI components and visitor assistance tools
├── pages/        # Visitor, staff, manager, and admin screens
├── styles/       # Application styles
├── firebase.js   # Firebase app, Authentication, and Firestore setup
└── App.js        # Routing, navigation, and role-based route protection
public/           # Static assets and deployment configuration
```

## Contributing

Contributions and suggestions are welcome. For substantial changes, please open an issue first to discuss the proposed update.

## License

No license has been specified for this repository yet.
