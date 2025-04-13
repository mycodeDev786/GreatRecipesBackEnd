const express = require("express");
const router = express.Router();
const recipesController = require("../controllers/recipesController");

// Routes for recipes
router.post("/", recipesController.createRecipe); // Create a new recipe with images
router.get("/", recipesController.getAllRecipes); // Get all recipes
router.get("/all", recipesController.getAllRecipesPost);
router.get("/:id", recipesController.getRecipesByUserId); // Get a recipe with images
router.get("/recipes/:id", recipesController.getRecipeById);
router.put("/:id", recipesController.updateRecipeCategory); // Update a recipe
router.delete("/:id", recipesController.deleteRecipe); // Delete a recipe

module.exports = router;
