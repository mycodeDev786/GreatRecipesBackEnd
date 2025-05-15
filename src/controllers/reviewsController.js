const getDb = require("../config/db");
const db = getDb();
const multer = require("multer");
const path = require("path");

// Multer storage for review images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage }).fields([{ name: "images", maxCount: 3 }]);

// Create a review with images
exports.createReview = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const { user_id, recipe_id, rating, review } = req.body;
      if (!user_id || !recipe_id || !rating) {
        return res
          .status(400)
          .json({ message: "User ID, Recipe ID, and Rating are required" });
      }

      // Check if the user has already reviewed this recipe
      const [[existingReview]] = await db
        .promise()
        .query("SELECT id FROM reviews WHERE user_id = ? AND recipe_id = ?", [
          user_id,
          recipe_id,
        ]);

      if (existingReview) {
        return res.status(400).json({
          message:
            "You have already reviewed this recipe. Edit your review instead.",
        });
      }

      const imageUrls = req.files.map(
        (file) => `/uploads/reviews/${file.filename}`
      );

      // Insert the review into the database
      await db
        .promise()
        .query(
          "INSERT INTO reviews (user_id, recipe_id, rating, review, images) VALUES (?, ?, ?, ?, ?)",
          [user_id, recipe_id, rating, review || "", JSON.stringify(imageUrls)]
        );

      // **Update rating_count and average_rating in recipes table**
      const [[ratingData]] = await db
        .promise()
        .query(
          "SELECT COUNT(*) AS rating_count, AVG(rating) AS average_rating FROM reviews WHERE recipe_id = ?",
          [recipe_id]
        );

      await db
        .promise()
        .query(
          "UPDATE recipes SET rating_count = ?, average_rating = ? WHERE id = ?",
          [ratingData.rating_count, ratingData.average_rating, recipe_id]
        );

      res.status(201).json({
        message: "Review added successfully",
        rating_count: ratingData.rating_count,
        average_rating: parseFloat(ratingData.average_rating.toFixed(2)), // Format to 2 decimal places
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

// Get reviews with images
exports.getReviewsByRecipeId = async (req, res) => {
  try {
    const { recipe_id } = req.params;
    const [reviews] = await db
      .promise()
      .query("SELECT * FROM reviews WHERE recipe_id = ?", [recipe_id]);

    for (const review of reviews) {
      const [images] = await db
        .promise()
        .query("SELECT image FROM review_images WHERE review_id = ?", [
          review.id,
        ]);
      review.images = images.map((img) => img.image);
    }

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
