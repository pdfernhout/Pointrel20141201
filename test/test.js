console.log("starting up tests...");
require(["/js/pointrel20141201Client.js"], function(pointrel20141201Client) {
    "use strict";
    
    console.log("pointrel20141201Client", pointrel20141201Client);
    
    function test1() {
        var testObject1 = {foo: "bar", id: 3};
        
        var metadata = {id: "3"};  // , committer: "tester" , timestamp: true
        
        pointrel20141201Client.storeInNewEnvelope(testObject1, metadata, function(error, result) {
            if (error) { console.log("error", error); return;}
            
            console.log("Stored item", result.sha256AndLength);
          
            var sha256AndLengthExpected1 = "6bba1bf51a204a4c1eb14897d1fed959885f0883eee3f536b8fd2880650e6afd_183";
          
            console.log("match expected 1?", sha256AndLengthExpected1 === result.sha256AndLength); 
          
            // Get an object by sha256AndLength
            pointrel20141201Client.fetchEnvelope(sha256AndLengthExpected1, function(error, item) {
                if (error) { console.log("error", error); return;}
                console.log("Got item", item);
            });
        });
    }
    
    function test2() {
        var testObject2Content = "Hello, world!";
        var testObject2ID = "hello world";
        var testObject2Tags = ["test", "pointrel://pages/hello-world.txt"];
        var testObject2ContentType = "text/plain";
    
        var metadata = {id: testObject2ID, contentType: testObject2ContentType, tags: testObject2Tags};  // , committer: "tester", timestamp: true
        
        pointrel20141201Client.storeInNewEnvelope(testObject2Content, metadata, function(error, result) {
            if (error) { console.log("error", error); return;}
            
            console.log("Stored item", result.sha256AndLength);
          
            var sha256AndLengthExpected2 = "96f5c5dd743dbf73ec7d6949d46f6c3b4079b1fab879bdef02add3d0bfcac644_495";
          
            console.log("match expected 2?", sha256AndLengthExpected2 === result.sha256AndLength); 
          
            pointrel20141201Client.fetchEnvelope(result.sha256AndLength, function(error, item) {
                if (error) { console.log("error", error); return;}
                console.log("Got item", item);
            });
        });
    }
    
    function test3() {
        pointrel20141201Client.queryByID("hello world", function(error, queryResult) {
            if (error) { console.log("error", error); return;}
            console.log("Got queryResult for id 'hello world'", queryResult);
        });
    }
    
    function test4() {
        pointrel20141201Client.queryByTag("test", function(error, queryResult) {
            if (error) { console.log("error", error); return;}
            console.log("Got queryResult for tag 'test'", queryResult);
        });
    }
   
   function test5() {
        pointrel20141201Client.queryByTag("test-nonexistent-tag", function(error, queryResult) {
            if (error) { console.log("error", error); return;}
            console.log("Got queryResult for tag 'test-nonexistent-tag'", queryResult);
        });
    }
   
   function test6() {
       pointrel20141201Client.queryByTriple("hello world", "document:tag", null, "all", function(error, queryResult) {
           if (error) { console.log("error", error); return;}
           console.log("Got queryResult for triple query of findAllCForAB", queryResult);
       });
   }
   
   function test7() {
       pointrel20141201Client.queryByTriple("hello world", "document:tag", function(error, queryResult) {
           if (error) { console.log("error", error); return;}
           console.log("Got queryResult for triple query of findLatestCForAB", queryResult);
       });
   }
    
    // Need to delay calls to ensure server has stored and indexed data before making next call
    // TODO: Could use test runner software
    setTimeout(test1, 100);
    setTimeout(test2, 200);
    setTimeout(test3, 300);
    setTimeout(test4, 400);
    setTimeout(test5, 500);
    setTimeout(test6, 600);
    setTimeout(test7, 700);
});
