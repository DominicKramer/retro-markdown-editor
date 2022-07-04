"use strict";
exports.__esModule = true;
var express_1 = require("express");
var app = (0, express_1["default"])();
var port = process.env.PORT || 8080;
app.get('/', function (req, res) {
    res.sendFile('webapp/build/index.html');
});
app.listen(port, function () {
    console.log("Listening on port ".concat(port));
});
