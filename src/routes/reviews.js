const express = require("express");
const router = express.Router();
const reviewsController = require("../controllers/reviewsController");

// Routes for reviews
router.post("/", reviewsController.createReview); // Add a review with images
router.get("/:recipe_id", reviewsController.getReviewsByRecipeId); // Get all reviews for a recipe

module.exports = router;
