define([
    "dojo/request/xhr",
    'dojox/encoding/digests/_base',
    "dojox/encoding/digests/SHA256"
], function(
    xhr,
    digests,
    SHA256
) {
    "use strict";
    
    var apiPath = "/api/pointrel20141201/";
    var resourcesPath = apiPath + "resources/";
    var idIndexPath = apiPath + "indexes/id/";
    var tagIndexPath = apiPath + "indexes/tag/";
    
    function pointrel_store(item, callback) {
        console.log("pointrel_store", item);
        
        var content = JSON.stringify(item, null, 2);
        var itemReference = SHA256(content,digests.outputTypes.Hex) + "_" + content.length;
        
        console.log("will be posting '%s'", content);
        
        xhr.post(resourcesPath + itemReference, {
            handleAs: "text",
            data: content,
            headers: {'Content-Type': 'application/json; charset=UTF-8'}
        }).then(function(data) {
            // OK
            callback(null, JSON.parse(data));
        }, function(error) {
            // Error
            if (error.response.status === 409) {
                console.log("already exists", error);
                console.log("message: '%s'", error.response.data);
                // Assuming it's OK if the resource already exists -- we can assume it is identical and was added by someone else
                callback(null, JSON.parse(error.response.data));
            } else {
                callback(error, null);
            }
        }, function(event) {
            // Handle a progress event from the request if the browser supports XHR2
        });
    }
    
    function pointrel_fetch(itemReference, callback) {
        console.log("pointrel_fetch", itemReference);
        
        xhr.get(resourcesPath + itemReference, {
            handleAs: "text"
        }).then(function(data) {
            // OK
            callback(null, JSON.parse(data));
        }, function(error) {
            // Error
            callback(error, null);
        }, function(event) {
            // Handle a progress event from the request if the browser supports XHR2
        });
    }
    
    function pointrel_queryByID(id, callback) {
        console.log("pointrel_queryByID", id);
        
        xhr.get(idIndexPath + id, {
            handleAs: "text"
        }).then(function(data) {
            // OK
            callback(null, JSON.parse(data));
        }, function(error) {
            // Error
            callback(error, null);
        }, function(event) {
            // Handle a progress event from the request if the browser supports XHR2
        });
    }
    
    function pointrel_queryByTag(tag, callback) {
        console.log("pointrel_queryByTag", tag);
        
        xhr.get(tagIndexPath + tag, {
            handleAs: "text"
        }).then(function(data) {
            // OK
            callback(null, JSON.parse(data));
        }, function(error) {
            // Error
            callback(error, null);
        }, function(event) {
            // Handle a progress event from the request if the browser supports XHR2
        });
    }
    
    // Optional initialization
    function initialize(configuration) {
        if (configuration) {
            if (configuration.apiPath) apiPath = configuration.apiPath;
        }
    }
    
    console.log("loaded Pointrel client", apiPath);
    
    return {
        initialize: initialize,
        store: pointrel_store,
        fetch: pointrel_fetch,
        queryByID: pointrel_queryByID,
        queryByTag: pointrel_queryByTag
    };
});
