const express = require("express");
const app = express();
const routes = require("./routes");
const path = require("path");
const db = require('./models/db');
const conectMongo = require('./models/mongo');

app.use(express.static("public"));
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public"))); // Servir HTML, JS, etc.
app.use(express.static(path.join(__dirname, "public")));

app.use("/", routes);

conectMongo();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});