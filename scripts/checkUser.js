// scripts/checkUser.js
import admin from 'firebase-admin';
import serviceAccount from '../backend/config/serviceAccountKey.local.js';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const uidToCheck = "9QYCsY2L4tNgcjLQi1ZrlFMi0kk1";

admin
  .auth()
  .getUser(uidToCheck)
  .then((userRecord) => {
    console.log("User record found:", {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    });
  })
  .catch((error) => {
    console.error("Error fetching user record:", error);
  });