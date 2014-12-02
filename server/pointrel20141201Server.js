// Test at: http://localhost:8080/pointrel20141201/
/*jslint node: true */
"use strict";

var version = "pointrel20141201-0.0.1";
var serverDataDirectory = "../server-data/";

// Standard nodejs modules
var fs = require('fs');
var http = require('http');
var crypto = require('crypto');

// The modules below require npm installation
var express = require('express');
var bodyParser = require('body-parser');

var app = express();

var apiBaseURL = '/api/pointrel20141201';

// Maps id to sha256AndLength, singular
var idIndex = {};

// Maps tags to sha256AndLength, array
var tagIndex = {};

//Maps contentType to sha256AndLength, array
var contentTypeIndex = {};

function addToIndex(indexType, index, key, itemReference) {
    // console.log("addToIndex", indexType, index, key, itemReference);
    var itemsForKey = index[key];
    if (!itemsForKey) {
        itemsForKey = [];
        index[key] = itemsForKey;
    }
    itemsForKey.push(itemReference);
}

function addToIndexes(body, sha256AndLength) {
    var id = body.id;
    var tags = body.tags;
    var contentType = body.contentType;
    
    if (id) {
        if (idIndex[id]) {
            // Already indexed this item
            if (idIndex[id] !== sha256AndLength) {
                console.log("Already indexed " + sha256AndLength);
                return;
            }
            console.log("ERROR: duplicate reference to ID in %s and %s", idIndex[id], sha256AndLength);
        }
        // idIndex[id] = sha256AndLength;
        addToIndex("id", idIndex, "" + id, sha256AndLength);
    }
    if (tags) {
        for (var tagKey in tags) {
            var tag = tags[tagKey];
            addToIndex("tags", tagIndex, "" + tag, sha256AndLength);
        }
    }
    if (contentType) {
        addToIndex("contentType", contentTypeIndex, "" + contentType, sha256AndLength);
    }
}

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

function returnResource(sha256AndLength, response) {
    // TODO: Make asynchronous
    var contentBuffer;
    try {
      contentBuffer = fs.readFileSync(serverDataDirectory + sha256AndLength + ".pce");
    } catch (error) {
        // TODO: Should check what sort of error and respond accordingly
        response.status(404)  // HTTP status 404: NotFound
        .send('Not found: ' + error);
        // response.json({status: 'FAILED', message: 'Some sort of exception when reading: ' + error, sha256: sha256AndLength});
        return;
    }

    // TODO: Probably can send buffer or file directly?
    var content = contentBuffer.toString('utf8');
    // response.json(content);
    response.setHeader('Content-Type', 'application/json');
    response.send(content);
}

app.get(apiBaseURL + '/resources/:sha256AndLength', function (request, response) {
    // Sanitizes resource ID to prevent reading arbitrary files
    var sha256AndLength = sanitizeFileName(request.params.sha256AndLength);
    
    console.log("==== GET by sha256AndLength", request.url);
    returnResource(sha256AndLength, response);
});

app.post(apiBaseURL + '/resources/:sha256AndLength', function (request, response) {
    // console.log("POST", request.url, request.body);
    var sha256 = request.sha256;
    // console.log("sha256:", sha256);
    
    if (!request.rawBodyBuffer) {
        response.status(406)  // HTTP status 406: Not acceptable
        .send('{error: "Not acceptable: post is missing JSON Content-Type body"}');
        return;
    }
    
    var length = request.rawBodyBuffer.length;
    
    // Probably should validate content as utf8 and valid JSON and so on...
    
    var sha256AndLength = sha256 + "_" + length;
    console.log("==== POST: ", request.url, sha256AndLength);
    
    if (sha256AndLength !== request.params.sha256AndLength) {
        response.status(406)  // HTTP status 406: Not acceptable
        .send('{error: "Not acceptable: sha256AndLength of content does not match that of request url"}');
        return;
    }

    // TODO: Make asynchronous
    try {
      fs.writeFileSync(serverDataDirectory + sha256AndLength + ".pce", request.rawBodyBuffer);
    } catch (error) {
        // TODO: Should check what sort of error and respond accordingly
        response.status(500)  // HTTP status 500: Server error
        .send('{error: "Server error: ' + error + '"}');
        // response.json({status: 'FAILED', message: 'Some sort of exception when writing: ' + error, sha256: sha256});
        return;
    }
    
    // TODO: Maybe reject new resource if the ID already exists?
    addToIndexes(request.body, sha256AndLength);
    
    return response.json({status: 'OK', message: 'Wrote content', sha256AndLength: sha256AndLength});
});

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function reindexAllResources() {
    console.log("reindexAllResources");
    idIndex = {};
    tagIndex = {};
    contentTypeIndex = {};
    
    var fileNames = fs.readdirSync(serverDataDirectory);
    // console.log("fileNames", fileNames);
    for (var fileNameIndex in fileNames) {
        var fileName = fileNames[fileNameIndex];
        if (endsWith(fileName, ".pce")) {
            console.log("Indexing: ", fileName);
            var resourceContent = fs.readFileSync(serverDataDirectory + fileName).toString("utf8");
            var resourceObject = JSON.parse(resourceContent);
            // console.log("resourceObject", resourceObject);
            addToIndexes(resourceObject, fileName.substring(0, fileName.length-4));
        } 
    }
}

reindexAllResources();

console.log("id index", idIndex);
console.log("tag index", tagIndex);
console.log("contentType index", contentTypeIndex);

// Create an HTTP service.
var server = http.createServer(app).listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Pointrel20141201 app listening at http://%s:%s', host, port);
});


