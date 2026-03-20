const { MongoClient } = require('mongodb');

let db;

async function connectDB() {
  const client = new MongoClient(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  await client.connect();
  db = client.db();
  console.log('MongoDB connected');

  // Ensure indexes for fast lookups — ignore conflicts with existing indexes
  const indexJobs = [
    db.collection('daily_logs').createIndex({ userId: 1, date: -1 }),
    db.collection('daily_logs').createIndex({ userId: 1, date: 1 }),
    db.collection('medications').createIndex({ userId: 1 }),
    db.collection('adherence_logs').createIndex({ userId: 1, date: -1 }),
    db.collection('adherence_logs').createIndex({ userId: 1, medId: 1, date: 1 }),
    db.collection('doctor_visits').createIndex({ userId: 1, visitDate: -1 }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
  ];
  await Promise.allSettled(indexJobs);

  return db;
}

function getDB() {
  if (!db) throw new Error('DB not initialized. Call connectDB first.');
  return db;
}

module.exports = { connectDB, getDB };
