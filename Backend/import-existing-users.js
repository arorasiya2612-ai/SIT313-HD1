
const dotenv = require("dotenv");
const path = require("path");

const {
  initializeApp,
  cert,
  getApps
} = require("firebase-admin/app");

const { getFirestore } = require("firebase-admin/firestore");
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

const db = getFirestore(app);
const auth = getAuth(app);

async function migrateUsers() {
  try {
    console.log("\nStarting existing-user migration...\n");

    // Safety check: do not overwrite existing Firebase accounts.
    const existingAuthUsers = await auth.listUsers(1);

    if (existingAuthUsers.users.length > 0) {
      throw new Error(
        "Firebase Authentication is no longer empty. Migration stopped."
      );
    }

    // Read existing Firestore users.
    const snapshot = await db.collection("users").get();

    if (snapshot.empty) {
      console.log("No Firestore users found.");
      return;
    }

    const emails = new Set();

    const usersToImport = snapshot.docs.map((doc) => {
      const user = doc.data();

      const email =
        typeof user.email === "string"
          ? user.email.trim().toLowerCase()
          : "";

      const passwordHash = user.passwordHash;

      if (!email || !passwordHash) {
        throw new Error(
          `Missing email or password hash for Firestore user ${doc.id}`
        );
      }

      if (emails.has(email)) {
        throw new Error(
          `Duplicate email detected. Migration stopped.`
        );
      }

      emails.add(email);

      if (
        !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash)
      ) {
        throw new Error(
          `Invalid BCRYPT format for Firestore user ${doc.id}`
        );
      }

      return {
        uid: doc.id,
        email,
        displayName: user.fullName || undefined,
        passwordHash: Buffer.from(passwordHash, "utf8"),
        emailVerified: false,
        disabled: user.accountStatus === "suspended"
      };
    });

    console.log("Users prepared:", usersToImport.length);
    console.log("Importing accounts into Firebase Authentication...\n");

    const result = await auth.importUsers(usersToImport, {
      hash: {
        algorithm: "BCRYPT"
      }
    });

    console.log("========== MIGRATION RESULT ==========");
    console.log("Successfully imported:", result.successCount);
    console.log("Failed imports:", result.failureCount);

    if (result.errors.length > 0) {
      console.log("\nFailed account details:");

      result.errors.forEach((error) => {
        console.log(
          `User index ${error.index}: ${error.error.message}`
        );
      });
    }

    console.log("======================================");
    console.log("\nFirestore records were not modified.");

  } catch (error) {
    console.error("\nMigration stopped:", error.message);
    process.exitCode = 1;
  }
}

migrateUsers();
