
/**
 * Checks whether the authenticated user currently has
 * administrator permissions in Firestore.
 *
 * The usersCollection is injected from server.js.
 */
function requireAdmin(usersCollection) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({
          success: false,
          message: "Authentication required."
        });
      }

      // Always retrieve the current user record from Firestore.
      const userDoc = await usersCollection
        .doc(req.user.uid)
        .get();

      if (!userDoc.exists) {
        return res.status(401).json({
          success: false,
          message: "User account not found."
        });
      }

      const userData = userDoc.data();

      // Suspended accounts cannot access admin functionality.
      if (userData.accountStatus === "suspended") {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended."
        });
      }

      // Only users explicitly assigned the admin role are allowed.
      if (userData.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Administrator access required."
        });
      }

      // Attach the verified database role to the request.
      req.user.role = userData.role;

      return next();

    } catch (error) {
      console.error("Admin authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to verify administrator permissions."
      });
    }
  };
}

module.exports = requireAdmin;
