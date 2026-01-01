const express = require("express");
const router = express.Router();

// Placeholder routes for future NSE scraper integration
router.get("/price/:symbol", (req, res) => {
  res.json({ message: "Price API will be implemented via NSE scraping" });
});

router.get("/details/:symbol", (req, res) => {
  res.json({ message: "Details API will be implemented via NSE scraping" });
});

module.exports = router;
