const getDb = require("../config/db");
const db = getDb();
const multer = require("multer");
const path = require("path");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure this folder exists in your project
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage }).single("image");

// Get all categories with subcategories
exports.getCategories = async (req, res) => {
  try {
    // Use promise-based queries
    const [categories] = await db.promise().query("SELECT * FROM categories");
    const [subcategories] = await db
      .promise()
      .query("SELECT * FROM subcategories");

    if (!Array.isArray(categories)) {
      throw new Error("Categories query did not return an array");
    }

    // Attach subcategories to categories
    const result = categories.map((category) => ({
      ...category,
      subcategories: subcategories.filter(
        (sub) => sub.category_id === category.id
      ),
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    res.status(500).json({ error: error.message });
  }
};
// Get a single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[category]] = await db.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const [subcategories] = await db.query(
      "SELECT * FROM subcategories WHERE category_id = ?",
      [id]
    );

    res.status(200).json({ ...category, subcategories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    try {
      const { name } = req.body;
      if (!name || !req.file) {
        return res.status(400).json({ message: "Name and image are required" });
      }

      const imageUrl = `/uploads/${req.file.filename}`; // Adjust URL handling as needed
      const result = await db
        .promise()
        .query("INSERT INTO categories (name, image) VALUES (?, ?)", [
          name,
          imageUrl,
        ]);

      res.status(201).json({ id: result[0].insertId, name, image: imageUrl });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

// Create a new subcategory
exports.createSubcategory = async (req, res) => {
  try {
    const { name, category_id } = req.body;
    if (!name || !category_id)
      return res
        .status(400)
        .json({ message: "Name and category_id are required" });

    // Use promise-based query and destructure the result
    const [result] = await db
      .promise()
      .query("INSERT INTO subcategories (name, category_id) VALUES (?, ?)", [
        name,
        category_id,
      ]);

    res.status(201).json({ id: result.insertId, name, category_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image } = req.body;
    await db.query("UPDATE categories SET name = ?, image = ? WHERE id = ?", [
      name,
      image,
      id,
    ]);
    res.status(200).json({ message: "Category updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Use promise-based query and destructure the result
    const [result] = await db
      .promise()
      .query("DELETE FROM categories WHERE id = ?", [id]);

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category deleted successfully",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
