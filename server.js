// Cargar variables de entorno
const env = require("dotenv");
env.config();

// Dependencias
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const routes = require("./routes");
const conectMongo = require("./models/mongo");

// Inicializar app
const app = express();

// Conectar a MongoDB
conectMongo();

// Variables de entorno
const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

// Verificar que las variables existen
if (!SESSION_SECRET || !MONGO_URI) {
  throw new Error("Faltan SESSION_SECRET o MONGO_URI en el archivo .env");
}

// Middleware base
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public"))); // Servir HTML, JS, CSS, etc.

// Configuración de sesión
app.use(session({
  name: "ssc.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    ttl: 60 * 15, // 15 minutos
  }),
  cookie: {
    maxAge: 1000 * 60 * 15,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
}));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.use("/", routes);


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


