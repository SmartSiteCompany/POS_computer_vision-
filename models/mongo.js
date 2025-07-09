const mongoose = require("mongoose");

async function conectMongo() {
    try {
        await mongoose.connect("mongodb://localhost:27017/faceDB", {
        });
        console.log ("  Conectado a la base mongo");
    } catch (err) {
        console.error("Error al conectar a la base de datos", err);
    }
}

module.exports = conectMongo;