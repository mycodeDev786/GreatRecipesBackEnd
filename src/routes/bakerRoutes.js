const express = require("express");
const router = express.Router();
const bakerController = require("../controllers/bakerController");

router.get("/all_bakers", bakerController.getAllBakers);
router.get("/:id", bakerController.getBakerById);
router.post("/", bakerController.createBaker);
router.put("/:id", bakerController.updateBaker);
router.delete("/:id", bakerController.deleteBaker);
router.post("/:user_id/profile-image", bakerController.updateProfileImage);

module.exports = router;
