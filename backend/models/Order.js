const mongoose = require("mongoose");

const ORDER_STATUSES = ["pending", "accepted", "rejected", "delivered", "cancelled"];

const OrderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    // Copied from the product when the order is placed, so the order still makes
    // sense if the farmer later changes the price or deletes the product.
    // (Not required, so orders created before this change still save correctly.)
    productName: { type: String, trim: true, default: "" },
    unit: { type: String, default: "kg" },
    unitPrice: { type: Number, min: 0, default: 0 },

    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },

    deliveryAddress: { type: String, trim: true, maxlength: 200, default: "" },
    note: { type: String, trim: true, maxlength: 300, default: "" },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
