require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRoutes = require("./routes/userRoutes");

const app = express();
app.use(express.json());
app.use(cors());
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});
app.use("/users", userRoutes);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/uploads", express.static("uploads"));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
