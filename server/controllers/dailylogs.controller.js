const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

async function createLog(req, res) {
  const { date, mood, energy, sleep, pain, symptoms, meals, cycleDay, notes } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required' });

  try {
    const db = getDB();
    const userId = req.user._id;

    // Upsert — one log per user per date
    const result = await db.collection('daily_logs').findOneAndUpdate(
      { userId: new ObjectId(userId), date },
      {
        $set: {
          userId: new ObjectId(userId),
          date,
          mood: mood ?? null,
          energy: energy ?? null,
          sleep: sleep ?? null,
          pain: pain ?? null,
          symptoms: symptoms ?? [],
          meals: meals ?? '',
          cycleDay: cycleDay ?? null,
          notes: notes ?? '',
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getLogs(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const { from, to } = req.query;

    const filter = { userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const logs = await db.collection('daily_logs').find(filter).sort({ date: -1 }).toArray();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function getLogByDate(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const { date } = req.params;
    const log = await db.collection('daily_logs').findOne({ userId, date });
    if (!log) return res.status(404).json({ error: 'No log found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function deleteLog(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid log id' });
    }
    await db.collection('daily_logs').deleteOne({ _id: new ObjectId(id), userId });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createLog, getLogs, getLogByDate, deleteLog };
