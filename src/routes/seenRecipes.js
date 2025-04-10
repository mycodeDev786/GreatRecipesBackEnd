const express = require("express");
const router = express.Router();
const controller = require("../controllers/seenRecipesController");

// POST /api/seen-recipes
router.post("/", controller.markRecipeAsSeen);

module.exports = router;
