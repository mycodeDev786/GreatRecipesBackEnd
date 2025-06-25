const getDb = require("../config/db");
const db = getDb();
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
  { name: "stepImages", maxCount: 25 },
  { name: "fullVideo", maxCount: 1 },
]);

// Create a new recipe with steps, images, and optional video
exports.createRecipe = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const {
        user_id,
        category_name,
        subcategory_name,
        title,
        description,
        ingredients,
        combinedIngredients,
        avoid_tips,
        steps, // JSON string
        recipe_type,
        price,
        buyer_restriction,
        difficulty_level,
      } = req.body;

      if (
        !user_id ||
        !category_name ||
        !subcategory_name ||
        !title ||
        !description ||
        !steps ||
        !avoid_tips ||
        !ingredients ||
        !combinedIngredients ||
        !buyer_restriction
      ) {
        return res.status(400).json({ message: "Required fields are missing" });
      }

      const mainImage = req.files["mainImage"]
        ? `/uploads/${req.files["mainImage"][0].filename}`
        : null;

      const fullVideo = req.files["fullVideo"]
        ? `/uploads/${req.files["fullVideo"][0].filename}`
        : null;

      // Insert into recipes
      const [result] = await db.promise().query(
        `INSERT INTO recipes 
           (user_id, category_name, subcategory_name, title, description, ingredients, combinedIngredients, steps, avoid_tips, mainImage, recipe_type, price, buyer_restriction, difficulty_level, fullVideo, average_rating, ratings_count) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          category_name,
          subcategory_name,
          title,
          description,
          ingredients,
          combinedIngredients,
          steps,
          avoid_tips,
          mainImage,
          recipe_type,
          price || 0,
          buyer_restriction,
          difficulty_level || null,
          fullVideo,
          0,
          0,
        ]
      );

      const recipeId = result.insertId;

      // Store step-by-step data
      const parsedSteps = JSON.parse(steps); // Array of { text: "...", imageIndex: 0 }
      const stepImageFiles = req.files["stepImages"] || [];

      const stepPromises = parsedSteps.map((step, index) => {
        const stepImage = stepImageFiles[index]
          ? `/uploads/${stepImageFiles[index].filename}`
          : null;

        return db
          .promise()
          .query(
            "INSERT INTO recipe_steps (recipe_id, step_number, text, image) VALUES (?, ?, ?, ?)",
            [recipeId, index + 1, step.text, stepImage]
          );
      });

      await Promise.all(stepPromises);

      // Store additional images
      if (req.files["additionalImages"]) {
        const imagePromises = req.files["additionalImages"].map((file) =>
          db
            .promise()
            .query(
              "INSERT INTO recipe_photos (recipe_id, image) VALUES (?, ?)",
              [recipeId, `/uploads/${file.filename}`]
            )
        );
        await Promise.all(imagePromises);
      }

      res.status(201).json({
        id: recipeId,
        message: "Recipe added successfully",
      });
    } catch (error) {
      console.error("Error adding recipe:", error);
      res.status(500).json({ error: error.message });
    }
  });
};

// Get all recipes
exports.getAllRecipes = async (req, res) => {
  try {
    // Sort recipes by created_at in descending order (latest first)
    const [recipes] = await db
      .promise()
      .query("SELECT * FROM recipes ORDER BY created_at DESC");

    const recipesWithImages = await Promise.all(
      recipes.map(async (recipe) => {
        const [images] = await db
          .promise()
          .query("SELECT image FROM recipe_photos WHERE recipe_id = ?", [
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
exports.getRecipesByUserId = async (req, res) => {
  try {
    const { id } = req.params; // Get user ID from params

    // Fetch all recipes for the given user ID
    const [recipes] = await db
      .promise()
      .query("SELECT * FROM recipes WHERE user_id = ?", [id]);

    if (recipes.length === 0) {
      return res
        .status(404)
        .json({ message: "No recipes found for this user" });
    }

    // Fetch images for each recipe
    for (const recipe of recipes) {
      const [images] = await db
        .promise()
        .query("SELECT image FROM recipe_photos WHERE recipe_id = ?", [
          recipe.id,
        ]);

      recipe.additionalImages = images.map((img) => img.image);
    }

    res.status(200).json(recipes);
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
          .query("DELETE FROM recipe_photos WHERE recipe_id = ?", [id]);

        const imagePromises = req.files["additionalImages"].map((file) =>
          db
            .promise()
            .query(
              "INSERT INTO recipe_photos (recipe_id, image) VALUES (?, ?)",
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

exports.updateRecipeCategory = async (req, res) => {
  try {
    const { recipe_id, category_name, subcategory_name } = req.body;

    if (!recipe_id || !category_name || !subcategory_name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [result] = await db
      .promise()
      .query(
        "UPDATE recipes SET category_name = ?, subcategory_name = ? WHERE id = ?",
        [category_name, subcategory_name, recipe_id]
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    res.status(200).json({ message: "Recipe category updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllRecipesPost = async (req, res) => {
  try {
    const query = `
    SELECT 
      r.id, 
      r.user_id, 
      r.title, 
      r.description, 
      r.ingredients, 
      r.mainImage AS image, 
      r.recipe_type, 
      r.price, 
      r.category_name, 
      r.subcategory_name, 
      r.created_at AS date, 
      r.average_rating AS rating, 
      r.ratings_count,
      b.user_id AS bakerId,
      b.profile_image AS profileImage,
      b.country AS bakerCountry,
      b.flag AS bakerFlag,
      b.isTop10Sales,
      b.isTop10Followers,
      b.rating AS bakerRating,
      b.score AS bakerScore,
      b.created_at AS bakerCreatedAt,
      u.name AS bakerName,
      (SELECT COUNT(*) FROM followers f WHERE f.baker_id = r.user_id) AS followersCount
    FROM recipes r
    LEFT JOIN bakers b ON r.user_id = b.user_id
    LEFT JOIN users u ON b.user_id = u.id
    GROUP BY r.id, b.user_id, b.profile_image, b.country, b.flag, b.isTop10Sales, 
             b.isTop10Followers, b.rating, b.score, b.created_at, u.name;
  `;

    const [results] = await db.promise().query(query);

    console.log("Query Results:", results);
    res.json(results);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database query error" });
  }
};

exports.getRecipeById = async (req, res) => {
  const recipeId = req.params.id;

  try {
    const query = `
      SELECT 
        r.id, 
        r.user_id, 
        r.title, 
        r.description, 
        r.ingredients, 
        r.recipe_type, 
        r.price, 
        r.category_name, 
        r.subcategory_name, 
        r.created_at AS date, 
        r.average_rating AS rating, 
        r.ratings_count,
        b.user_id AS bakerId,
        b.profile_image AS profileImage,
        b.country AS bakerCountry,
        b.flag AS bakerFlag,
        b.isTop10Sales,
        b.isTop10Followers,
        b.rating AS bakerRating,
        b.score AS bakerScore,
        b.created_at AS bakerCreatedAt,
        u.name AS bakerName,
        (SELECT COUNT(*) FROM followers f WHERE f.baker_id = r.user_id) AS followersCount,
        (
          SELECT JSON_ARRAYAGG(rp.image)
          FROM recipe_photos rp
          WHERE rp.recipe_id = r.id
        ) AS allImages
      FROM recipes r
      LEFT JOIN bakers b ON r.user_id = b.user_id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE r.id = ?
      GROUP BY r.id, b.user_id, b.profile_image, b.country, b.flag, b.isTop10Sales, 
               b.isTop10Followers, b.rating, b.score, b.created_at, u.name;
    `;

    const [results] = await db.promise().query(query, [recipeId]);

    if (results.length === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.json(results[0]);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database query error" });
  }
};
