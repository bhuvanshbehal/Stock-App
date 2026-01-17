const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminHealth.controller");

/**
 * Market data health endpoint
 */
router.get("/health/market", controller.getMarketHealth);

module.exports = router;
