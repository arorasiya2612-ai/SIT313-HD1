
const dotenv = require("dotenv");
const path = require("path");

const {
  initializeApp,
  cert,
  getApps
} = require("firebase-admin/app");

const { getAuth } = require("firebase-admin/auth");

dotenv.config();

const serviceAccountPath = path.resolve(
  __dirname,
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    "./serviceAccountKey.json"
);

const serviceAccount = require(serviceAccountPath);

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount)
    });

async function checkFirebaseUsers() {
  try {
    console.log("\nChecking Firebase Authentication users...\n");

    const auth = getAuth(app);

    let pageToken;
    let total = 0;

    do {
      const result = await auth.listUsers(1000, pageToken);

      total += result.users.length;

      pageToken = result.pageToken;
    } while (pageToken);

    console.log("Firebase Authentication users:", total);
    console.log("Check completed. No users were modified.");

  } catch (error) {
    console.error("Firebase Auth check failed:", error.message);
    process.exitCode = 1;
  }
}

checkFirebaseUsers();
