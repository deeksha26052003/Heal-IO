const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

async function getVisits(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const visits = await db
      .collection('doctor_visits')
      .find({ userId })
      .sort({ visitDate: -1 })
      .toArray();
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function addVisit(req, res) {
  const { doctorName, specialty, visitDate, notes, prescriptions, followUpDate } = req.body;
  if (!doctorName || !visitDate)
    return res.status(400).json({ error: 'doctorName and visitDate required' });

  try {
    const db = getDB();
    const result = await db.collection('doctor_visits').insertOne({
      userId: new ObjectId(req.user._id),
      doctorName,
      specialty: specialty ?? '',
      visitDate,
      notes: notes ?? '',
      prescriptions: prescriptions ?? [],
      followUpDate: followUpDate ?? null,
      createdAt: new Date(),
    });
    const visit = await db.collection('doctor_visits').findOne({ _id: result.insertedId });
    res.status(201).json(visit);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateVisit(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid visit id' });
    }
    const updates = req.body;
    delete updates._id;
    delete updates.userId;

    const result = await db
      .collection('doctor_visits')
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

async function deleteVisit(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid visit id' });
    }
    await db.collection('doctor_visits').deleteOne({ _id: new ObjectId(id), userId });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getVisits, addVisit, updateVisit, deleteVisit };
