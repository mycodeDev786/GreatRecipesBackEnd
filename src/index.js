require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const recipesRoutes = require("./routes/recipes");
const reviewsRoutes = require("./routes/reviews");
const bakerRoutes = require("./routes/bakerRoutes");
const followersRoutes = require("./routes/followersRoutes");

const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/62.72.31.214/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/62.72.31.214/fullchain.pem",
  "utf8"
);

const app = express();
app.use(express.json());
app.use(cors());
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});
app.use("/users", userRoutes);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/categories", categoryRoutes);
app.use("/api/recipes", recipesRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/bakers", bakerRoutes);
app.use("/api/followers", followersRoutes);

app.use("/uploads", express.static("uploads"));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
