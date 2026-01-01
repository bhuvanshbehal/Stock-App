const { Pool } = require("pg");
require("dotenv").config();

// Pool is a connection pool that keeps reusable connections
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB
});

module.exports = { pool };
