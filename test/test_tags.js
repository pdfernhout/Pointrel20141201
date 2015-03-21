console.log("starting up tests...");
require(["/js/pointrel20141201Client.js"], function(pointrel20141201Client) {
    "use strict";
    
    function test4() {
        pointrel20141201Client.queryByTag("test", function(error, queryResult) {
            if (error) { console.log("error", error); return;}
            console.log("Got queryResult for tag 'test'", queryResult);
        });
    }
    
    test4();
});
