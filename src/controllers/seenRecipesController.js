const db = require("../config/db");

// Mark a recipe as seen by the user
exports.markRecipeAsSeen = async (req, res) => {
  const { userId, recipeId } = req.body;

  if (!userId || !recipeId) {
    return res
      .status(400)
      .json({ message: "userId and recipeId are required" });
  }

  try {
    await db
      .promise()
      .execute(
        "INSERT IGNORE INTO seen_recipes (user_id, recipe_id) VALUES (?, ?)",
        [userId, recipeId]
      );

    res.status(200).json({ message: "Recipe marked as seen" });
  } catch (error) {
    console.error("Error marking recipe as seen:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
