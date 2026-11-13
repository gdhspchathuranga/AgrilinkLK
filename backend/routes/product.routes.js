const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const Product = require("../models/Product");
const { protect } = require("../middleware/authmiddleware");

// ---------- Image upload setup ----------
const UPLOAD_DIR = path.join(__dirname, "../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype.startsWith("image/") &&
      ALLOWED_EXT.includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error("Only JPG, PNG or WEBP images are allowed"), ok);
  }
});

// Runs multer and turns its errors into clean JSON messages
const uploadImage = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "Image must be 3 MB or smaller" : err.message;
    res.status(400).json({ message });
  });
};

const removeFile = (imagePath) => {
  if (typeof imagePath !== "string" || !imagePath.startsWith("/uploads/")) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(imagePath)), () => {});
};

// ---------- Helpers ----------
const UNITS = ["kg", "g", "bunch", "piece", "litre"];
const str = (v) => (typeof v === "string" ? v.trim() : "");

// Validates form fields. With partial = true, only fields that were sent are checked.
function buildData(body, partial) {
  const data = {};
  const sent = (k) => body[k] !== undefined;

  if (!partial || sent("name")) {
    const v = str(body.name);
    if (!v || v.length > 80) return { error: "Enter a product name (up to 80 characters)" };
    data.name = v;
  }
  if (!partial || sent("category")) {
    const v = str(body.category);
    if (!v || v.length > 40) return { error: "Enter a category (up to 40 characters)" };
    data.category = v;
  }
  if (!partial || sent("price")) {
    const v = Number(body.price);
    if (!Number.isFinite(v) || v <= 0) return { error: "Price must be greater than 0" };
    data.price = v;
  }
  if (!partial || sent("unit")) {
    const v = str(body.unit) || "kg";
    if (!UNITS.includes(v)) return { error: "Choose a valid unit" };
    data.unit = v;
  }
  if (!partial || sent("quantity")) {
    const v = Number(body.quantity);
    if (!Number.isInteger(v) || v < 0) return { error: "Quantity must be 0 or more" };
    data.quantity = v;
  }
  if (sent("description")) {
    const v = str(body.description);
    if (v.length > 500) return { error: "Description must be 500 characters or fewer" };
    data.description = v;
  }
  if (sent("available")) {
    data.available = body.available === true || body.available === "true";
  }
  return { data };
}

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id)
    ? next()
    : res.status(400).json({ message: "Invalid product id" });

// ---------- Routes ----------

// PUBLIC: products buyers can order (supports ?category= and ?search=)
router.get("/", async (req, res) => {
  try {
    const filter = { available: true, quantity: { $gt: 0 } };
    if (str(req.query.category)) filter.category = str(req.query.category);
    if (str(req.query.search)) {
      const safe = str(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: safe, $options: "i" };
    }
    const products = await Product.find(filter)
      .populate("farmer", "name district")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(products);
  } catch (error) {
    console.error("List products error:", error);
    res.status(500).json({ message: "Could not load products" });
  }
});

// FARMER: my own products (must be declared before "/:id")
router.get("/mine", protect(["farmer"]), async (req, res) => {
  try {
    const products = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error("My products error:", error);
    res.status(500).json({ message: "Could not load your products" });
  }
});

// FARMER: add a product (multipart form, optional "image" file)
router.post("/", protect(["farmer"]), uploadImage, async (req, res) => {
  try {
    const { data, error } = buildData(req.body, false);
    if (error) {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ message: error });
    }

    const product = await Product.create({
      ...data,
      farmer: req.user._id,
      image: req.file ? `/uploads/${req.file.filename}` : ""
    });
    res.status(201).json({ message: "Product added", product });
  } catch (error) {
    if (req.file) removeFile(`/uploads/${req.file.filename}`);
    console.error("Add product error:", error);
    res.status(500).json({ message: "Could not add the product" });
  }
});

// FARMER: edit my product (partial update, optional new image, or removeImage=true)
router.put("/:id", protect(["farmer"]), validId, uploadImage, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ message: "Product not found" });
    }
    if (String(product.farmer) !== String(req.user._id)) {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      return res.status(403).json({ message: "You can only edit your own products" });
    }

    const { data, error } = buildData(req.body, true);
    if (error) {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ message: error });
    }

    Object.assign(product, data);

    if (req.file) {
      removeFile(product.image);
      product.image = `/uploads/${req.file.filename}`;
    } else if (req.body.removeImage === "true") {
      removeFile(product.image);
      product.image = "";
    }

    await product.save();
    res.json({ message: "Product updated", product });
  } catch (error) {
    if (req.file) removeFile(`/uploads/${req.file.filename}`);
    console.error("Update product error:", error);
    res.status(500).json({ message: "Could not update the product" });
  }
});

// FARMER (own product) or ADMIN: delete
router.delete("/:id", protect(["farmer", "admin"]), validId, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const isOwner = String(product.farmer) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own products" });
    }

    removeFile(product.image);
    await product.deleteOne();
    res.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Could not delete the product" });
  }
});

module.exports = router;
