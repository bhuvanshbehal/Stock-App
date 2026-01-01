const { pool } = require("./db");

async function test() {
  try {
    const res = await pool.query("SELECT Now()");
    console.log("Database connected:", res.rows);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    pool.end();
  }
}

test();
 