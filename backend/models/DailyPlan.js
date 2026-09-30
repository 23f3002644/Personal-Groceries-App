const mongoose = require('mongoose');

const plannedItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  itemName: {
    type: String,
    required: true,
    trim: true,
  },
  categoryName: {
    type: String,
    default: '',
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  priority: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High'],
  },
  status: {
    type: String,
    enum: ['pending', 'purchased'],
    default: 'pending',
  },
});

const dailyPlanSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    items: {
      type: [plannedItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

dailyPlanSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('DailyPlan', dailyPlanSchema);
