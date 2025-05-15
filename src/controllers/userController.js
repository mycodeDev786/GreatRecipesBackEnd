const getDb = require("../config/db");
const db = getDb();
const { v4: uuidv4 } = require("uuid");

// 🔹 Get all users
exports.getUsers = (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// 🔹 Get a single user by UUID
exports.getUserById = (req, res) => {
  const userId = req.params.id;
  db.query("SELECT * FROM users WHERE id = ?", [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0)
      return res.status(404).json({ message: "User not found" });
    res.json(result[0]);
  });
};

// 🔹 Create a new user (with UUID & isVerified)
exports.createUser = (req, res) => {
  const { name, email, password, country, userType } = req.body;
  const userId = uuidv4(); // Generate UUID
  const isVerified = false; // Default: Not verified

  db.query(
    "INSERT INTO users (id, name, email, password, country, userType, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [userId, name, email, password, country, userType, isVerified],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "User created successfully", userId });
    }
  );
};

// 🔹 Update user details
exports.updateUser = (req, res) => {
  const userId = req.params.id;
  const { name, email, country, userType } = req.body;

  db.query(
    "UPDATE users SET name = ?, email = ?, country = ?, userType = ? WHERE id = ?",
    [name, email, country, userType, userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "User updated successfully" });
    }
  );
};

// 🔹 Mark user as verified (After OTP verification)
exports.verifyUser = (req, res) => {
  const { email } = req.body;

  db.query(
    "UPDATE users SET isVerified = TRUE WHERE email = ?",
    [email],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res
          .status(404)
          .json({ message: "User not found or already verified" });

      res.json({ message: "Email verified successfully" });
    }
  );
};

// 🔹 Delete a user by UUID
exports.deleteUser = (req, res) => {
  const userId = req.params.id;

  db.query("DELETE FROM users WHERE id = ?", [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User deleted successfully" });
  });
};
