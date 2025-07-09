const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    encoding: {
        type: [Number],
        required: true, 
    },
    timestamp: {
        type: Date,
        default: Date.now, 
    },
});

module.exports = mongoose.model("User", UserSchema);