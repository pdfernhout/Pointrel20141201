// Test at: http://localhost:8080/test
/*jslint node: true */
"use strict";

// Standard nodejs modules
var http = require('http');

// The modules below require npm installation
var express = require('express');

var app = express();

// Pointrel support modules
var pointrel20141201Server = require("./pointrel20141201Server");
    
/*
app.use("/$",   function(req, res) {
    res.redirect('/index.html');
});

*/

// For testing only...
app.use("/test", express.static(__dirname + "/../test"));
app.use("/", express.static(__dirname + "/../WebContent"));

pointrel20141201Server.initialize(app);

// Create an HTTP service.
var server = http.createServer(app).listen(8000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Pointrel20141201 server app listening at http://%s:%s', host, port);
});


