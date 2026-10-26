require('dotenv').config();
const { Pool, types } = require('pg');

// Return DATE columns as 'YYYY-MM-DD' strings; parsing them into Date shifts the day in non-UTC timezones.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/launchpad',
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

/** Runs a set of statements inside a single transaction. */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
