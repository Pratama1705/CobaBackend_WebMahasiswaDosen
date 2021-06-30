const mongoose = require("mongoose");

const addMatkulSchema = mongoose.Schema({
    _id : String,
    namaMatkul : String,
    namaDosen : String
});

module.exports = mongoose.model("AddMatkul", addMatkulSchema);