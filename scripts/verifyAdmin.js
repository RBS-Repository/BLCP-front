import admin from 'firebase-admin';
import serviceAccount from '../backend/config/serviceAccountKey.local.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const verifyAdminClaim = async (uid) => {
  try {
    const user = await admin.auth().getUser(uid);
    console.log("Current user claims:", user.customClaims);
    
    // Get token result to verify
    const userRecord = await admin.auth().getUser(uid);
    console.log("User record:", {
      uid: userRecord.uid,
      email: userRecord.email,
      customClaims: userRecord.customClaims
    });
    
    if (!userRecord.customClaims?.admin) {
      console.log("Setting admin claim...");
      await admin.auth().setCustomUserClaims(uid, { admin: true });
      console.log("Admin claim set successfully");
    } else {
      console.log("Admin claim already exists");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
};

// Use the UID from your user
const uid = "9QYCsY2L4tNgcjLQi1ZrlFMi0kk1";
verifyAdminClaim(uid); 