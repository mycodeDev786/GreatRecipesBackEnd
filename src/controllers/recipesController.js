const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for recipe images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage }).fields([
  { name: "mainImage", maxCount: 1 },
  { name: "additionalImages", maxCount: 3 },
]);

// Create a new recipe
exports.createRecipe = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const {
        user_id,
        category_id,
        subcategory_id,
        title,
        description,
        ingredients,
        price,
      } = req.body;

      if (
        !user_id ||
        !category_id ||
        !subcategory_id ||
        !title ||
        !description ||
        !ingredients
      ) {
        return res.status(400).json({ message: "Required fields are missing" });
      }

      const mainImage = req.files["mainImage"]
        ? `/uploads/${req.files["mainImage"][0].filename}`
        : null;

      const [result] = await db
        .promise()
        .query(
          "INSERT INTO recipes (user_id, category_id, subcategory_id, title, description, ingredients, price, image, average_rating, rating_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            user_id,
            category_id,
            subcategory_id,
            title,
            description,
            ingredients,
            price || null,
            mainImage,
            0, // Default average_rating
            0, // Default rating_count
          ]
        );

      const recipeId = result.insertId;

      // Store additional images
      if (req.files["additionalImages"]) {
        const imagePromises = req.files["additionalImages"].map((file) =>
          db
            .promise()
            .query(
              "INSERT INTO recipe_images (recipe_id, image) VALUES (?, ?)",
              [recipeId, `/uploads/${file.filename}`]
            )
        );
        await Promise.all(imagePromises);
      }

      res
        .status(201)
        .json({ id: recipeId, message: "Recipe added successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

// Get all recipes
exports.getAllRecipes = async (req, res) => {
  try {
    const [recipes] = await db.promise().query("SELECT * FROM recipes");

    const recipesWithImages = await Promise.all(
      recipes.map(async (recipe) => {
        const [images] = await db
          .promise()
          .query("SELECT image FROM recipe_images WHERE recipe_id = ?", [
            recipe.id,
          ]);
        return { ...recipe, additionalImages: images.map((img) => img.image) };
      })
    );

    res.status(200).json(recipesWithImages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a recipe with images
exports.getRecipeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[recipe]] = await db
      .promise()
      .query("SELECT * FROM recipes WHERE id = ?", [id]);

    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    const [images] = await db
      .promise()
      .query("SELECT image FROM recipe_images WHERE recipe_id = ?", [id]);

    res
      .status(200)
      .json({ ...recipe, additionalImages: images.map((img) => img.image) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a recipe
exports.updateRecipe = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const { id } = req.params;
      const {
        title,
        description,
        ingredients,
        price,
        category_id,
        subcategory_id,
      } = req.body;

      const mainImage = req.files["mainImage"]
        ? `/uploads/${req.files["mainImage"][0].filename}`
        : null;

      await db
        .promise()
        .query(
          "UPDATE recipes SET title = ?, description = ?, ingredients = ?, price = ?, category_id = ?, subcategory_id = ?, image = COALESCE(?, image) WHERE id = ?",
          [
            title,
            description,
            ingredients,
            price,
            category_id,
            subcategory_id,
            mainImage,
            id,
          ]
        );

      // Update additional images (if provided)
      if (req.files["additionalImages"]) {
        await db
          .promise()
          .query("DELETE FROM recipe_images WHERE recipe_id = ?", [id]);

        const imagePromises = req.files["additionalImages"].map((file) =>
          db
            .promise()
            .query(
              "INSERT INTO recipe_images (recipe_id, image) VALUES (?, ?)",
              [id, `/uploads/${file.filename}`]
            )
        );
        await Promise.all(imagePromises);
      }

      res.status(200).json({ message: "Recipe updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

// Delete a recipe
exports.deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete recipe images first
    await db
      .promise()
      .query("DELETE FROM recipe_images WHERE recipe_id = ?", [id]);

    // Delete the recipe itself
    const [result] = await db
      .promise()
      .query("DELETE FROM recipes WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    res.status(200).json({ message: "Recipe deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
