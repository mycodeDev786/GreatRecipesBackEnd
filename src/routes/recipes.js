const express = require("express");
const router = express.Router();
const recipesController = require("../controllers/recipesController");

// Routes for recipes
router.post("/", recipesController.createRecipe); // Create a new recipe with images
router.get("/", recipesController.getAllRecipes); // Get all recipes
router.get("/:id", recipesController.getRecipeById); // Get a recipe with images
router.put("/:id", recipesController.updateRecipe); // Update a recipe
router.delete("/:id", recipesController.deleteRecipe); // Delete a recipe

module.exports = router;
