# Faculty Leave Management System

This project is now a small full-stack leave portal with:

- Role-based registration for `Faculty`, `HOD`, `Admin Office`, and `Principal`
- Firebase Firestore-backed user accounts and leave records
- Faculty/HOD leave application workflow
- HOD, Admin Office, and Principal approval stages
- Cleaner dashboard layout with less visual crowding after login
- Faculty analytics, Principal department analytics, AI-style summaries, and certificate download
- Firebase Storage-backed proof uploads for optional leave attachments

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from `.env.example` and add your Firebase service account details:

```env
PORT=3000
FIREBASE_PROJECT_ID=leaveai-b5efb
FIREBASE_CLIENT_EMAIL=your-service-account-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=leaveai-b5efb.firebasestorage.app
FIREBASE_API_KEY=your-web-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-web-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id
```

3. Start the app:

```bash
npm start
```

4. Open:

[http://localhost:3000](http://localhost:3000)

## Firebase Notes

- The Express backend uses the Firebase Admin SDK, so it runs against your Firebase project from the server side.
- Leave data and registered accounts are stored in Firestore collections named `users` and `leaves`.
- Optional proof files are uploaded to Firebase Storage and only their metadata/download URL is saved in Firestore.
- The web config keys like `apiKey`, `authDomain`, `appId`, and `measurementId` come from the browser SDK config. They identify the Firebase project, but they do not replace server-side admin credentials.
- For this backend, you still need either `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a Firebase service-account JSON file.
- `FIREBASE_STORAGE_BUCKET` is needed only for proof uploads, but Firestore-backed login and leave records still work without proof files.

## Main Files

- [index.html](/E:/IT/Leave/index.html)
- [styles.css](/E:/IT/Leave/styles.css)
- [client.js](/E:/IT/Leave/client.js)
- [server.js](/E:/IT/Leave/server.js)
- [package.json](/E:/IT/Leave/package.json)
- [.env.example](/E:/IT/Leave/.env.example)
