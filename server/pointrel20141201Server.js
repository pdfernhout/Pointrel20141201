// Test at: http://localhost:8080/pointrel20141201/
/*jslint node: true */
"use strict";

var version = "pointrel20141201-0.0.1";

// Standard nodejs modules
var fs = require('fs');
var http = require('http');

// The modules below require npm installation
var express = require('express');

var app = express();

var apiBaseURL = '/api/pointrel20141201';

/*
app.use("/$",   function(req, res) {
    res.redirect('/index.html');
});

app.use("/", express.static(__dirname + "/../WebContent"));
*/

app.use(apiBaseURL + '/status', function(request, response) {
    response.json({status: 'OK', version: version});
});

app.get(apiBaseURL + '/resources/:id', function (request, response){
    response.json({status: 'FAILED', content: 'UNFINISHED'});
});

app.post(apiBaseURL + '/resources', function (request, response){
    console.log("POST: ");
    console.log(request);
    
    var resource = {id: request.body.id};
    console.log(resource);

    return response.json({status: 'FAILED', content: 'UNFINISHED'});
  });

// Create an HTTP service.
var server = http.createServer(app).listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Pointrel20141201 app listening at http://%s:%s', host, port);
});


