const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Stock routes
const stockRoutes = require('./routes/stocks');
app.use('/api/stocks', stockRoutes);

app.get('/', (req, res) => res.send('Stock App Backend Running!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
