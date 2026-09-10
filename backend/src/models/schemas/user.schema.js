const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'logistics_manager', 'field_agent', 'transporter'],
      required: true,
      index: true,
    },
    assignedZone: { type: String, default: null },
    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = model('User', userSchema);
