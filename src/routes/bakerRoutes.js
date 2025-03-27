const express = require("express");
const router = express.Router();
const bakerController = require("../controllers/bakerController");

router.get("/", bakerController.getAllBakers);
router.get("/:id", bakerController.getBakerById);
router.post("/", bakerController.createBaker);
router.put("/:id", bakerController.updateBaker);
router.delete("/:id", bakerController.deleteBaker);

module.exports = router;
