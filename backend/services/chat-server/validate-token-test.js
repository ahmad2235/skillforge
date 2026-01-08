const mysql = require('mysql2/promise');
const { validateToken } = require('./auth');

(async () => {
  const db = await mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'skillforge',
    connectionLimit: 2,
  });

  const token = '300|9JsHrQSe3BUJVdLeeWSjsupCKgsCJGsmai2L5qcX279946a2';
  const res = await validateToken(db, token);
  console.log('validate result:', res);
  process.exit(0);
})();