const db = require("../config/db");
const multer = require("multer");
const path = require("path");
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
    const [rows] = await db.promise().query(`
      SELECT 
        b.*, 
        COUNT(f.follower_id) AS follower_count
      FROM 
        bakers b
      LEFT JOIN 
        followers f ON b.user_id = f.baker_id
      GROUP BY 
        b.user_id
      ORDER BY 
        b.created_at DESC
    `);
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
// Create a new baker
exports.createBaker = async (req, res) => {
  upload.single("profile_image")(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: "File upload failed" });
    }

    try {
      console.log("Request Body:", req.body);

      const {
        user_id,
        country,
        baker_name,
        flag,
        isTop10Sales,
        isTop10Followers,
        rating,
        score,
      } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
      }

      const profile_image = req.file ? "/uploads/" + req.file.filename : null;

      // Convert boolean values to 0 or 1
      const isTop10SalesInt = isTop10Sales === "true" ? 1 : 0;
      const isTop10FollowersInt = isTop10Followers === "true" ? 1 : 0;

      const [result] = await db
        .promise()
        .query(
          "INSERT INTO bakers (user_id, baker_name, profile_image, country, flag, isTop10Sales, isTop10Followers, rating, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            user_id,
            baker_name,
            profile_image,
            country,
            flag,
            isTop10SalesInt,
            isTop10FollowersInt,
            rating,
            score,
          ]
        );

      if (!result || result.affectedRows === 0) {
        return res.status(500).json({ error: "Failed to create baker" });
      }

      res.status(201).json({
        id: result.insertId,
        message: "Baker created successfully",
        profile_image,
      });
    } catch (error) {
      console.error("Error creating baker:", error);
      res.status(500).json({ error: error.message });
    }
  });
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
// Update profile image by user_id
exports.updateProfileImage = async (req, res) => {
  upload.single("profilePicture")(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: "File upload failed" });
    }

    try {
      const userId = req.params.user_id;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const imagePath = "/uploads/" + req.file.filename;

      const [result] = await db
        .promise()
        .query("UPDATE bakers SET profile_image = ? WHERE user_id = ?", [
          imagePath,
          userId,
        ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Baker not found" });
      }

      res.json({
        message: "Profile image updated successfully",
        profile_image: imagePath,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
