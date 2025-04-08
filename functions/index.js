/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud function to delete a user from Authentication
 * @param {Object} data The request data
 * @param {Object} context The function context
 * @return {Promise<Object>} Response object
 */
exports.deleteUserAuth = functions.https.onCall(async (data, context) => {
  try {
    // Check if the caller is authenticated
    if (!context.auth) {
      throw new Error("Unauthorized. User must be authenticated.");
    }

    // Check if the caller is an admin
    const callerDoc = await admin.firestore()
      .collection("users")
      .doc(context.auth.uid)
      .get();
    
    if (!callerDoc.exists || !callerDoc.data().isAdmin) {
      throw new Error("Unauthorized. Only admins can delete users.");
    }

    // Get the user ID to delete
    const { uid } = data;
    
    if (!uid) {
      throw new Error("No user ID provided");
    }

    // Delete the user from Authentication
    await admin.auth().deleteUser(uid);
    
    return {
      success: true,
      message: "User authentication deleted successfully"
    };
  } catch (error) {
    console.error("Error in deleteUserAuth:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Cloud function to delete a user
exports.deleteUser = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Verify authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Check if user is admin
    const adminUser = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (!adminUser.exists || !adminUser.data().isAdmin) {
      res.status(403).json({ error: 'Forbidden - Admin access required' });
      return;
    }

    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Delete user from Authentication
    await admin.auth().deleteUser(userId);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ error: error.message });
  }
});

// HTTP function to delete a user
exports.deleteUserHttp = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Verify authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Check if user is admin
    const userRecord = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (!userRecord.exists || !userRecord.data().isAdmin) {
      res.status(403).json({ error: 'Forbidden - Admin access required' });
      return;
    }

    const userId = req.body.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Delete user from Authentication
    await admin.auth().deleteUser(userId);

    // Delete user from Firestore
    await admin.firestore().collection('users').doc(userId).delete();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in deleteUserHttp:', error);
    res.status(500).json({ error: error.message });
  }
});
