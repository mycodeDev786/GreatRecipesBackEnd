const axios = require("axios");
require("dotenv").config();

const promptTemplate = (input) => `
Extract the ingredient, amount, and unit from the following:
"${input}"
Return only in this JSON format:
{
  "amount": float,
  "unit": "tsp/tbsp/cup/gram/oz/etc",
  "ingredient": string,
  "note": "optional"
}
`;

async function interpretIngredient(input) {
  const prompt = promptTemplate(input);

  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo", // or "gpt-4"
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const text = res.data.choices[0].message.content;

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error("Invalid JSON response from AI");
  }
}

module.exports = { interpretIngredient };
