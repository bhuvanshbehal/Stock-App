const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const stockRoutes = require("./routes/stocks");
const priceRoutes = require("./routes/prices.routes");
const adminHealthRoutes = require("./routes/adminHealth.routes");

app.get("/", (req, res) => {
  res.send("Stock App Backend Running!");
});

app.use("/api/stocks", stockRoutes);
app.use("/api", priceRoutes);
app.use("/api/admin", adminHealthRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
