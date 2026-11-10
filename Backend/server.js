
const express = require("express");
const dotenv = require("dotenv");
const Mailjet = require("node-mailjet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue,
  Timestamp
} = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// Validation and authorization middleware
const validateRequest = require("./middleware/validateRequest");
const requireAdmin = require("./middleware/requireAdmin");

// Validation schemas
const {
  registerSchema,
  loginSchema,
} = require("./validators/auth.schema");

const { postSchema } = require("./validators/post.schema");
const { upgradeSchema } = require("./validators/subscription.schema");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// HTTP request logging
app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} - HTTP Status: ${res.statusCode}`
    );
  });

  next();
});

// --------------------------------------------------
// FIREBASE ADMIN SETUP
// --------------------------------------------------

const serviceAccountPath = path.resolve(
  __dirname,
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    "./serviceAccountKey.json"
);

const serviceAccount = require(serviceAccountPath);

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
    });

const db = getFirestore(firebaseApp);
const firebaseAuth = getAuth(firebaseApp);

const usersCollection = db.collection("users");
const postsCollection = db.collection("posts");
const passwordResetCollection = db.collection("passwordResetRequests");

// --------------------------------------------------
// MAILJET SETUP
// --------------------------------------------------

const mailjet = Mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE
);

// --------------------------------------------------
// EMAIL VALIDATION
// --------------------------------------------------

function isValidEmail(email) {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

// --------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// --------------------------------------------------

function authenticateToken(req, res, next) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing from .env");

    return res.status(500).json({
      message: "Server authentication is not configured.",
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session is invalid or has expired. Please log in again.",
    });
  }
}

// Optional authentication for public browsing
function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Invalid authorization format.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "Server authentication is not configured.",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session is invalid or has expired.",
    });
  }
}

// --------------------------------------------------
// 1. REGISTER
// POST /api/register
// --------------------------------------------------

app.post(
  "/api/register",
  validateRequest(registerSchema),
  async (req, res) => {
    try {
      const { fullName, email, password } = req.body;

      const existingUser = await usersCollection
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!existingUser.empty) {
        return res.status(409).json({
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await usersCollection.add({
        fullName,
        email,
        passwordHash,
        plan: "free",
        role: "user",
        accountStatus: "active",
        createdAt: FieldValue.serverTimestamp(),
      });

      return res.status(201).json({
        message: "Account created successfully. Please log in.",
      });
    } catch (error) {
      console.error("Registration error:", error);

      return res.status(500).json({
        message: "Unable to create your account. Please try again.",
      });
    }
  }
);

// --------------------------------------------------
// 2. LOGIN
// POST /api/login
// --------------------------------------------------

app.post(
  "/api/login",
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const userSnapshot = await usersCollection
        .where("email", "==", email)
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();

      if (
        typeof userData.passwordHash !== "string" ||
        !(await bcrypt.compare(password, userData.passwordHash))
      ) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      if (userData.accountStatus === "suspended") {
        return res.status(403).json({
          message: "This account has been suspended.",
        });
      }

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured.");
      }

      const role =
        userData.role === "admin" ? "admin" : "user";

      const plan =
        userData.plan === "paid" ? "paid" : "free";

      const token = jwt.sign(
        {
          uid: userDoc.id,
          email: userData.email,
          role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );

      return res.json({
        message: "Login successful.",
        token,
        user: {
          id: userDoc.id,
          fullName: userData.fullName,
          email: userData.email,
          plan,
          role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);

      return res.status(500).json({
        message: "Unable to log in. Please try again.",
      });
    }
  }
);

// ==========================================
// PASSWORD RESET - REQUEST OTP
// ==========================================

app.post("/api/password-reset/request", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    const genericMessage =
      "If an account exists for this email, a verification code has been sent.";

    const resetSecret = process.env.PASSWORD_RESET_SECRET;

    if (!resetSecret) {
      console.error("Password reset configuration is missing.");
      return res.status(500).json({
        success: false,
        message: "Unable to process your request right now."
      });
    }

    // Find the existing user account
    const userSnapshot = await usersCollection
      .where("email", "==", email)
      .limit(1)
      .get();

    // Do not reveal whether the email is registered
    if (userSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: genericMessage
      });
    }

    const userDoc = userSnapshot.docs[0];

    // Generate a consistent, non-reversible document ID
    const resetId = crypto
      .createHmac("sha256", resetSecret)
      .update(`reset-email:${email}`)
      .digest("hex");

    const resetRef = passwordResetCollection.doc(resetId);

    // Check resend cooldown
    const existingReset = await resetRef.get();

    if (existingReset.exists) {
      const lastSentAt = existingReset.data().lastSentAt;

      if (lastSentAt) {
        const elapsed = Date.now() - lastSentAt.toMillis();

        if (elapsed < 60 * 1000) {
          return res.status(200).json({
            success: true,
            message: genericMessage
          });
        }
      }
    }

    // Generate a six-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Store only the hashed OTP
    const otpHash = crypto
      .createHmac("sha256", resetSecret)
      .update(`password-reset-otp:${email}:${otp}`)
      .digest("hex");

    const now = Date.now();

    await resetRef.set({
      email,
      userId: userDoc.id,
      otpHash,
      attempts: 0,
      verified: false,
      used: false,
      lastSentAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + 10 * 60 * 1000),
      resetTokenHash: null,
      resetTokenExpiresAt: null
    });

    // Send OTP using the existing Mailjet configuration
    try {
      await mailjet
        .post("send", { version: "v3.1" })
        .request({
          Messages: [
            {
              From: {
                Email: "arorasiya2612@gmail.com",
                Name: "DEV@Deakin"
              },
              To: [
                {
                  Email: email
                }
              ],
              Subject: "DEV@Deakin Password Reset Code",
              TextPart: `Your password reset verification code is ${otp}. This code expires in 10 minutes. Do not share it with anyone.`,
              HTMLPart: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2>DEV@Deakin Password Reset</h2>
                  <p>Use the following verification code to reset your password:</p>
                  <h1 style="letter-spacing: 6px;">${otp}</h1>
                  <p>This code expires in 10 minutes.</p>
                  <p>If you did not request a password reset, please ignore this email.</p>
                </div>
              `
            }
          ]
        });
    } catch (emailError) {
      // Invalidate the OTP if email delivery fails
      await resetRef.delete();

      console.error(
        "Password reset email delivery failed:",
        emailError.message
      );

      return res.status(500).json({
        success: false,
        message: "Unable to send the verification code right now. Please try again later."
      });
    }

    return res.status(200).json({
      success: true,
      message: genericMessage
    });

  } catch (error) {
    console.error("Password reset request error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process your request right now."
    });
  }
});


// ==========================================
// PASSWORD RESET - VERIFY OTP
// ==========================================

app.post("/api/password-reset/verify", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email and six-digit code."
      });
    }

    const resetSecret = process.env.PASSWORD_RESET_SECRET;

    if (!resetSecret) {
      return res.status(500).json({
        success: false,
        message: "Unable to verify the code right now."
      });
    }

    const resetId = crypto
      .createHmac("sha256", resetSecret)
      .update(`reset-email:${email}`)
      .digest("hex");

    const resetRef = passwordResetCollection.doc(resetId);

    const suppliedOtpHash = crypto
      .createHmac("sha256", resetSecret)
      .update(`password-reset-otp:${email}:${otp}`)
      .digest("hex");

    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetTokenHash = crypto
      .createHmac("sha256", resetSecret)
      .update(`password-reset-token:${resetToken}`)
      .digest("hex");

    const result = await db.runTransaction(async (transaction) => {
      const resetDoc = await transaction.get(resetRef);

      if (!resetDoc.exists) {
        return { status: "invalid" };
      }

      const data = resetDoc.data();

      if (
        data.used ||
        !data.expiresAt ||
        data.expiresAt.toMillis() <= Date.now()
      ) {
        return { status: "expired" };
      }

      if (data.verified) {
        return { status: "already-verified" };
      }

      if (data.attempts >= 5) {
        return { status: "locked" };
      }

      const storedHash = Buffer.from(data.otpHash || "", "hex");
      const suppliedHash = Buffer.from(suppliedOtpHash, "hex");

      const isCorrect =
        storedHash.length === suppliedHash.length &&
        crypto.timingSafeEqual(storedHash, suppliedHash);

      if (!isCorrect) {
        transaction.update(resetRef, {
          attempts: data.attempts + 1
        });

        return {
          status: data.attempts + 1 >= 5 ? "locked" : "incorrect"
        };
      }

      transaction.update(resetRef, {
        verified: true,
        otpHash: null,
        resetTokenHash,
        resetTokenExpiresAt: Timestamp.fromMillis(
          Date.now() + 10 * 60 * 1000
        )
      });

      return { status: "verified" };
    });

    if (result.status === "verified") {
      return res.status(200).json({
        success: true,
        message: "Email verified successfully.",
        resetToken
      });
    }

    const messages = {
      invalid: "Invalid or expired verification code.",
      expired: "The verification code has expired. Please request a new one.",
      "already-verified": "This code has already been verified.",
      locked: "Too many incorrect attempts. Please request a new code.",
      incorrect: "Incorrect verification code. Please try again."
    };

    return res.status(400).json({
      success: false,
      message: messages[result.status]
    });

  } catch (error) {
    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify the code right now."
    });
  }
});

// ==========================================
// PASSWORD RESET - SET NEW PASSWORD
// ==========================================

app.post("/api/password-reset/confirm", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const resetToken = String(req.body.resetToken || "").trim();
    const newPassword = req.body.newPassword;

    if (
      !isValidEmail(email) ||
      !resetToken ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid details. Password must contain at least 8 characters."
      });
    }

    const resetSecret = process.env.PASSWORD_RESET_SECRET;

    if (!resetSecret) {
      return res.status(500).json({
        success: false,
        message: "Unable to reset your password right now."
      });
    }

    const resetId = crypto
      .createHmac("sha256", resetSecret)
      .update(`reset-email:${email}`)
      .digest("hex");

    const resetRef = passwordResetCollection.doc(resetId);

    const suppliedTokenHash = crypto
      .createHmac("sha256", resetSecret)
      .update(`password-reset-token:${resetToken}`)
      .digest("hex");

    // Hash the new password using the existing bcrypt configuration
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await db.runTransaction(async (transaction) => {
      const resetDoc = await transaction.get(resetRef);

      if (!resetDoc.exists) {
        return "invalid";
      }

      const resetData = resetDoc.data();

      if (
        resetData.used ||
        !resetData.verified ||
        !resetData.resetTokenExpiresAt ||
        resetData.resetTokenExpiresAt.toMillis() <= Date.now()
      ) {
        return "expired";
      }

      const storedHash = Buffer.from(
        resetData.resetTokenHash || "",
        "hex"
      );

      const suppliedHash = Buffer.from(suppliedTokenHash, "hex");

      const isValidToken =
        storedHash.length === suppliedHash.length &&
        crypto.timingSafeEqual(storedHash, suppliedHash);

      if (!isValidToken) {
        return "invalid";
      }

      const userRef = usersCollection.doc(resetData.userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists || userDoc.data().email !== email) {
        return "invalid";
      }

      transaction.update(userRef, {
        passwordHash
      });

      transaction.update(resetRef, {
        used: true,
        verified: false,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        otpHash: null
      });

      return "success";
    });

    if (result !== "success") {
      return res.status(400).json({
        success: false,
        message: "Your password reset session is invalid or expired. Please start again."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Your password has been reset successfully. Please log in with your new password."
    });

  } catch (error) {
    console.error("Password reset confirmation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reset your password right now."
    });
  }
});


// --------------------------------------------------
// GOOGLE AUTHENTICATION
// POST /api/auth/google
// --------------------------------------------------

app.post("/api/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        message: "Google authentication token is required."
      });
    }

    // Verify Firebase ID token.
    const decodedToken = await firebaseAuth.verifyIdToken(
      idToken,
      true
    );

    const uid = decodedToken.uid;
    const email = decodedToken.email?.toLowerCase();

    if (!email || !decodedToken.email_verified) {
      return res.status(403).json({
        message: "Please use a verified Google email address."
      });
    }

    // Find existing Firestore account.
    const userRef = usersCollection.doc(uid);
    let userDoc = await userRef.get();

    if (!userDoc.exists) {
      const existingEmail = await usersCollection
        .where("email", "==", email)
        .limit(1)
        .get();

      // Never silently link a Google account to a legacy account.
      if (!existingEmail.empty) {
        return res.status(409).json({
          message:
            "An account with this email already exists. Please log in using your existing account first."
        });
      }

      // Create a new Firestore user using Firebase UID.
      await userRef.set({
        fullName: decodedToken.name || email.split("@")[0],
        email,
        plan: "free",
        role: "user",
        accountStatus: "active",
        authProvider: "google",
        createdAt: FieldValue.serverTimestamp()
      });

      userDoc = await userRef.get();
    }

    const userData = userDoc.data();

    if (userData.email?.toLowerCase() !== email) {
      return res.status(403).json({
        message: "Account identity mismatch."
      });
    }
    // Maintain the authentication methods linked to this account.
      const providers = ["google"];

      if (typeof userData.passwordHash === "string") {
        providers.push("password");
      }

      await userRef.set(
        {
          authProviders: FieldValue.arrayUnion(...providers)
        },
        { merge: true }
      );

    if (userData.accountStatus === "suspended") {
      return res.status(403).json({
        message: "This account has been suspended."
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    // Read role and plan from trusted Firestore data.
    const role = userData.role === "admin" ? "admin" : "user";
    const plan = userData.plan === "paid" ? "paid" : "free";

    const token = jwt.sign(
      {
        uid,
        email,
        role
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({
      message: "Google sign-in successful.",
      token,
      user: {
        id: uid,
        fullName: userData.fullName,
        email,
        plan,
        role
      }
    });

  } catch (error) {
    console.error("Google authentication error:", error);

    return res.status(401).json({
      message: "Google authentication failed. Please try again."
    });
  }
});
// --------------------------------------------------
// 3. GET CURRENT USER
// GET /api/me
// --------------------------------------------------

app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const userDoc = await usersCollection
      .doc(req.user.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({
        message: "User account not found.",
      });
    }

   let userData = userDoc.data();

// Add missing default fields without overwriting existing values.
const updates = {};

if (!userData.plan) {
  updates.plan = "free";
}

if (!userData.role) {
  updates.role = "user";
}

if (!userData.accountStatus) {
  updates.accountStatus = "active";
}

if (!userData.authProvider) {
  updates.authProvider = "google";
}

if (!userData.createdAt) {
  updates.createdAt = FieldValue.serverTimestamp();
}

if (!userData.fullName && decodedToken.name) {
  updates.fullName = decodedToken.name;
}

if (Object.keys(updates).length > 0) {
  await userRef.set(updates, { merge: true });
  userDoc = await userRef.get();
}

userData = userDoc.data();

    if (userData.accountStatus === "suspended") {
      return res.status(403).json({
        message: "This account has been suspended.",
      });
    }

    return res.json({
      user: {
        id: userDoc.id,
        fullName: userData.fullName,
        email: userData.email,
        plan: userData.plan === "paid" ? "paid" : "free",
        role: userData.role === "admin" ? "admin" : "user",
      },
    });
  } catch (error) {
    console.error("Current user error:", error);

    return res.status(500).json({
      message: "Unable to retrieve your account.",
    });
  }
});

// --------------------------------------------------
// 4. ADMIN AUTHORIZATION TEST
// GET /api/admin/verify
// --------------------------------------------------

app.get(
  "/api/admin/verify",
  authenticateToken,
  requireAdmin(usersCollection),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Administrator access verified successfully.",
      user: {
        uid: req.user.uid,
        role: req.user.role,
      },
    });
  }
);

// --------------------------------------------------
// 5. ADMIN DASHBOARD STATISTICS
// GET /api/admin/stats
// --------------------------------------------------

app.get(
  "/api/admin/stats",
  authenticateToken,
  requireAdmin(usersCollection),
  async (req, res) => {
    try {
      const usersSnapshot = await usersCollection.get();
      const postsSnapshot = await postsCollection.get();

      const users = usersSnapshot.docs.map((doc) => doc.data());
      const posts = postsSnapshot.docs.map((doc) => doc.data());

      const totalUsers = users.length;

      const paidUsers = users.filter(
        (user) => user.plan === "paid"
      ).length;

      const freeUsers = users.filter(
        (user) => user.plan !== "paid"
      ).length;

      const suspendedUsers = users.filter(
        (user) => user.accountStatus === "suspended"
      ).length;

      const publishedPosts = posts.filter(
        (post) => post.status !== "removed"
      );

      return res.status(200).json({
        success: true,
        message: "Dashboard statistics retrieved successfully.",
        statistics: {
          users: {
            total: totalUsers,
            paid: paidUsers,
            free: freeUsers,
            suspended: suspendedUsers,
          },
          posts: {
            total: publishedPosts.length,
            questions: publishedPosts.filter(
              (post) => post.postType === "question"
            ).length,
            articles: publishedPosts.filter(
              (post) => post.postType === "article"
            ).length,
          },
        },
      });
    } catch (error) {
      console.error("Admin statistics error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve dashboard statistics.",
      });
    }
  }
);

// --------------------------------------------------
// 6. ADMIN: GET ALL USERS
// GET /api/admin/users
// --------------------------------------------------

app.get(
  "/api/admin/users",
  authenticateToken,
  requireAdmin(usersCollection),
  async (req, res) => {
    try {
      // Fetch every user, including documents without createdAt.
      const snapshot = await usersCollection.get();

      const users = snapshot.docs.map((doc) => {
        const userData = doc.data();

        return {
          id: doc.id,
          fullName: userData.fullName || "Unknown User",
          email: userData.email || "",
          plan: userData.plan === "paid" ? "paid" : "free",
          role: userData.role === "admin" ? "admin" : "user",
          accountStatus:
            userData.accountStatus === "suspended"
              ? "suspended"
              : "active",
          createdAt: userData.createdAt
            ? userData.createdAt.toDate().toISOString()
            : null,
        };
      });

      // Sort users by registration date.
      // Documents without createdAt appear at the bottom.
      users.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;

        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return res.status(200).json({
        success: true,
        total: users.length,
        users,
      });
    } catch (error) {
      console.error("Admin fetch users error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve users.",
      });
    }
  }
);


// --------------------------------------------------
// 7. ADMIN: UPDATE USER ACCOUNT STATUS
// PATCH /api/admin/users/:userId/status
// --------------------------------------------------

app.patch(
  "/api/admin/users/:userId/status",
  authenticateToken,
  requireAdmin(usersCollection),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { accountStatus } = req.body;

      if (!["active", "suspended"].includes(accountStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account status.",
        });
      }

      // Admins cannot change their own account status.
      if (userId === req.user.uid) {
        return res.status(403).json({
          success: false,
          message: "You cannot change your own account status.",
        });
      }

      const targetUserRef = usersCollection.doc(userId);
      const targetUserDoc = await targetUserRef.get();

      if (!targetUserDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      const targetUser = targetUserDoc.data();

      // Protect administrator accounts.
      if (targetUser.role === "admin") {
        return res.status(403).json({
          success: false,
          message: "Administrator accounts cannot be modified here.",
        });
      }

      if (targetUser.accountStatus === accountStatus) {
        return res.status(409).json({
          success: false,
          message: `Account is already ${accountStatus}.`,
        });
      }

      await targetUserRef.update({
        accountStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `Admin ${req.user.uid} changed user ${userId} status to ${accountStatus}.`
      );

      return res.status(200).json({
        success: true,
        message:
          accountStatus === "suspended"
            ? "User suspended successfully."
            : "User reactivated successfully.",
        accountStatus,
      });
    } catch (error) {
      console.error("Admin update user error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update user account status.",
      });
    }
  }
);

// --------------------------------------------------
// 8. ADMIN: GET ALL POSTS FOR MODERATION
// GET /api/admin/posts
// --------------------------------------------------

app.get(
  "/api/admin/posts",
  authenticateToken,
  requireAdmin(usersCollection),
  async (req, res) => {
    try {
      const snapshot = await postsCollection
        .orderBy("createdAt", "desc")
        .get();

      const posts = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          userId: data.userId || "",
          authorName: data.authorName || "Unknown User",
          postType: data.postType || "question",
          postPlan: data.postPlan || "free",
          title: data.title || "Untitled Post",
          description: data.description || "",
          abstract: data.abstract || "",
          articleText: data.articleText || "",
          tags: data.tags || [],
          status: data.status || "published",
          createdAt: data.createdAt
            ? data.createdAt.toDate().toISOString()
            : null,
        };
      });

      return res.status(200).json({
        success: true,
        total: posts.length,
        posts,
      });
    } catch (error) {
      console.error("Admin fetch posts error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve posts for moderation.",
      });
    }
  }
);

// --------------------------------------------------
// 9. ADMIN: REMOVE OR RESTORE A POST
// PATCH /api/admin/posts/:postId/status
// --------------------------------------------------

app.patch(
  "/api/admin/posts/:postId/status",
  authenticateToken,
  requireAdmin(usersCollection),
  async (req, res) => {
    try {
      const { postId } = req.params;
      const { status } = req.body;

      if (!["published", "removed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid post status. Use published or removed.",
        });
      }

      const postRef = postsCollection.doc(postId);
      const postDoc = await postRef.get();

      if (!postDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "Post not found.",
        });
      }

      const currentStatus = postDoc.data().status || "published";

      if (currentStatus === status) {
        return res.status(409).json({
          success: false,
          message: `Post is already ${status}.`,
        });
      }

      await postRef.update({
        status,
        moderatedAt: FieldValue.serverTimestamp(),
        moderatedBy: req.user.uid,
      });

      console.log(
        `Admin ${req.user.uid} changed post ${postId} status to ${status}.`
      );

      return res.status(200).json({
        success: true,
        message:
          status === "removed"
            ? "Post removed successfully."
            : "Post restored successfully.",
        postId,
        status,
      });
    } catch (error) {
      console.error("Admin post moderation error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update post status.",
      });
    }
  }
);


// --------------------------------------------------
// 10. LIKE / UNLIKE A POST
// POST /api/posts/:postId/like
// --------------------------------------------------

app.post(
  "/api/posts/:postId/like",
  authenticateToken,
  async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user.uid;

      const postRef = postsCollection.doc(postId);
      const userRef = usersCollection.doc(userId);
      const likeRef = postRef.collection("likes").doc(userId);

      const result = await db.runTransaction(async (transaction) => {
        // Read all documents before performing writes.
        const [postDoc, userDoc, likeDoc] = await Promise.all([
          transaction.get(postRef),
          transaction.get(userRef),
          transaction.get(likeRef),
        ]);

        if (!userDoc.exists) {
          throw new Error("USER_NOT_FOUND");
        }

        const userData = userDoc.data();

        if (userData.accountStatus === "suspended") {
          throw new Error("ACCOUNT_SUSPENDED");
        }

        if (!postDoc.exists) {
          throw new Error("POST_NOT_FOUND");
        }

        const postData = postDoc.data();

        if (postData.status === "removed") {
          throw new Error("POST_REMOVED");
        }

        const currentLikeCount = Math.max(
          0,
          Number(postData.likeCount) || 0
        );

        if (likeDoc.exists) {
          // Unlike: remove the user's like.
          const newLikeCount = Math.max(0, currentLikeCount - 1);

          transaction.delete(likeRef);
          transaction.update(postRef, {
            likeCount: newLikeCount,
          });

          return {
            liked: false,
            likeCount: newLikeCount,
          };
        }

        // Like: create one like document per user.
        const newLikeCount = currentLikeCount + 1;

        transaction.set(likeRef, {
          userId,
          createdAt: FieldValue.serverTimestamp(),
        });

        transaction.update(postRef, {
          likeCount: newLikeCount,
        });

        return {
          liked: true,
          likeCount: newLikeCount,
        };
      });

      return res.status(200).json({
        success: true,
        message: result.liked
          ? "Post liked successfully."
          : "Post unliked successfully.",
        ...result,
      });
    } catch (error) {
      console.error("Post like error:", error);

      const errors = {
        USER_NOT_FOUND: [404, "User account not found."],
        ACCOUNT_SUSPENDED: [403, "This account has been suspended."],
        POST_NOT_FOUND: [404, "Post not found."],
        POST_REMOVED: [403, "This post is no longer available."],
      };

      if (errors[error.message]) {
        const [status, message] = errors[error.message];

        return res.status(status).json({
          success: false,
          message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to update post like. Please try again.",
      });
    }
  }
);


// --------------------------------------------------
// 11. UPGRADE FREE USER TO PAID
// POST /api/upgrade
// Demonstration only - no real payment processed
// --------------------------------------------------

app.post(
  "/api/upgrade",
  authenticateToken,
  validateRequest(upgradeSchema),
  async (req, res) => {
    try {
      const userRef = usersCollection.doc(req.user.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({
          message: "User account not found.",
        });
      }

      if (userDoc.data().accountStatus === "suspended") {
        return res.status(403).json({
          message: "This account has been suspended.",
        });
      }

      if ((userDoc.data().plan || "free") === "paid") {
        return res.status(409).json({
          message: "Your account is already on the Paid plan.",
        });
      }

      // Never store demonstration card details.
      await userRef.update({
        plan: "paid",
        upgradedAt: FieldValue.serverTimestamp(),
      });

      return res.json({
        message: "Your account has been upgraded to the Paid plan.",
        plan: "paid",
      });
    } catch (error) {
      console.error("Upgrade error:", error);

      return res.status(500).json({
        message: "Unable to upgrade your plan. Please try again.",
      });
    }
  }
);

// --------------------------------------------------
// 11. GET COMMENTS AND REPLIES
// GET /api/posts/:postId/comments
// --------------------------------------------------

app.get("/api/posts/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;

    const postRef = postsCollection.doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists || postDoc.data().status === "removed") {
      return res.status(404).json({
        success: false,
        message: "Post not found."
      });
    }

    const commentsSnapshot = await postRef
      .collection("comments")
      .orderBy("createdAt", "asc")
      .get();

    const comments = await Promise.all(
      commentsSnapshot.docs.map(async (commentDoc) => {
        const commentData = commentDoc.data();

        const repliesSnapshot = await commentDoc.ref
          .collection("replies")
          .orderBy("createdAt", "asc")
          .get();

        const replies = repliesSnapshot.docs.map(replyDoc => {
          const replyData = replyDoc.data();

          return {
            id: replyDoc.id,
            userId: replyData.userId,
            authorName: replyData.authorName,
            text: replyData.text,
            createdAt: replyData.createdAt
              ? replyData.createdAt.toDate().toISOString()
              : null
          };
        });

        return {
          id: commentDoc.id,
          userId: commentData.userId,
          authorName: commentData.authorName,
          text: commentData.text,
          createdAt: commentData.createdAt
            ? commentData.createdAt.toDate().toISOString()
            : null,
          replies
        };
      })
    );

    return res.status(200).json({
      success: true,
      total: comments.length,
      comments
    });

  } catch (error) {
    console.error("Fetch comments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve comments."
    });
  }
});


// --------------------------------------------------
// 12. ADD A COMMENT
// POST /api/posts/:postId/comments
// --------------------------------------------------

app.post(
  "/api/posts/:postId/comments",
  authenticateToken,
  async (req, res) => {
    try {
      const { postId } = req.params;
      const { text } = req.body;

      if (
        typeof text !== "string" ||
        !text.trim() ||
        text.trim().length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message: "Comment must contain between 1 and 1000 characters."
        });
      }

      const postRef = postsCollection.doc(postId);
      const userRef = usersCollection.doc(req.user.uid);

      const [postDoc, userDoc] = await Promise.all([
        postRef.get(),
        userRef.get()
      ]);

      if (!postDoc.exists || postDoc.data().status === "removed") {
        return res.status(404).json({
          success: false,
          message: "Post not found."
        });
      }

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "User account not found."
        });
      }

      const userData = userDoc.data();

      if (userData.accountStatus === "suspended") {
        return res.status(403).json({
          success: false,
          message: "This account has been suspended."
        });
      }

      const commentData = {
        userId: req.user.uid,
        authorName: userData.fullName || "DEV@Deakin User",
        text: text.trim(),
        createdAt: FieldValue.serverTimestamp()
      };

      const commentRef = await postRef
        .collection("comments")
        .add(commentData);

      console.log(`Comment created: ${commentRef.id}`);

      return res.status(201).json({
        success: true,
        message: "Comment added successfully.",
        comment: {
          id: commentRef.id,
          ...commentData,
          createdAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Add comment error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to add comment."
      });
    }
  }
);


// --------------------------------------------------
// 13. ADD A REPLY
// POST /api/posts/:postId/comments/:commentId/replies
// --------------------------------------------------

app.post(
  "/api/posts/:postId/comments/:commentId/replies",
  authenticateToken,
  async (req, res) => {
    try {
      const { postId, commentId } = req.params;
      const { text } = req.body;

      if (
        typeof text !== "string" ||
        !text.trim() ||
        text.trim().length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message: "Reply must contain between 1 and 1000 characters."
        });
      }

      const postRef = postsCollection.doc(postId);
      const commentRef = postRef
        .collection("comments")
        .doc(commentId);

      const userRef = usersCollection.doc(req.user.uid);

      const [postDoc, commentDoc, userDoc] = await Promise.all([
        postRef.get(),
        commentRef.get(),
        userRef.get()
      ]);

      if (!postDoc.exists || postDoc.data().status === "removed") {
        return res.status(404).json({
          success: false,
          message: "Post not found."
        });
      }

      if (!commentDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "Comment not found."
        });
      }

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "User account not found."
        });
      }

      const userData = userDoc.data();

      if (userData.accountStatus === "suspended") {
        return res.status(403).json({
          success: false,
          message: "This account has been suspended."
        });
      }

      const replyData = {
        userId: req.user.uid,
        authorName: userData.fullName || "DEV@Deakin User",
        text: text.trim(),
        createdAt: FieldValue.serverTimestamp()
      };

      const replyRef = await commentRef
        .collection("replies")
        .add(replyData);

      console.log(`Reply created: ${replyRef.id}`);

      return res.status(201).json({
        success: true,
        message: "Reply added successfully.",
        reply: {
          id: replyRef.id,
          ...replyData,
          createdAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Add reply error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to add reply."
      });
    }
  }
);

// --------------------------------------------------
// 14. CREATE POST
// POST /api/posts
// --------------------------------------------------

app.post(
  "/api/posts",
  authenticateToken,
  validateRequest(postSchema),
  async (req, res) => {
    try {
      const {
        postType,
        postPlan,
        title,
        description,
        abstract,
        articleText,
        tags,
      } = req.body;

      const userDoc = await usersCollection
        .doc(req.user.uid)
        .get();

      if (!userDoc.exists) {
        return res.status(404).json({
          message: "User account not found.",
        });
      }

      const userData = userDoc.data();

      if (userData.accountStatus === "suspended") {
        return res.status(403).json({
          message: "This account has been suspended.",
        });
      }

      const userPlan = userData.plan || "free";

      if (postPlan === "paid" && userPlan !== "paid") {
        return res.status(403).json({
          message: "Upgrade to the Paid plan to publish Paid posts.",
        });
      }

      const postData = {
        userId: req.user.uid,
        authorName: userData.fullName || "DEV@Deakin User",
        postType,
        postPlan,
        status: "published",
        likeCount: 0,
        title: title.trim(),

        description:
          postType === "question" ? description.trim() : "",

        abstract:
          postType === "article" ? abstract.trim() : "",

        articleText:
          postType === "article" ? articleText.trim() : "",

        tags: [
          ...new Set(
            tags.map((tag) => tag.trim().toLowerCase())
          ),
        ],

        createdAt: FieldValue.serverTimestamp(),
      };

      const postRef = await postsCollection.add(postData);

      console.log(`Post created successfully: ${postRef.id}`);

      return res.status(201).json({
        message: "Your post has been submitted successfully!",
        postId: postRef.id,
      });
    } catch (error) {
      console.error("Post creation error:", error);

      return res.status(500).json({
        message: "Unable to save your post. Please try again.",
      });
    }
  }
);


// --------------------------------------------------
// 15. PERSONALIZED USER DASHBOARD
// GET /api/my/dashboard
// --------------------------------------------------

app.get(
  "/api/my/dashboard",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.uid;

      // Fetch the currently logged-in user's account.
      const userRef = usersCollection.doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "User account not found."
        });
      }

      const userData = userDoc.data();

      if (userData.accountStatus === "suspended") {
        return res.status(403).json({
          success: false,
          message: "This account has been suspended."
        });
      }

      // Fetch only posts created by this user.
      const postsSnapshot = await postsCollection
        .where("userId", "==", userId)
        .get();

      // Convert Firestore timestamps into readable dates.
      const toISOString = (timestamp) => {
        if (!timestamp) return null;

        if (typeof timestamp.toDate === "function") {
          return timestamp.toDate().toISOString();
        }

        if (timestamp instanceof Date) {
          return timestamp.toISOString();
        }

        return null;
      };

      // Prepare the user's posts and engagement information.
      const posts = await Promise.all(
        postsSnapshot.docs.map(async (postDoc) => {
          const data = postDoc.data();

          // Retrieve comments belonging to this post.
          const commentsSnapshot = await postDoc.ref
            .collection("comments")
            .get();

          // Count replies under each comment.
          const replyCounts = await Promise.all(
            commentsSnapshot.docs.map(async (commentDoc) => {
              const repliesSnapshot = await commentDoc.ref
                .collection("replies")
                .get();

              return repliesSnapshot.size;
            })
          );

          const totalReplies = replyCounts.reduce(
            (total, count) => total + count,
            0
          );

          return {
            id: postDoc.id,
            title: data.title || "Untitled Post",
            postType: data.postType || "question",
            postPlan: data.postPlan || "free",
            status: data.status || "published",
            createdAt: toISOString(data.createdAt),
            likeCount: Math.max(0, Number(data.likeCount) || 0),
            commentsCount: commentsSnapshot.size,
            repliesCount: totalReplies
          };
        })
      );

      // Sort posts from newest to oldest.
      posts.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;

        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Calculate personalised statistics.
      const statistics = {
        totalPosts: posts.length,

        publishedPosts: posts.filter(
          (post) => post.status === "published"
        ).length,

        removedPosts: posts.filter(
          (post) => post.status === "removed"
        ).length,

        questions: posts.filter(
          (post) => post.postType === "question"
        ).length,

        articles: posts.filter(
          (post) => post.postType === "article"
        ).length,

        likesReceived: posts.reduce(
          (total, post) => total + post.likeCount,
          0
        ),

        commentsReceived: posts.reduce(
          (total, post) => total + post.commentsCount,
          0
        ),

        repliesReceived: posts.reduce(
          (total, post) => total + post.repliesCount,
          0
        )
      };

      return res.status(200).json({
        success: true,
        message: "Personal dashboard retrieved successfully.",

        user: {
          id: userDoc.id,
          fullName: userData.fullName || "DEV@Deakin User",
          email: userData.email || "",
          plan: userData.plan === "paid" ? "paid" : "free",
          role: userData.role === "admin" ? "admin" : "user"
        },

        statistics,

        recentPosts: posts.slice(0, 5),

        posts
      });

    } catch (error) {
      console.error("Personal dashboard error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve your personal dashboard."
      });
    }
  }
);


// --------------------------------------------------
// 15. NEWSLETTER SUBSCRIPTION
// POST /subscribe
// --------------------------------------------------

app.post("/subscribe", async (req, res) => {
  const email = req.body?.email;

  if (!isValidEmail(email)) {
    return res.status(400).send(
      "Please enter a valid email address."
    );
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const response = await mailjet
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: "arorasiya2612@gmail.com",
              Name: "DEV@Deakin",
            },

            To: [{ Email: cleanEmail }],

            Subject: "Welcome to DEV@Deakin",

            TextPart:
              "Welcome to DEV@Deakin! Thank you for subscribing to our Daily Insider.",

            HTMLPart: `
              <h2>Welcome to DEV@Deakin!</h2>
              <p>Thank you for subscribing to our Daily Insider.</p>
              <p>You will now receive our latest updates and news.</p>
            `,
          },
        ],
      });

    console.log(
      "Mailjet status:",
      response.body.Messages[0].Status
    );

    return res.status(200).send(
      "Subscription successful! Welcome email sent."
    );
  } catch (error) {
    console.error("Mailjet error:", error);

    return res.status(500).send(
      "Failed to send welcome email."
    );
  }
});

// --------------------------------------------------
// 16. GET ALL PUBLISHED POSTS
// GET /api/posts
// --------------------------------------------------

app.get(
  "/api/posts",
  optionalAuthenticateToken,
  async (req, res) => {
    try {
     
      let viewerPlan = "free";
      let viewerRole = "user";
      if (req.user) {
        const userDoc = await usersCollection
          .doc(req.user.uid)
          .get();

        if (!userDoc.exists) {
          return res.status(404).json({
            message: "User account not found.",
          });
        }

        const userData = userDoc.data();

        if (userData.accountStatus === "suspended") {
          return res.status(403).json({
            message: "This account has been suspended.",
          });
        }

        viewerPlan = userData.plan || "free";
viewerRole = userData.role === "admin" ? "admin" : "user";
      }

      const snapshot = await postsCollection
        .orderBy("createdAt", "desc")
        .get();

      // Hide removed posts from public browsing.
      // Legacy posts without a status remain published.
     
const viewerUserId = req.user?.uid || null;

const posts = await Promise.all(
  snapshot.docs
    .filter((doc) => doc.data().status !== "removed")
    .map(async (doc) => {
      const data = doc.data();
      
        const isLocked =
  data.postPlan === "paid" &&
  viewerPlan !== "paid" &&
  viewerRole !== "admin";

      let likedByMe = false;

      if (viewerUserId) {
        const likeDoc = await doc.ref
          .collection("likes")
          .doc(viewerUserId)
          .get();

        likedByMe = likeDoc.exists;
      }

      return {
        id: doc.id,
        userId: data.userId,
        authorName: data.authorName,
        title: data.title,
        postType: data.postType,
        postPlan: data.postPlan,
        tags: data.tags || [],
        abstract: data.abstract || "",

        description: isLocked ? "" : data.description || "",
        articleText: isLocked ? "" : data.articleText || "",

        isLocked,

        likeCount: Math.max(0, Number(data.likeCount) || 0),
        likedByMe,

        createdAt: data.createdAt
          ? data.createdAt.toDate().toISOString()
          : null,
      };
    })
);

      return res.status(200).json({
        message: "Posts retrieved successfully.",
        posts,
      });
    } catch (error) {
      console.error("Fetch posts error:", error);

      return res.status(500).json({
        message: "Unable to retrieve posts.",
      });
    }
  }
);

// --------------------------------------------------
// UNKNOWN ROUTE
// --------------------------------------------------

app.use((req, res) => {
  return res.status(404).json({
    message: "API endpoint not found.",
  });
});

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: "An unexpected server error occurred.",
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
