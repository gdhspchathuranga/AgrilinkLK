const router = require("express").Router();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect } = require("../middleware/authmiddleware");

const str = (v) => (typeof v === "string" ? v.trim() : "");

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id)
    ? next()
    : res.status(400).json({ message: "Invalid order id" });

// Who may move an order from one status to another
const FLOW = {
  farmer: { pending: ["accepted", "rejected"], accepted: ["delivered"] },
  buyer: { pending: ["cancelled"] }
};

/**
 * BUYER: place an order.
 * The price is always taken from the product on the server, never from the browser.
 */
router.post("/", protect(["buyer"]), async (req, res) => {
  let reserved = null;
  try {
    const productId = req.body.productId;
    const quantity = Number(req.body.quantity);
    const deliveryAddress = str(req.body.deliveryAddress);
    const note = str(req.body.note);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product" });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be a whole number of 1 or more" });
    }
    if (!deliveryAddress || deliveryAddress.length > 200) {
      return res.status(400).json({ message: "Enter a delivery address (up to 200 characters)" });
    }
    if (note.length > 300) {
      return res.status(400).json({ message: "Note must be 300 characters or fewer" });
    }

    // Take the stock in one atomic step, so two buyers can never order the same last items
    const product = await Product.findOneAndUpdate(
      { _id: productId, available: true, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { new: true }
    );
    if (!product) {
      return res.status(400).json({ message: "This product is unavailable or there is not enough stock" });
    }
    reserved = { id: product._id, quantity };

    const order = await Order.create({
      buyer: req.user._id,
      farmer: product.farmer,
      product: product._id,
      productName: product.name,
      unit: product.unit,
      unitPrice: product.price,
      quantity,
      totalPrice: Math.round(product.price * quantity * 100) / 100,
      deliveryAddress,
      note
    });

    res.status(201).json({ message: "Order placed", order });
  } catch (error) {
    // If the order could not be saved, give the stock back
    if (reserved) {
      await Product.updateOne({ _id: reserved.id }, { $inc: { quantity: reserved.quantity } }).catch(() => {});
    }
    console.error("Place order error:", error);
    res.status(500).json({ message: "Could not place the order" });
  }
});

// BUYER: my orders
router.get("/mine", protect(["buyer"]), async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate("product", "name image unit")
      .populate("farmer", "name phone district")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("My orders error:", error);
    res.status(500).json({ message: "Could not load your orders" });
  }
});

// FARMER: orders for my products
router.get("/farmer", protect(["farmer"]), async (req, res) => {
  try {
    const orders = await Order.find({ farmer: req.user._id })
      .populate("product", "name image unit")
      .populate("buyer", "name phone district")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("Farmer orders error:", error);
    res.status(500).json({ message: "Could not load your orders" });
  }
});

// ADMIN: all orders
router.get("/", protect(["admin"]), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("product", "name image unit")
      .populate("buyer", "name")
      .populate("farmer", "name")
      .sort({ createdAt: -1 })
      .limit(300);
    res.json(orders);
  } catch (error) {
    console.error("All orders error:", error);
    res.status(500).json({ message: "Could not load orders" });
  }
});

/**
 * FARMER: accept, reject or deliver their orders.
 * BUYER: cancel their own order while it is still pending.
 * Rejecting or cancelling gives the stock back to the product.
 */
router.put("/:id/status", protect(["farmer", "buyer"]), validId, async (req, res) => {
  try {
    const next = str(req.body.status).toLowerCase();
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const role = req.user.role; // "farmer" or "buyer", also the field name on the order
    if (String(order[role]) !== String(req.user._id)) {
      return res.status(403).json({ message: "This is not your order" });
    }

    const current = String(order.status).toLowerCase();
    const allowed = (FLOW[role] && FLOW[role][current]) || [];
    if (!allowed.includes(next)) {
      return res.status(400).json({ message: `A ${current} order cannot be changed to ${next}` });
    }

    // Only change it if nobody else changed it in the meantime (prevents giving stock back twice)
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { status: next },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ message: "This order was just changed. Please refresh." });
    }

    if (next === "rejected" || next === "cancelled") {
      await Product.updateOne({ _id: order.product }, { $inc: { quantity: order.quantity } });
    }

    res.json({ message: `Order ${next}`, order: updated });
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ message: "Could not update the order" });
  }
});

module.exports = router;
