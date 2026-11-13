const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // Sam@x.com and sam@x.com are the same account
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false // the hash is left out of queries unless you ask for it with .select("+password")
    },
    role: {
      type: String,
      enum: ["farmer", "buyer", "admin"],
      required: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      // Never send the password hash or the internal version field to the browser
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model("User", UserSchema);
