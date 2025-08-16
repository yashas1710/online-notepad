const express = require("express");
const connectDB = require("./db");
const app = express();
const PORT = 5000;

connectDB();

app.use(express.json());

// Add routes here

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
