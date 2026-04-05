# Faculty Leave Management System

This project is now a small full-stack leave portal with:

- Role-based registration for `Faculty`, `HOD`, `Admin Office`, and `Principal`
- MongoDB-backed user accounts and leave records
- Faculty/HOD leave application workflow
- HOD, Admin Office, and Principal approval stages
- Cleaner dashboard layout with less visual crowding after login
- Faculty analytics, Principal department analytics, AI-style summaries, and certificate download

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from `.env.example` and set your MongoDB connection string:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/faculty_leave_management
```

3. Start the app:

```bash
npm start
```

4. Open:

[http://localhost:3000](http://localhost:3000)

## MongoDB Notes

- A local MongoDB server works with the default `.env.example` value.
- MongoDB Atlas also works if you replace `MONGODB_URI` with your Atlas connection string.
- The browser frontend now talks to the Express API in `server.js`, and the API persists users and leave requests in MongoDB.

## Main Files

- [index.html](/E:/IT/Leave/index.html)
- [styles.css](/E:/IT/Leave/styles.css)
- [client.js](/E:/IT/Leave/client.js)
- [server.js](/E:/IT/Leave/server.js)
- [package.json](/E:/IT/Leave/package.json)
- [.env.example](/E:/IT/Leave/.env.example)
