const db = require("../config/db");

// Follow a baker
exports.followBaker = async (req, res) => {
  try {
    const { baker_id, follower_id } = req.body;

    if (!baker_id || !follower_id) {
      return res
        .status(400)
        .json({ error: "baker_id and follower_id are required" });
    }

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO followers (baker_id, follower_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        [baker_id, follower_id]
      );

    res
      .status(201)
      .json({ id: result.insertId, message: "Followed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get followers of a baker
exports.getFollowers = async (req, res) => {
  try {
    const { baker_id } = req.params;

    const [rows] = await db
      .promise()
      .query("SELECT * FROM followers WHERE baker_id = ?", [baker_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No followers found" });
    }

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unfollow a baker
exports.unfollowBaker = async (req, res) => {
  try {
    const { baker_id, follower_id } = req.body;

    if (!baker_id || !follower_id) {
      return res
        .status(400)
        .json({ error: "baker_id and follower_id are required" });
    }

    const [result] = await db
      .promise()
      .query("DELETE FROM followers WHERE baker_id = ? AND follower_id = ?", [
        baker_id,
        follower_id,
      ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Follower not found" });
    }

    res.json({ message: "Unfollowed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get the number of followers of a baker by user_id
exports.getFollowerCountByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await db.promise().query(
      `SELECT COUNT(*) AS followerCount 
       FROM followers 
       INNER JOIN bakers ON followers.baker_id = bakers.id 
       WHERE bakers.user_id = ?`,
      [user_id]
    );

    res.json({ user_id, followerCount: rows[0].followerCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check if a user follows a baker
exports.isFollowing = async (req, res) => {
  try {
    const { baker_id, follower_id } = req.params;

    if (!baker_id || !follower_id) {
      return res
        .status(400)
        .json({ error: "baker_id and follower_id are required" });
    }

    const [rows] = await db
      .promise()
      .query("SELECT * FROM followers WHERE baker_id = ? AND follower_id = ?", [
        baker_id,
        follower_id,
      ]);

    if (rows.length > 0) {
      return res.json({ isFollowing: true });
    } else {
      return res.json({ isFollowing: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
