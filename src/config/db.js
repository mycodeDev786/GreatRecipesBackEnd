require("dotenv").config();
const mysql = require("mysql2");

let db;

function handleDisconnect() {
  db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  db.connect((err) => {
    if (err) {
      console.error(
        "❌ MySQL connection failed. Retrying in 5 seconds...",
        err.message
      );
      setTimeout(handleDisconnect, 5000);
    } else {
      console.log("✅ Connected to MySQL Database");
    }
  });

  db.on("error", (err) => {
    console.error("⚠️ MySQL error", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      handleDisconnect(); // Reconnect on disconnect
    } else {
      throw err;
    }
  });
}

handleDisconnect();

module.exports = () => db;
