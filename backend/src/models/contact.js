const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "unfollowed"],
    default: "pending",
  },
  // Users who chose to leave this chat (one-sided unfollow)
  unfollowedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
  // Clear chat for me only — hide older messages for that user
  clearedAtBy: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
      at: {
        type: Date,
        required: true,
      },
    },
  ],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

contactSchema.index({ requester: 1, recipient: 1 }, { unique: true });

module.exports = mongoose.model("contact", contactSchema);
