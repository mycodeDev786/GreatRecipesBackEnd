const express = require("express");
const router = express.Router();
const { interpretIngredient } = require("../services/openaiService");
const densityTable = require("../data/densityTable.json");

router.post("/", async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: "Input is required" });

  try {
    const parsed = await interpretIngredient(input);

    const { amount, unit, ingredient, note } = parsed;

    const densityInfo = densityTable[ingredient.toLowerCase()];
    if (!densityInfo || !densityInfo[unit]) {
      return res
        .status(404)
        .json({ error: "Ingredient/unit not found in density table" });
    }

    let grams = amount * densityInfo[unit];
    if (note && note.toLowerCase().includes("heaped")) {
      grams *= 1.3; // 30% more for heaped
    }

    res.json({
      input,
      parsed,
      result: `${input} ≈ ${grams.toFixed(1)} grams`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
