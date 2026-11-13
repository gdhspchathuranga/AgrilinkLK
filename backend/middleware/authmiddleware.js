const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Usage:
 *   router.get("/me", protect(), handler);                    any logged-in user
 *   router.get("/farmers", protect("admin"), handler);        one role
 *   router.post("/", protect(["farmer", "admin"]), handler);  several roles
 *
 * Always call it with brackets: protect(), not protect.
 */
exports.protect = (roles = []) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return async (req, res, next) => {
    try {
      const header = req.headers.authorization;

      if (!header || typeof header !== "string") {
        return res.status(401).json({ message: "No token provided" });
      }

      // Support both "Bearer token" and "token"
      const token = header.startsWith("Bearer ") ? header.split(" ")[1] : header;

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"]
      });

      // The password hash is already hidden by the User model
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      // The role is read from the database, not the token,
      // so changing a user's role takes effect straight away
      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Session expired. Please log in again." });
      }
      res.status(401).json({ message: "Invalid token" });
    }
  };
};
