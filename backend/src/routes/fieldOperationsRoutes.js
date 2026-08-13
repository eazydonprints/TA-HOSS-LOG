const express = require("express");
const router = express.Router();
const controller = require("../controllers/fieldOperationsController");
let protect;
try {
  protect = require("../middleware/authMiddleware").protect;
} catch (error) {
  protect = require("../middleware/auth").protect;
}
if (typeof protect !== "function") throw new Error("A protect authentication middleware is required for field operations routes.");

router.get("/summary", protect, controller.summary);
router.get("/officers", protect, controller.officers);
router.get("/", protect, controller.list);
router.post("/", protect, controller.create);
router.patch("/:id", protect, controller.update);
router.post("/:id/start", protect, controller.start);
router.post("/:id/complete", protect, controller.complete);

module.exports = router;