const db = require("../config/db");
const multer = require("multer");
// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});
const upload = multer({ storage });

// Get all bakers
exports.getAllBakers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM bakers");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a baker by ID
exports.getBakerById = async (req, res) => {
  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM bakers WHERE user_id = ?", [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Baker not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new baker
exports.createBaker = async (req, res) => {
  try {
    console.log(req.body); // Debugging

    const {
      user_id,
      profile_image,
      country,
      flag,
      isTop10Sales,
      isTop10Followers,
      rating,
      score,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO bakers (user_id, profile_image, country, flag, isTop10Sales, isTop10Followers, rating, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          user_id,
          profile_image,
          country,
          flag,
          isTop10Sales,
          isTop10Followers,
          rating,
          score,
        ]
      );

    res
      .status(201)
      .json({ id: result.insertId, message: "Baker created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a baker
exports.updateBaker = async (req, res) => {
  try {
    const {
      profile_image,
      country,
      flag,
      isTop10Sales,
      isTop10Followers,
      rating,
      score,
    } = req.body;
    const [result] = await db.query(
      "UPDATE bakers SET profile_image = ?, country = ?, flag = ?, isTop10Sales = ?, isTop10Followers = ?, rating = ?, score = ? WHERE id = ?",
      [
        profile_image,
        country,
        flag,
        isTop10Sales,
        isTop10Followers,
        rating,
        score,
        req.params.id,
      ]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Baker not found" });
    res.json({ message: "Baker updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a baker
exports.deleteBaker = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM bakers WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Baker not found" });
    res.json({ message: "Baker deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// API to update profile_image based on user_id
exports.updateProfileImage = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const profile_image = `/uploads/${req.file.filename}`; // Save file path

    const [result] = await db
      .promise()
      .query("UPDATE bakers SET profile_image = ? WHERE user_id = ?", [
        profile_image,
        user_id,
      ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Baker not found" });
    }

    res.json({ message: "Profile image updated successfully", profile_image });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
