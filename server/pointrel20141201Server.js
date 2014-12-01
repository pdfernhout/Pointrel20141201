// Test at: http://localhost:8080/pointrel20141201/
/*jslint node: true */
"use strict";

var version = "pointrel20141201-0.0.1";

// Standard nodejs modules
var fs = require('fs');
var http = require('http');
var crypto = require('crypto');

// The modules below require npm installation
var express = require('express');
var bodyParser = require('body-parser');

var app = express();

var apiBaseURL = '/api/pointrel20141201';

/*
app.use("/$",   function(req, res) {
    res.redirect('/index.html');
});

*/

app.use(bodyParser.json({
    verify: function(request, result, buffer, encoding) {

        var hash = crypto.createHash('sha256');
        hash.update(buffer);
        request.sha256 = hash.digest('hex');
        // console.log("hash", request.sha256);
     
        request.rawBodyBuffer = buffer;
        // console.log("rawBodyBuffer", request.rawBodyBuffer);
    }
}));

// For testing only...
app.use("/test", express.static(__dirname + "/../test"));

app.use(apiBaseURL + '/status', function(request, response) {
    response.json({status: 'OK', version: version});
});

app.get(apiBaseURL + '/resources/:id', function (request, response){
    response.json({status: 'FAILED', content: 'UNFINISHED'});
});

app.post(apiBaseURL + '/resources/:id', function (request, response){
    console.log("======================= POST: ", request.url);
    console.log("sha256:", request.sha256);
    
    var resource = {id: request.body.id, sha256: request.sha256};
    console.log(resource);
    
    fs.writeFileSync("../server-data/test.txt", request.rawBodyBuffer);

    return response.json({status: 'OK', message: 'Wrote content', sha256: request.sha256});
  });

// Create an HTTP service.
var server = http.createServer(app).listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Pointrel20141201 app listening at http://%s:%s', host, port);
});


