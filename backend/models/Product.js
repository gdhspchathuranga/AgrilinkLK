const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    price: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["kg", "g", "bunch", "piece", "litre"],
      default: "kg"
    },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    image: { type: String, default: "" }, // e.g. "/uploads/1700000000-123456.jpg"
    available: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
