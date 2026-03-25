const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

async function getMedications(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const meds = await db
      .collection('medications')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(meds);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function addMedication(req, res) {
  const { name, dosage, frequency, reminderTime, notes } = req.body;
  if (!name || !dosage || !frequency)
    return res.status(400).json({ error: 'name, dosage, frequency required' });

  try {
    const db = getDB();
    const result = await db.collection('medications').insertOne({
      userId: new ObjectId(req.user._id),
      name,
      dosage,
      frequency,
      reminderTime: reminderTime ?? null,
      notes: notes ?? '',
      active: true,
      createdAt: new Date(),
    });
    const med = await db.collection('medications').findOne({ _id: result.insertedId });
    res.status(201).json(med);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateMedication(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid medication id' });
    }
    const updates = req.body;
    delete updates._id;
    delete updates.userId;

    const result = await db
      .collection('medications')
      .findOneAndUpdate(
        { _id: new ObjectId(id), userId },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function toggleActive(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid medication id' });
    }
    const med = await db.collection('medications').findOne({ _id: new ObjectId(id), userId });
    if (!med) return res.status(404).json({ error: 'Not found' });

    const updated = await db
      .collection('medications')
      .findOneAndUpdate(
        { _id: new ObjectId(id), userId },
        { $set: { active: !med.active, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Adherence: mark medication taken for a date
async function logAdherence(req, res) {
  const { medId, date, taken } = req.body;
  if (!medId || !date) return res.status(400).json({ error: 'medId and date required' });
  if (!ObjectId.isValid(medId)) {
    return res.status(400).json({ error: 'Invalid medication id' });
  }

  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);

    const result = await db.collection('adherence_logs').findOneAndUpdate(
      { userId, medId: new ObjectId(medId), date },
      {
        $set: {
          userId,
          medId: new ObjectId(medId),
          date,
          taken: taken ?? true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function getAdherence(req, res) {
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
    const logs = await db.collection('adherence_logs').find(filter).toArray();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getMedications,
  addMedication,
  updateMedication,
  toggleActive,
  logAdherence,
  getAdherence,
};
