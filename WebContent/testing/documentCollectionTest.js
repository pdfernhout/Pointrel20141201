require([
    "js/pointrel20141201Client",
    "js/pointrel20141201DocumentCollection",
    "dojo/domReady!"
], function(
    pointrel20141201Client,
    DocumentCollection
){
    "use strict";
    
    console.log("documentCollectionTest.js");
    
    function createTestResource() {
        var content = "Hello, world!";
    
        var metadata = {id: "test", contentType: "text/plain"};
        
        pointrel20141201Client.storeInNewEnvelope(content, metadata, function(error, result) {
            if (error) { console.log("error", error); return;}
            
            console.log("Stored item", result.sha256AndLength, result);
            
            /*
            pointrel20141201Client.fetchEnvelope(result.sha256AndLength, function(error, item) {
                if (error) { console.log("error", error); return;}
                console.log("Got item", item);
            });
            */
        });
    }
    
    function test() {

        var documentCollection = new DocumentCollection();
        
        documentCollection.startup();
        
        console.log("will run for one minute");
        window.setTimeout(function() {
            console.log("shutting down test after one minute");
            documentCollection.shutdown();
        }, 60000);
    }
    
    createTestResource();
    test();
    
});