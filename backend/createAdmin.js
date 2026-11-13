// Creates an admin account (public registration cannot create admins).
// Run from the backend folder:  node createAdmin.js you@example.com YourStrongPassword
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./db");
const User = require("./models/User");

(async () => {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const password = process.argv[3] || "";

  if (!email || password.length < 8) {
    console.log("Usage: node createAdmin.js <email> <password of at least 8 characters>");
    process.exit(1);
  }

  await connectDB();

  if (await User.findOne({ email })) {
    console.log("A user with this email already exists.");
    process.exit(0);
  }

  await User.create({
    name: "Administrator",
    email,
    password: await bcrypt.hash(password, 10),
    role: "admin",
    phone: "0000000000",
    district: "Colombo",
    verified: true
  });

  console.log(`Admin created: ${email}`);
  process.exit(0);
})();
