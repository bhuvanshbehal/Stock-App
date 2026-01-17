const express = require("express");
const router = express.Router();
const controller = require("../controllers/prices.controller");

/**
 * Latest price for a single stock
 */
router.get("/stocks/:symbol/latest", controller.getLatest);

/**
 * Historical prices for a stock
 */
router.get("/stocks/:symbol/prices", controller.getHistory);

/**
 * Market-wide latest prices for an exchange
 */
router.get("/markets/:exchange/latest", controller.getMarketLatest);

module.exports = router;
