const env = require("dotenv");
env.config();

const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const routes = require("./routes");
const conectMongo = require('./models/mongo');

const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGO_URI = process.env.MONGO_URI;


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "registerCajero.html"));
});

conectMongo();

app.use(express.static("public"));
app.use(express.json({ limit: "10mb" }));

// Configuración de sesión
app.use(session({
  name: 'ssc.sid',                   // opcional: nombre de cookie más claro
  secret: SESSION_SECRET,            // viene del .env
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,              // viene del .env
    ttl: 60 * 15                      // TTL en segundos (15 minutos)
  }),
  cookie: {
    maxAge: 1000 * 60 * 15,           // 15 minutos en milisegundos
    httpOnly: true,                   // no accesible por JS en el navegador
    secure: process.env.NODE_ENV === 'production', // solo HTTPS en prod
    sameSite: 'lax'
  }
}));


app.use("/", routes);

app.use(express.static(path.join(__dirname, "public"))); // Servir HTML, JS, etc.
app.use(express.static(path.join(__dirname, "public")));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});