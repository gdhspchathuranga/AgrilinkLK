const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const { protect } = require("../middleware/authmiddleware");

// Every route in this file is admin only
router.use(protect(["admin"]));

const UPLOAD_DIR = path.join(__dirname, "../uploads");
const removeFile = (imagePath) => {
  if (typeof imagePath !== "string" || !imagePath.startsWith("/uploads/")) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(imagePath)), () => {});
};

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id)
    ? next()
    : res.status(400).json({ message: "Invalid id" });

// Numbers for the admin dashboard cards and charts
router.get("/stats", async (req, res) => {
  try {
    const Order = require("../models/Order");

    const [roles, products, statuses, monthly] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Product.countDocuments(),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$totalPrice" } } }]),
      Order.aggregate([
        { $match: { status: { $in: ["delivered", "Delivered"] } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$totalPrice" },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const users = { farmer: 0, buyer: 0, admin: 0 };
    roles.forEach((r) => (users[r._id] = r.count));

    const orders = { pending: 0, accepted: 0, rejected: 0, delivered: 0, cancelled: 0 };
    let revenue = 0;
    statuses.forEach((s) => {
      const key = String(s._id).toLowerCase();
      orders[key] = (orders[key] || 0) + s.count;
      if (key === "delivered") revenue += s.value;
    });

    res.json({
      users,
      products,
      orders,
      revenue,
      monthly: monthly.slice(-6).map((m) => ({ month: m._id, revenue: m.revenue, orders: m.orders }))
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ message: "Could not load statistics" });
  }
});

// All users (the password hash is hidden by the User model)
router.get("/users", async (req, res) => {
  try {
    res.json(await User.find().sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ message: "Could not load users" });
  }
});

// Verify or un-verify a farmer or buyer
router.put("/users/:id/verify", validId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts do not need verification" });
    }
    user.verified = req.body.verified === true;
    await user.save();
    res.json({ message: user.verified ? "User verified" : "Verification removed", user });
  } catch (error) {
    console.error("Verify user error:", error);
    res.status(500).json({ message: "Could not update the user" });
  }
});

// Delete a user (and a farmer's products). Order history is kept.
router.delete("/users/:id", validId, async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be deleted here" });
    }

    if (user.role === "farmer") {
      const products = await Product.find({ farmer: user._id });
      products.forEach((p) => removeFile(p.image));
      await Product.deleteMany({ farmer: user._id });
    }
    await user.deleteOne();
    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Could not delete the user" });
  }
});

// All products, including out-of-stock ones (delete uses DELETE /api/products/:id)
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find()
      .populate("farmer", "name district")
      .sort({ createdAt: -1 })
      .limit(300);
    res.json(products);
  } catch (error) {
    console.error("Admin products error:", error);
    res.status(500).json({ message: "Could not load products" });
  }
});

module.exports = router;
