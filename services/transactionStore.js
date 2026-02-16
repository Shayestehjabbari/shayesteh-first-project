const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'transactions.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    depositId TEXT,
    payoutId TEXT,
    refundId TEXT,
    amount TEXT,
    currency TEXT,
    phoneNumber TEXT,
    provider TEXT,
    country TEXT,
    status TEXT,
    timestamp TEXT NOT NULL
  )
`);

const insertStmt = db.prepare(`
  INSERT INTO transactions (type, depositId, payoutId, refundId, amount, currency, phoneNumber, provider, country, status, timestamp)
  VALUES (@type, @depositId, @payoutId, @refundId, @amount, @currency, @phoneNumber, @provider, @country, @status, @timestamp)
`);

const selectAllStmt = db.prepare('SELECT * FROM transactions ORDER BY id DESC');

const findByIdStmt = db.prepare(
  'SELECT * FROM transactions WHERE depositId = ? OR payoutId = ? OR refundId = ?'
);

function addTransaction(entry) {
  insertStmt.run({
    type: entry.type || null,
    depositId: entry.depositId || null,
    payoutId: entry.payoutId || null,
    refundId: entry.refundId || null,
    amount: entry.amount || null,
    currency: entry.currency || null,
    phoneNumber: entry.phoneNumber || null,
    provider: entry.provider || null,
    country: entry.country || null,
    status: entry.status || null,
    timestamp: new Date().toISOString(),
  });
}

function getTransactions() {
  return selectAllStmt.all();
}

function getTransactionById(id) {
  return findByIdStmt.get(id, id, id);
}

module.exports = { addTransaction, getTransactions, getTransactionById };
