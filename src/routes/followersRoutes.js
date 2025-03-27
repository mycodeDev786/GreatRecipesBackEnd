const express = require("express");
const router = express.Router();
const followersController = require("../controllers/followersController");

router.post("/follow", followersController.followBaker);
router.get("/followers/:baker_id", followersController.getFollowers);
router.post("/unfollow", followersController.unfollowBaker);
router.get(
  "/count/by-user/:user_id",
  followersController.getFollowerCountByUserId
);
router.get(
  "/is-following/:baker_id/:follower_id",
  followersController.isFollowing
);

module.exports = router;
