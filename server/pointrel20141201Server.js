// Test at: http://localhost:8080/pointrel20141201/
/*jslint node: true */
"use strict";

// Simplified version of Pointrel system (building on Pointrel20130202)
// Stores JSON resources in files
// Keeps indexes for them in memory
// indexes created from parsing all resources at startup
// Trying to avoid maintaining log files which could get corrupted
// Also making this module usable directly from server code in nodejs

// TODO: use nested directories so can support lots of files better

var version = "pointrel20141201-0.0.1";
var resourceFileSuffix = ".pce";

var apiBaseURL = '/api/pointrel20141201';
var serverDataDirectory = "../server-data/";

// Standard nodejs modules
var fs = require('fs');
var crypto = require('crypto');

// The modules below require npm installation
var bodyParser = require('body-parser');

/* Indexing */

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

function referenceIsIndexed(reference) {
    return indexes.referenceToIsIndexed[reference] === true;
}

function referencesForID(id) {
    return indexes.idToReferences[id];
}

function referencesForTag(tag) {
    return indexes.tagToReferences[tag];
}

function referencesForContentType(contentType) {
    return indexes.contentTypeToReferences[contentType];
}

function addToIndex(indexType, index, key, itemReference) {
    console.log("addToIndex", indexType, index, key, itemReference);
    var itemsForKey = index[key];
    if (!itemsForKey) {
        itemsForKey = [];
        index[key] = itemsForKey;
    }
    itemsForKey.push(itemReference);
}

function addToIndexes(body, sha256AndLength) {
    console.log("addToIndexes", sha256AndLength, body);
    var id = body.id;
    var tags = body.tags;
    var contentType = body.contentType;
    
    if (referenceIsIndexed(sha256AndLength)) {
        console.log("Already indexed " + sha256AndLength);
        return false;
    }
    
    indexes.referenceToIsIndexed[sha256AndLength] = true;
    
    if (id) {
        if (referencesForID(id)) {
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

function reindexAllResources() {
    console.log("reindexAllResources");
    indexes.referenceToIsIndexed = {};
    indexes.idToReferences = {};
    indexes.tagToReferences = {};
    indexes.contentTypeToReferences = {};
    
    var fileNames = fs.readdirSync(serverDataDirectory);
    console.log("fileNames", fileNames);
    for (var fileNameIndex in fileNames) {
        var fileName = fileNames[fileNameIndex];
        if (endsWith(fileName, resourceFileSuffix)) {
            console.log("Indexing: ", fileName);
            try{
                var resourceContent = fetchContentForReferenceSync(fileName.substring(0, fileName.length - resourceFileSuffix.length));
                var resourceObject = JSON.parse(resourceContent);
                // console.log("resourceObject", resourceObject);
                addToIndexes(resourceObject, fileName.substring(0, fileName.length-4));
            } catch(error) {
                console.log("Problem indexing %s error: %s", fileName, error);
            }
        } 
    }
}

/* Fetching and storing resources to disk */

function fetchContentForReference(sha256AndLength, callback) {
    var fileName = serverDataDirectory + sha256AndLength + resourceFileSuffix;
    fs.readFile(fileName, "utf8", callback);
}

function fetchContentForReferenceSync(sha256AndLength) {
    var fileName = serverDataDirectory + sha256AndLength + resourceFileSuffix;
    return fs.readFileSync(fileName, "utf8");
}

function storeContentForReference(sha256AndLength, data, callback) {
    var fileName = serverDataDirectory + sha256AndLength + resourceFileSuffix;
 // TODO: maybe change permission mode from default?
    fs.writeFile(fileName, data, "utf8", callback);
}

function storeContentForReferenceSync(sha256AndLength, data) {
    var fileName = serverDataDirectory + sha256AndLength + resourceFileSuffix;
    // TODO: maybe change permission mode from default?
    fs.writeFileSync(fileName, data, "utf8");
}

/* Utility */

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function calculateSHA256(bufferOrString) {
    var hash = crypto.createHash('sha256');
    // 'utf8' is ignored if passed a buffer and not a string
    hash.update(bufferOrString, 'utf8');
    return hash.digest('hex');
}

function sanitizeFileName(fileName) {
    return fileName.replace(/\s/g, "_").replace(/\.[\.]+/g, "_").replace(/[^\w_\.\-]/g, "_");
}

//For JSON body parser to preserve original content send via POST
function bodyParserVerifyAddSHA256(request, result, buffer, encoding) {
    
    request.sha256 = calculateSHA256(buffer);
    // console.log("hash", request.sha256);
 
    request.rawBodyBuffer = buffer;
    // console.log("rawBodyBuffer", request.rawBodyBuffer);
}

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
    
    fetchContentForReference(sha256AndLength, function (error, data) {
        if (error) {
            // TODO: Should check what sort of error and respond accordingly
            return sendFailureMessage(response, 500, "Server error: " + error);
         }
        // response.json(content);
        response.setHeader('Content-Type', 'application/json');
        response.send(data);
    });
}

/* Responding to requests */

function respondWithStatus(request, response) {
    response.json({status: 'OK', version: version});
}

function respondForResourceGet(request, response) {
    // Sanitizes resource ID to prevent reading arbitrary files
    var sha256AndLength = sanitizeFileName(request.params.sha256AndLength);
    
    console.log("==== GET by sha256AndLength", request.url);
    returnResource(sha256AndLength, response);
}

function respondForResourcePost(request, response) {
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
    
    storeContentForReference(sha256AndLength, request.rawBodyBuffer, function(error) {
        // TODO: Maybe reject new resource if the ID already exists?

        if (error) {
            return sendFailureMessage(response, 500, "Server error: ' + error + '");
        }
        
        addToIndexes(request.body, sha256AndLength);
        
        return response.json({status: 'OK', message: 'Wrote content', sha256AndLength: sha256AndLength});
        
    });
}

function respondForID(request, response) {
    console.log("==== GET by id", request.url);
    
    var id = request.params.id;
    
    var sha256AndLengthList = referencesForID(id);
    
    // It the request ID is not available, return not found error
    if (!sha256AndLengthList || sha256AndLengthList.length === 0) {
        return sendFailureMessage(response, 404, "Not found");
    }
    
    // Return the first -- should signal error if more than one?
    return response.json({status: 'OK', message: "Index for ID", idRequested: id, items: sha256AndLengthList});
}

function respondForTag(request, response) {
    console.log("==== GET by tag", request.url);
    
    var tag = request.params.tag;
    
    var sha256AndLengthList = referencesForTag(tag);
    
    // It's not an error if there are no items for a tag -- just return an empty list
    if (!sha256AndLengthList) {
        sha256AndLengthList = [];
    }
    
    // Return the first -- should signal error if more than one?
    return response.json({status: 'OK', message: "Index for Tag", tagRequested: tag, items: sha256AndLengthList});
}

/* Other */

// Intended for module users
function storeAndIndexItem(item, callback) {
    var itemString = JSON.stringify(item);
    var sha256 = calculateSHA256(itemString);
    var sha256AndLength = sha256 + "_" + itemString.length;
    
    storeContentForReference(sha256AndLength, itemString, function(error) {
        if (error) {
            if (callback) callback(error);
            return;
        }
        
        addToIndexes(item, sha256AndLength);
        if (callback) callback();
    });
}

// Do indexing and set up default paths
function initialize(app, config) {
    if (config) {
        if (config.serverDataDirectory) serverDataDirectory = config.serverDataDirectory;
        if (config.apiBaseURL) apiBaseURL = config.apiBaseURL;
    }
    reindexAllResources();

    console.log("id index", indexes.idToReferences);
    console.log("tag index", indexes.tagToReferences);
    console.log("contentType index", indexes.contentTypeToReferences);
    
    app.use(bodyParser.json({
        verify: bodyParserVerifyAddSHA256
    }));
    
    app.use(apiBaseURL + '/status', respondWithStatus);
    
    app.get(apiBaseURL + '/resources/:sha256AndLength', respondForResourceGet);
    app.post(apiBaseURL + '/resources/:sha256AndLength', respondForResourcePost);
    app.get(apiBaseURL + '/indexes/id/:id', respondForID);
    app.get(apiBaseURL + '/indexes/tag/:tag', respondForTag);
}

exports.version = version;
exports.initialize = initialize;
exports.reindexAllResources = reindexAllResources;
exports.referenceIsIndexed = referenceIsIndexed;
exports.referencesForID = referencesForID;
exports.referencesForTag = referencesForTag;
exports.referencesForContentType = referencesForContentType;
exports.fetchContentForReference = fetchContentForReference;
exports.fetchContentForReferenceSync = fetchContentForReferenceSync;
exports.storeAndIndexItem = storeAndIndexItem;
