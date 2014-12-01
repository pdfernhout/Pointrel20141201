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

function sanitizeFileName(fileName) {
    return fileName.replace(/\s/g, "_").replace(/\.[\.]+/g, "_").replace(/[^\w_\.\-]/g, "_");
}

// TODO: use nested directories so can support lots of files better

app.get(apiBaseURL + '/resources/:id', function (request, response) {
    // Sanitizes resource ID to prevent reading arbitrary files
    var sha256AndLength = sanitizeFileName(request.params.id);
    
    // TODO: Make asynchronous
    var contentBuffer;
    try{
      contentBuffer = fs.readFileSync("../server-data/" + sha256AndLength + ".pce");
    } catch (error) {
        // TODO: Should check what sort of error and respond accordingly
        response.status(404)  // HTTP status 404: NotFound
        .send('Not found: ' + error);
        // return response.json({status: 'FAILED', message: 'Some sort of exception when reading: ' + error, sha256: sha256AndLength});
    }

    // TODO: Probably can send buffer or file directly?
    var content = contentBuffer.toString('utf8');
    // response.json(content);
    response.setHeader('Content-Type', 'application/json');
    response.send(content);
});

app.post(apiBaseURL + '/resources/:id', function (request, response) {
    console.log("======================= POST: ", request.url);
    
    var sha256 = request.sha256;
    console.log("sha256:", sha256);
    
    var resource = {id: request.body.id, sha256: sha256};
    console.log(resource);
    
    var length = request.rawBodyBuffer.length;
    
    // Probably should validate content as utf8 and valid JSON and so on...
    
    var sha256AndLength = sha256 + "_" + length;
    // TODO: Make asynchronous
    try {
      fs.writeFileSync("../server-data/" + sha256AndLength + ".pce", request.rawBodyBuffer);
    } catch (error) {
        // TODO: Should check what sort of error and respond accordingly
        response.status(500)  // HTTP status 500: Server error
        .send('Server error: ' + error);
        // return response.json({status: 'FAILED', message: 'Some sort of exception when writing: ' + error, sha256: sha256});
    }
    
    // TODO: Indexing...
    
    return response.json({status: 'OK', message: 'Wrote content', sha256AndLength: sha256AndLength});
  });

// Create an HTTP service.
var server = http.createServer(app).listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Pointrel20141201 app listening at http://%s:%s', host, port);
});


