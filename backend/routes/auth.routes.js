const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in your .env file");
}

// Only these roles can be chosen on the public register form.
// Admin accounts must be created another way (see createAdmin.js).
const PUBLIC_ROLES = ["farmer", "buyer"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Accept only strings, so an object like { "$gt": "" } can never reach a MongoDB query
const text = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * REGISTER
 */
router.post("/register", async (req, res) => {
  try {
    // Frontend sends capitalized keys
    const FullName = text(req.body.FullName);
    const Email = text(req.body.Email).toLowerCase();
    const Password = typeof req.body.Password === "string" ? req.body.Password : "";
    const Role = text(req.body.Role).toLowerCase();
    const Phone = text(req.body.Phone);
    const District = text(req.body.District);

    if (!FullName || !Email || !Password || !Role || !Phone || !District) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    if (!EMAIL_RE.test(Email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (Password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    if (!PUBLIC_ROLES.includes(Role)) {
      return res.status(400).json({ message: "Please choose Farmer or Buyer" });
    }

    const existingUser = await User.findOne({ email: Email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    await User.create({
      name: FullName,
      email: Email,
      password: hashedPassword,
      role: Role, // farmer / buyer
      phone: Phone,
      district: District
    });

    res.status(201).json({ message: "Registered successfully" });
  } catch (error) {
    // 11000 = duplicate key (two people registering the same email at the same moment)
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already registered" });
    }
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  try {
    const Email = text(req.body.Email).toLowerCase();
    const Password = typeof req.body.Password === "string" ? req.body.Password : "";

    if (!Email || !Password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // The password hash is hidden by default, so ask for it here
    const user = await User.findOne({ email: Email }).select("+password");

    // Same message for "no such user" and "wrong password",
    // so nobody can use the form to find out which emails are registered
    const invalid = () => res.status(401).json({ message: "Invalid email or password" });

    if (!user) return invalid();

    const isMatch = await bcrypt.compare(Password, user.password);
    if (!isMatch) return invalid();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        district: user.district
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

module.exports = router;
