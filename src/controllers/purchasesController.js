// controllers/purchasesController.js
const db = require("../config/db"); // your MySQL connection (e.g., mysql2 or mysql)

exports.buyRecipe = (req, res) => {
  const buyerId = req.user.id; // from your auth middleware
  const recipeId = req.params.recipeId;

  const getRecipeQuery = "SELECT * FROM recipes WHERE id = ?";
  db.query(getRecipeQuery, [recipeId], (err, recipeResults) => {
    if (err) return res.status(500).json({ message: "Error fetching recipe" });
    if (recipeResults.length === 0)
      return res.status(404).json({ message: "Recipe not found" });

    const recipe = recipeResults[0];
    if (recipe.recipe_type === "free") {
      return res.status(400).json({ message: "This recipe is free." });
    }

    const checkPurchaseQuery =
      "SELECT * FROM purchases WHERE recipe_id = ? AND buyer_id = ?";
    db.query(
      checkPurchaseQuery,
      [recipeId, buyerId],
      (err, purchaseResults) => {
        if (err)
          return res.status(500).json({ message: "Error checking purchase" });
        if (purchaseResults.length > 0) {
          return res.status(400).json({ message: "Already purchased" });
        }

        const insertQuery = `
        INSERT INTO purchases (recipe_id, buyer_id, seller_id, price)
        VALUES (?, ?, ?, ?)
      `;
        db.query(
          insertQuery,
          [recipeId, buyerId, recipe.user_id, recipe.price],
          (err, result) => {
            if (err)
              return res.status(500).json({ message: "Error saving purchase" });

            res.status(201).json({ message: "Recipe purchased successfully" });
          }
        );
      }
    );
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
