import { createClient } from '@libsql/client';

const DB_URL = 'libsql://greenleafdb-kiran2057.aws-eu-west-1.turso.io';
const DB_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NDc2NDk2MTcuOTUzNTQyLCJleHAiOjE4MzE2MTY4MTcuOTUzNDIsImlzcyI6InR1cnNvIiwic3ViIjoiZTliYzNhMmUtZjNmNi00Mzc5LTlhYjctZDk2NGIzOGMxNDM4IiwiZGJOb3JtYWxOYW1lIjoiZ3JlZW5sZWFmZGIta2lyYW4yMDU3In0.CM05pKYJ-GUmx6oKBNXsnVKBFLPXQy_3T_WrF_8oXQYQUHmkdzPmXOAd5_8mzF5TjWnJkTZ7DdhX0c7sfEMMCw';

const db = createClient({ url: DB_URL, authToken: DB_TOKEN });

async function run() {
  console.log('Testing connection...');
  try {
    const r = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', r.rows);
  } catch(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Connection error:', msg);
  }
}

run();
