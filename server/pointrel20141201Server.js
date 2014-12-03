// Test at: http://localhost:8080/pointrel20141201/
/*jslint node: true */
"use strict";

// Standard nodejs modules
var http = require('http');

// The modules below require npm installation
var express = require('express');

var app = express();

// Pointrel support modules
var pointrel20141201ServerSupport = require("./pointrel20141201ServerSupport");
    
/*
app.use("/$",   function(req, res) {
    res.redirect('/index.html');
});

*/

// For testing only...
app.use("/test", express.static(__dirname + "/../test"));

pointrel20141201ServerSupport.initialize(app);

// Create an HTTP service.
var server = http.createServer(app).listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Pointrel20141201 server app listening at http://%s:%s', host, port);
});


