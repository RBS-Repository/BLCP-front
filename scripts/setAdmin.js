   // scripts/setAdmin.js
   import admin from 'firebase-admin';
   import { readFileSync } from 'fs';
   import { fileURLToPath } from 'url';
   import { dirname, resolve } from 'path';

   // Get directory name in ESM
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);

   // Load service account from the JS file by extracting the object contents
   const serviceAccountPath = resolve(__dirname, '../backend/config/serviceAccountKey.local.js');
   const serviceAccountFile = readFileSync(serviceAccountPath, 'utf8');
   // Extract the object by removing module.exports and trailing semicolons
   const serviceAccountStr = serviceAccountFile
     .replace(/module\.exports\s*=\s*/, '')
     .replace(/;?\s*$/, '');
   // Parse the JSON object
   const serviceAccount = JSON.parse(serviceAccountStr);

   // Initialize Firebase Admin if not already initialized
   if (!admin.apps.length) {
     admin.initializeApp({
       credential: admin.credential.cert(serviceAccount)
     });
   }

   // Get command-line arguments:
   const args = process.argv.slice(2);
   if (args.length < 1) {
     console.error("Usage: node setAdmin.js <identifier> [--uid]");
     process.exit(1);
   }

   let identifier = args[0].trim(); // Trim any extraneous whitespace
   console.log(`Identifier received (trimmed): "${identifier}" (length: ${identifier.length})`);

   const useUid = args.includes('--uid');

   // Function to set admin claims
   async function setAdminClaim() {
     try {
       let user;
       if (useUid) {
         console.log(`Attempting to fetch user using admin.auth().getUser("${identifier}")`);
         user = await admin.auth().getUser(identifier);
       } else {
         console.log(`Attempting to fetch user using admin.auth().getUserByEmail("${identifier}")`);
         user = await admin.auth().getUserByEmail(identifier);
       }
       console.log("User record fetched:", {
         uid: user.uid,
         email: user.email,
         displayName: user.displayName
       });
       await admin.auth().setCustomUserClaims(user.uid, {
         admin: true
       });
       console.log(`Successfully set admin claim for user: ${user.email} (UID: ${user.uid})`);
     } catch (error) {
       console.error('Error setting admin claim:', error);
     } finally {
       process.exit();
     }
   }

   setAdminClaim();