const mongoose = require("mongoose");

const CajeroSchema = new mongoose.Schema({
    encoding: {
        type: [Number],
        required: true, 
    },
    createdAt: {
        type: Date,
        default: Date.now, 
    },
});

module.exports = mongoose.model("Cajero", CajeroSchema);