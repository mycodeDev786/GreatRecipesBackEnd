// controllers/purchasesController.js

const getDb = require("../config/db");
const db = getDb();
// your MySQL connection (e.g., mysql2 or mysql)

exports.buyRecipes = async (req, res) => {
  const buyerId = req.body.userId;
  const recipeIds = req.body.recipeIds;

  if (!buyerId) return res.status(401).json({ message: "Unauthorized" });
  if (!Array.isArray(recipeIds) || recipeIds.length === 0)
    return res.status(400).json({ message: "No recipe IDs provided." });

  const results = [];

  const processRecipe = (recipeId) =>
    new Promise((resolve) => {
      const getRecipeQuery = "SELECT * FROM recipes WHERE id = ?";
      db.query(getRecipeQuery, [recipeId], (err, recipeResults) => {
        if (err) {
          results.push({ recipeId, status: "Error fetching recipe" });
          return resolve();
        }

        if (recipeResults.length === 0) {
          results.push({ recipeId, status: "Recipe not found" });
          return resolve();
        }

        const recipe = recipeResults[0];
        if (recipe.recipe_type === "free") {
          results.push({ recipeId, status: "Recipe is free" });
          return resolve();
        }

        const checkPurchaseQuery =
          "SELECT * FROM purchases WHERE recipe_id = ? AND buyer_id = ?";
        db.query(
          checkPurchaseQuery,
          [recipeId, buyerId],
          (err, purchaseResults) => {
            if (err) {
              results.push({ recipeId, status: "Error checking purchase" });
              return resolve();
            }

            if (purchaseResults.length > 0) {
              results.push({ recipeId, status: "Already purchased" });
              return resolve();
            }

            const insertQuery = `
            INSERT INTO purchases (recipe_id, buyer_id, seller_id, price)
            VALUES (?, ?, ?, ?)
          `;
            db.query(
              insertQuery,
              [recipeId, buyerId, recipe.user_id, recipe.price],
              (err) => {
                if (err) {
                  results.push({ recipeId, status: "Error saving purchase" });
                } else {
                  results.push({ recipeId, status: "Success" });
                }
                resolve();
              }
            );
          }
        );
      });
    });

  await Promise.all(recipeIds.map(processRecipe));

  res.status(200).json({
    message: "Processed recipes",
    processedRecipes: results,
  });
};

exports.getMyPurchases = (req, res) => {
  const buyerId = req.user.id;

  const query = `
    SELECT p.*, r.title, r.mainImage, r.recipe_type, r.price
    FROM purchases p
    JOIN recipes r ON p.recipe_id = r.id
    WHERE p.buyer_id = ?
    ORDER BY p.purchased_at DESC
  `;

  db.query(query, [buyerId], (err, results) => {
    if (err)
      return res.status(500).json({ message: "Error fetching purchases" });

    res.status(200).json({ purchases: results });
  });
};
