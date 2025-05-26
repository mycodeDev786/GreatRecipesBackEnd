const express = require("express");
const router = express.Router();
const purchasesController = require("../controllers/purchasesController");

// Use the middleware for protected routes
router.post("/", purchasesController.buyRecipes);
router.get("/", purchasesController.getMyPurchases);

module.exports = router;
