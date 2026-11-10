
const dotenv = require("dotenv");
const path = require("path");

const {
  initializeApp,
  cert,
  getApps
} = require("firebase-admin/app");

const { getFirestore } = require("firebase-admin/firestore");

dotenv.config();

const serviceAccountPath = path.resolve(
  __dirname,
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    "./serviceAccountKey.json"
);

const serviceAccount = require(serviceAccountPath);

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount)
    });

const db = getFirestore(firebaseApp);
const usersCollection = db.collection("users");

async function auditUsers() {
  try {
    console.log("\nStarting read-only authentication audit...\n");

    const snapshot = await usersCollection.get();

    const emails = new Map();

    let validHashes = 0;
    let invalidHashes = 0;
    let missingEmails = 0;
    let duplicateEmails = 0;

    for (const doc of snapshot.docs) {
      const user = doc.data();

      const email =
        typeof user.email === "string"
          ? user.email.trim().toLowerCase()
          : "";

      if (!email) {
        missingEmails++;
      } else {
        emails.set(email, (emails.get(email) || 0) + 1);
      }

      const hash = user.passwordHash;

      const validBcrypt =
        typeof hash === "string" &&
        /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);

      if (validBcrypt) {
        validHashes++;
      } else {
        invalidHashes++;
      }
    }

    for (const count of emails.values()) {
      if (count > 1) {
        duplicateEmails += count;
      }
    }

    console.log("========== MIGRATION AUDIT ==========");
    console.log("Total Firestore users:", snapshot.size);
    console.log("Valid BCRYPT formats:", validHashes);
    console.log("Invalid or missing hashes:", invalidHashes);
    console.log("Missing email addresses:", missingEmails);
    console.log("Accounts involved in duplicate emails:", duplicateEmails);
    console.log("=====================================");

    console.log("\nAudit completed. No records were modified.\n");

  } catch (error) {
    console.error("Audit failed:", error.message);
    process.exitCode = 1;
  }
}

auditUsers();
