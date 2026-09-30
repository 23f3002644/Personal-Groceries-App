require('dotenv').config();

const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const Category = require('./models/Category');
const DailyPlan = require('./models/DailyPlan');
const Task = require('./models/Task');

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;

function isValidDateKey(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
}

app.use(cors());
app.use(express.json());

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.json(categories);
  } catch (error) {
    console.error('Failed to load categories:', error.message);
    return res.status(500).json({ message: 'Unable to load categories.' });
  }
});

app.post('/api/categories', async (req, res) => {
  const name = req.body?.name;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ message: 'Category name must not be empty.' });
  }

  try {
    const category = await Category.create({ name: name.trim() });
    return res.status(201).json(category);
  } catch (error) {
    console.error('Failed to create category:', error.message);
    return res.status(500).json({ message: 'Unable to create category.' });
  }
});

app.patch('/api/categories/:id', async (req, res) => {
  const name = req.body?.name;

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Category is invalid.' });
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ message: 'Category name must not be empty.' });
  }

  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category was not found.' });
    }
    return res.json(category);
  } catch (error) {
    console.error('Failed to update category:', error.message);
    return res.status(500).json({ message: 'Unable to update category.' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Category is invalid.' });
  }

  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category was not found.' });
    }

    const hasItems = await Task.exists({ categoryId: category._id });
    if (hasItems) {
      return res.status(409).json({
        message: 'Move or remove this category’s items before deleting it.',
      });
    }

    await category.deleteOne();
    return res.json({ message: 'Category deleted.' });
  } catch (error) {
    console.error('Failed to delete category:', error.message);
    return res.status(500).json({ message: 'Unable to delete category.' });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ title: 1 });
    return res.json(tasks);
  } catch (error) {
    console.error('Failed to load items:', error.message);
    return res.status(500).json({ message: 'Unable to load items.' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { title, priority, basePricePerUnit, categoryId } = req.body || {};

  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ message: 'Title must not be empty.' });
  }

  if (!['Low', 'Medium', 'High'].includes(priority)) {
    return res.status(400).json({
      message: 'Priority must be Low, Medium, or High.',
    });
  }

  if (
    basePricePerUnit !== undefined &&
    (!Number.isFinite(basePricePerUnit) || basePricePerUnit < 0)
  ) {
    return res.status(400).json({
      message: 'Base price per unit must be a non-negative number.',
    });
  }

  if (categoryId !== undefined) {
    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ message: 'Category is invalid.' });
    }

    const categoryExists = await Category.exists({ _id: categoryId });
    if (!categoryExists) {
      return res.status(400).json({ message: 'Category was not found.' });
    }
  }

  try {
    const task = await Task.create({
      title: title.trim(),
      priority,
      basePricePerUnit,
      categoryId,
    });
    return res.status(201).json(task);
  } catch (error) {
    console.error('Failed to create task:', error.message);
    return res.status(500).json({ message: 'Unable to create task.' });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  const { title, basePricePerUnit, categoryId } = req.body || {};
  const updates = {};

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Item is invalid.' });
  }
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ message: 'Item name must not be empty.' });
    }
    updates.title = title.trim();
  }
  if (basePricePerUnit !== undefined) {
    if (!Number.isFinite(basePricePerUnit) || basePricePerUnit < 0) {
      return res.status(400).json({
        message: 'Base price per unit must be a non-negative number.',
      });
    }
    updates.basePricePerUnit = basePricePerUnit;
  }
  if (categoryId !== undefined) {
    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ message: 'Category is invalid.' });
    }
    const categoryExists = await Category.exists({ _id: categoryId });
    if (!categoryExists) {
      return res.status(400).json({ message: 'Category was not found.' });
    }
    updates.categoryId = categoryId;
  }

  try {
    const task = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!task) {
      return res.status(404).json({ message: 'Item was not found.' });
    }
    return res.json(task);
  } catch (error) {
    console.error('Failed to update item:', error.message);
    return res.status(500).json({ message: 'Unable to update item.' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Item is invalid.' });
  }

  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Item was not found.' });
    }
    return res.json({ message: 'Item deleted.' });
  } catch (error) {
    console.error('Failed to delete item:', error.message);
    return res.status(500).json({ message: 'Unable to delete item.' });
  }
});

app.get('/api/plans', async (req, res) => {
  try {
    if (req.query.date !== undefined) {
      if (!isValidDateKey(req.query.date)) {
        return res.status(400).json({ message: 'Date must use YYYY-MM-DD format.' });
      }
      const plan = await DailyPlan.findOne({ date: req.query.date });
      return res.json(plan);
    }

    const plans = await DailyPlan.find().sort({ date: -1 }).limit(60);
    return res.json(plans);
  } catch (error) {
    console.error('Failed to load daily plans:', error.message);
    return res.status(500).json({ message: 'Unable to load daily plans.' });
  }
});

app.put('/api/plans/:date', async (req, res) => {
  const { budget, items } = req.body || {};

  if (!isValidDateKey(req.params.date)) {
    return res.status(400).json({ message: 'Date must use YYYY-MM-DD format.' });
  }
  if (!Number.isFinite(budget) || budget < 0) {
    return res.status(400).json({ message: 'Budget must be a non-negative number.' });
  }
  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'Items must be an array.' });
  }

  const seenItemIds = new Set();
  for (const entry of items) {
    if (!mongoose.isValidObjectId(entry.itemId)) {
      return res.status(400).json({ message: 'A planned item is invalid.' });
    }
    if (seenItemIds.has(String(entry.itemId))) {
      return res.status(400).json({ message: 'An item can only appear once in a daily plan.' });
    }
    seenItemIds.add(String(entry.itemId));
    if (!Number.isFinite(entry.quantity) || entry.quantity <= 0) {
      return res.status(400).json({ message: 'Item quantity must be greater than zero.' });
    }
    if (!['Low', 'Medium', 'High'].includes(entry.priority)) {
      return res.status(400).json({ message: 'Each item needs a valid priority.' });
    }
  }

  try {
    const itemIds = items.map((entry) => entry.itemId);
    const catalogItems = await Task.find({ _id: { $in: itemIds } }).populate(
      'categoryId',
      'name'
    );
    if (catalogItems.length !== itemIds.length) {
      return res.status(400).json({ message: 'One or more catalog items were not found.' });
    }

    const existingPlan = await DailyPlan.findOne({ date: req.params.date });
    const previousStatuses = new Map(
      (existingPlan?.items || []).map((entry) => [String(entry.itemId), entry.status])
    );
    const catalogById = new Map(catalogItems.map((item) => [String(item._id), item]));
    const planItems = items.map((entry) => {
      const catalogItem = catalogById.get(String(entry.itemId));
      return {
        itemId: catalogItem._id,
        itemName: catalogItem.title,
        categoryName: catalogItem.categoryId?.name || '',
        unitPrice: catalogItem.basePricePerUnit ?? 0,
        quantity: entry.quantity,
        priority: entry.priority,
        status: previousStatuses.get(String(catalogItem._id)) || 'pending',
      };
    });

    const plan = await DailyPlan.findOneAndUpdate(
      { date: req.params.date },
      { date: req.params.date, budget, items: planItems },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json(plan);
  } catch (error) {
    console.error('Failed to save daily plan:', error.message);
    return res.status(500).json({ message: 'Unable to save daily plan.' });
  }
});

app.patch('/api/plans/:date/items/:entryId', async (req, res) => {
  const { status } = req.body || {};

  if (!isValidDateKey(req.params.date)) {
    return res.status(400).json({ message: 'Date must use YYYY-MM-DD format.' });
  }
  if (!mongoose.isValidObjectId(req.params.entryId)) {
    return res.status(400).json({ message: 'Planned item is invalid.' });
  }
  if (!['pending', 'purchased'].includes(status)) {
    return res.status(400).json({ message: 'Status must be pending or purchased.' });
  }

  try {
    const plan = await DailyPlan.findOne({ date: req.params.date });
    if (!plan) {
      return res.status(404).json({ message: 'Daily plan was not found.' });
    }
    const entry = plan.items.id(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Planned item was not found.' });
    }
    entry.status = status;
    await plan.save();
    return res.json(plan);
  } catch (error) {
    console.error('Failed to update purchase status:', error.message);
    return res.status(500).json({ message: 'Unable to update purchase status.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

async function startServer() {
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set. Add it to the backend .env file.');
  }

  if (mongoUri.includes('xxxxx')) {
    throw new Error(
      'MONGO_URI still contains a placeholder. Copy your real connection string from MongoDB Atlas and update backend/.env.'
    );
  }

  await mongoose.connect(mongoUri);

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
