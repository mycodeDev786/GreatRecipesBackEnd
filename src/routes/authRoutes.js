const express = require("express");
const router = express.Router();

const getDb = require("../config/db");
const db = getDb();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// ✅ Multer Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// 🔹 User Signup (Now Uses UUID & isVerified)
router.post("/signup", async (req, res) => {
  const { name, email, password, country, userType } = req.body;

  if (!name || !email || !password || !country || !userType) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Check if user already exists
  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (result.length > 0)
        return res.status(400).json({ error: "Email already exists" });

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4(); // Generate UUID
      const isVerified = false; // Default: Not verified

      // Insert new user
      db.query(
        "INSERT INTO users (id, name, email, password, country, userType, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [userId, name, email, hashedPassword, country, userType, isVerified],
        (err, result) => {
          if (err) return res.status(500).json({ error: "Database error" });

          // Generate JWT Token
          const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
            expiresIn: "1d",
          });

          res.json({ message: "Signup successful", token, userId });
        }
      );
    }
  );
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // Check if user exists
  db.query(
    "SELECT id, email, userType, password FROM users WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (result.length === 0)
        return res.status(400).json({ error: "Invalid email or password" });

      const user = result[0];

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      // Generate JWT Token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      // Remove password before sending response
      delete user.password;

      res.json({
        message: "Signin successful",
        token,
        user, // Returning the user object without the password
      });
    }
  );
});
// 🔹 Function to generate a 6-digit OTP
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// 🔹 Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email password
  },
});

// 🔹 Generate OTP & Send Email
router.post("/generate-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 mins

    // Store OTP in the database
    const query =
      "INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp=?, expires_at=?";
    db.query(query, [email, otp, expiresAt, otp, expiresAt], (err) => {
      if (err) return res.status(500).json({ error: "Database error" });

      // Send OTP via email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
      };

      transporter.sendMail(mailOptions, (error) => {
        if (error)
          return res.status(500).json({ error: "Failed to send OTP email." });
        res.status(200).json({ message: "OTP sent successfully!" });
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 🔹 Verify OTP & Update User Status
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ error: "Email and OTP are required." });

  try {
    // Fetch OTP from database
    const query =
      "SELECT otp, expires_at FROM otp_verifications WHERE email = ?";
    db.query(query, [email], (err, results) => {
      if (err) return res.status(500).json({ error: "Database error." });
      if (results.length === 0)
        return res
          .status(400)
          .json({ error: "OTP not found. Request a new one." });

      const storedOTP = results[0].otp;
      const expiresAt = new Date(results[0].expires_at);

      // Check OTP expiration
      if (expiresAt < new Date())
        return res
          .status(400)
          .json({ error: "OTP has expired. Request a new one." });

      // Verify OTP
      if (storedOTP !== otp)
        return res
          .status(400)
          .json({ error: "Invalid OTP. Please try again." });

      // OTP is valid → Delete OTP from database & Mark user as verified
      const deleteQuery = "DELETE FROM otp_verifications WHERE email = ?";
      db.query(deleteQuery, [email], (deleteErr) => {
        if (deleteErr)
          return res.status(500).json({ error: "Failed to delete OTP." });

        // Update `isVerified` status in users table
        db.query(
          "UPDATE users SET isVerified = TRUE WHERE email = ?",
          [email],
          (updateErr, updateResult) => {
            if (updateErr)
              return res
                .status(500)
                .json({ error: "Failed to update verification status." });
            if (updateResult.affectedRows === 0)
              return res.status(400).json({ error: "User not found." });

            res.status(200).json({
              message: "OTP verified successfully. Email is now verified!",
            });
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/check-verification", async (req, res) => {
  const { email } = req.query; // Get email from query params

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Check if the user exists and retrieve verification status
  db.query(
    "SELECT isVerified FROM users WHERE email = ?",
    [email],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const { isVerified } = result[0];
      res.json({ email, isVerified });
    }
  );
});

// ✅ API to Handle Form Submission (ID Card & Selfie Upload)
router.post(
  "/verify",
  upload.fields([{ name: "idCard" }, { name: "selfie" }]),
  (req, res) => {
    const {
      user_id, // Added user_id
      fullName,
      email,
      country,
      phone,
      address,
      bankName,
      bankAccount,
    } = req.body;

    const idCardPath = req.files["idCard"] ? req.files["idCard"][0].path : null;
    const selfiePath = req.files["selfie"] ? req.files["selfie"][0].path : null;

    if (
      !user_id || // Ensuring user_id is provided
      !fullName ||
      !email ||
      !country ||
      !phone ||
      !address ||
      !bankName ||
      !bankAccount ||
      !idCardPath ||
      !selfiePath
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const sql = `INSERT INTO verification (user_id, fullName, email,  country, phone, address, bankName, bankAccount, idCard, selfie) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(
      sql,
      [
        user_id, // Passing user_id to the query
        fullName,
        email,
        country,
        phone,
        address,
        bankName,
        bankAccount,
        idCardPath,
        selfiePath,
      ],
      (err, result) => {
        if (err) {
          console.error("❌ Database Error:", err);
          return res.status(500).json({ error: "Database insertion failed." });
        }

        res.status(201).json({
          message: "✅ Verification data saved successfully!",
          id: result.insertId,
        });
      }
    );
  }
);

// Route to get all verification records
router.get("/verifications", (req, res) => {
  const sql = "SELECT * FROM verification";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Database Error:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch verification data." });
    }

    // Format the image paths without adding BASE_URL
    const formattedResults = results.map((record) => ({
      ...record,
      idCard: record.idCard ? `/${record.idCard.replace(/\\/g, "/")}` : null,
      selfie: record.selfie ? `/${record.selfie.replace(/\\/g, "/")}` : null,
    }));

    res.status(200).json({ verifications: formattedResults });
  });
});

// Route to get verification status of a specific user
router.get("/verification-status/:user_id", (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required." });
  }

  const sql = "SELECT status FROM verification WHERE user_id = ?";

  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error("❌ Database Error:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch verification status." });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "Verification record not found." });
    }

    res.status(200).json({ status: results[0].status });
  });
});

router.put("/update-verification-status", (req, res) => {
  const { user_id, status } = req.body;

  // Ensure required data is provided
  if (!user_id || !["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid user ID or status." });
  }

  const sql = "UPDATE verification SET status = ? WHERE user_id = ?";

  db.query(sql, [status, user_id], (err, result) => {
    if (err) {
      console.error("❌ Database Error:", err);
      return res
        .status(500)
        .json({ error: "Failed to update verification status." });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Verification record not found." });
    }

    res
      .status(200)
      .json({ message: `✅ Verification status updated to '${status}'.` });
  });
});

router.put("/update-user-verification", (req, res) => {
  const { id, isVerified } = req.body;

  // Ensure required data is provided
  if (!id || typeof isVerified !== "boolean") {
    return res
      .status(400)
      .json({ error: "Invalid user ID or verification status." });
  }

  const sql = "UPDATE users SET isVerified = ? WHERE id = ?";

  db.query(sql, [isVerified, id], (err, result) => {
    if (err) {
      console.error("❌ Database Error:", err);
      return res
        .status(500)
        .json({ error: "Failed to update verification status." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res
      .status(200)
      .json({ message: "✅ Verification status updated successfully." });
  });
});
module.exports = router;
