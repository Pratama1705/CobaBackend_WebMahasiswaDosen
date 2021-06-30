const mongoose = require("mongoose");

const dosenSchema = mongoose.Schema({
    _id : mongoose.Schema.Types.ObjectId,
    email : String,
    firstName : String,
    lastName : String,
    password : String,
    confirmPassword : String,
    mataKuliah : Array
});

module.exports = mongoose.model("Dosen", dosenSchema);