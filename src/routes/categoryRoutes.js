const express = require("express");
const {
  getCategories,
  getCategoryById,
  createCategory,
  createSubcategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", createCategory);
router.post("/subcategory", createSubcategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
