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

var indexes = {
     // Maps whether an item was added to the indexes (use to quickly tell if it exists)
     referenceToIsIndexed: {},   
        
     // Maps id to sha256AndLength, array (but should ideally only be one)
     idToReferences: {},

     // Maps tags to sha256AndLength, array
     tagToReferences: {},

     // Maps contentType to sha256AndLength, array
     contentTypeToReferences: {}       
};

function addToIndex(indexType, index, key, itemReference) {
    // console.log("addToIndex", indexType, index, key, itemReference);
    var itemsForKey = index[key];
    if (!itemsForKey) {
        itemsForKey = [];
        index[key] = itemsForKey;
    }
    itemsForKey.push(itemReference);
}

function referenceIsIndexed(reference) {
    return indexes.referenceToIsIndexed[reference] === true;
}

function addToIndexes(body, sha256AndLength) {
    var id = body.id;
    var tags = body.tags;
    var contentType = body.contentType;
    
    if (referenceIsIndexed[sha256AndLength]) {
        console.log("Already indexed " + sha256AndLength);
        return false;
    }
    
    indexes.referenceToIsIndexed[sha256AndLength] = true;
    
    if (id) {
        if (indexes.idToReferences[id]) {
            console.log("ERROR: duplicate reference to ID in %s and %s", indexes.idToReferences[id], sha256AndLength);
        }
        addToIndex("id", indexes.idToReferences, "" + id, sha256AndLength);
    }
    if (tags) {
        for (var tagKey in tags) {
            var tag = tags[tagKey];
            addToIndex("tags", indexes.tagToReferences, "" + tag, sha256AndLength);
        }
    }
    if (contentType) {
        addToIndex("contentType", indexes.contentTypeToReferences, "" + contentType, sha256AndLength);
    }
    
    return true;
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

function sendFailureMessage(response, code, message, extra) {
    var sending = {status: code, error: message};
    if (extra) {
        for (var key in extra) {
            sending[key] = extra[key];
        }
    }
    response.status(code).send(JSON.stringify(sending));
    return false;
}

function returnResource(sha256AndLength, response) {
    if (!referenceIsIndexed(sha256AndLength)) {
        return sendFailureMessage(response, 404, "Not found: " + sha256AndLength);
    }
    
    // TODO: Make asynchronous
    var contentBuffer;
    try {
      contentBuffer = fs.readFileSync(serverDataDirectory + sha256AndLength + ".pce");
    } catch (error) {
        // TODO: Should check what sort of error and respond accordingly
        return sendFailureMessage(response, 500, "Server error: " + error);
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
    
    if (referenceIsIndexed(request.params.sha256AndLength)) {
        return sendFailureMessage(response, 409, "Conflict: The resource already exists on the server", {sha256AndLength: request.params.sha256AndLength});
    }
                   
    var sha256 = request.sha256;
    // console.log("sha256:", sha256);
    
    if (!request.rawBodyBuffer) {
        return sendFailureMessage(response, 406, "Not acceptable: post is missing JSON Content-Type body");
    }
    
    var length = request.rawBodyBuffer.length;
    
    // Probably should validate content as utf8 and valid JSON and so on...
    
    var sha256AndLength = sha256 + "_" + length;
    console.log("==== POST: ", request.url, sha256AndLength);
    
    if (sha256AndLength !== request.params.sha256AndLength) {
        return sendFailureMessage(response, 406, "Not acceptable: sha256AndLength of content does not match that of request url");
    }

    // TODO: Make asynchronous
    try {
      fs.writeFileSync(serverDataDirectory + sha256AndLength + ".pce", request.rawBodyBuffer);
    } catch (error) {
        // TODO: Should check what sort of error and respond accordingly
        return sendFailureMessage(response, 500, "Server error: ' + error + '");
    }
    
    // TODO: Maybe reject new resource if the ID already exists?
    addToIndexes(request.body, sha256AndLength);
    
    return response.json({status: 'OK', message: 'Wrote content', sha256AndLength: sha256AndLength});
});

app.get(apiBaseURL + '/indexes/id/:id', function (request, response) {
    console.log("==== GET by id", request.url);
    
    var id = request.params.id;
    
    var sha256AndLengthList = indexes.idToReferences[id];
    
    // It the request ID is not available, return not found error
    if (!sha256AndLengthList || sha256AndLengthList.length === 0) {
        return sendFailureMessage(response, 404, "Not found");
    }
    
    // Return the first -- should signal error if more than one?
    return response.json({status: 'OK', message: "Index for ID", idRequested: id, items: sha256AndLengthList});
});

app.get(apiBaseURL + '/indexes/tag/:tag', function (request, response) {
    console.log("==== GET by tag", request.url);
    
    var tag = request.params.tag;
    
    var sha256AndLengthList = indexes.tagToReferences[tag];
    
    // It's not an error if there are no items for a tag -- just return an empty list
    if (!sha256AndLengthList) {
        sha256AndLengthList = [];
    }
    
    // Return the first -- should signal error if more than one?
    return response.json({status: 'OK', message: "Index for Tag", tagRequested: tag, items: sha256AndLengthList});
});

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function reindexAllResources() {
    console.log("reindexAllResources");
    indexes.referenceToIsIndexed = {};
    indexes.idToReferences = {};
    indexes.tagToReferences = {};
    indexes.contentTypeToReferences = {};
    
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

console.log("id index", indexes.idToReferences);
console.log("tag index", indexes.tagToReferences);
console.log("contentType index", indexes.contentTypeToReferences);

// Create an HTTP service.
var server = http.createServer(app).listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Pointrel20141201 app listening at http://%s:%s', host, port);
});


