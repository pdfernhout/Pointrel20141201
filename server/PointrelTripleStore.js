define(function() {

    function TripleStore() {
        this.documents = {};
        //this.a = {}
        //this.b = {};
        //this.c = {};
        this.ab = {};
        this.cb = {};
        this.ac = {};
    }
    
    function addTripleToMap(map, key, triple) {
        var list = map[key];
        if (!list) {
            list = [];
            map[key] = list;
        }
        list.push(triple);
        
        // Keep items sorted in ascending timestamp order
        list.sort(function(tripleA, tripleB) {
            var difference = tripleA.timestamp - tripleB.timestamp;
            if (difference) return difference;
            // TODO: Could sort on other triple fields to be consistent?
            return 0; 
        });
    }
    
    TripleStore.prototype.addTriple = function(documentTriple, documentID, documentTimestamp) {
        var timestamp = documentTriple.timestamp;
        if (!timestamp) timestamp = documentTimestamp;
        
        // Assure timestamp is a number...
        if (isNaN(timestamp)) timestamp = 0;
        
        var a = documentTriple.a;
        var b = documentTriple.b;
        var c = documentTriple.c;
        
        // TODO: what about UUID for documentTriple?
        var tripleToStore = {a: a, b: b, c: c, timestamp: timestamp, documentID: documentID};
        
        var abKey = JSON.stringify([a, b]);
        addTripleToMap(this.ab, abKey, tripleToStore);
        
        var cbKey = JSON.stringify([c, b]);
        addTripleToMap(this.cb, cbKey, tripleToStore);
        
        var acKey = JSON.stringify([a, c]);
        addTripleToMap(this.ac, acKey, tripleToStore);
        
        return tripleToStore;
    };
    
    function removeTripleFromMap(map, key, storedTripleToRemove) {
        var list = map[key];
        if (!list) {
            console.log("ERROR: Unexpectedly missing map entries for triple", map, key, storedTripleToRemove);
            return;
        }
        
        for (var i = 0; i < list.length; i++) {
            if (list[i] === storedTripleToRemove) {
                delete list[i];
                if (list.length === 0) delete map[key];
                return;
            }
        }
        
        console.log("ERROR: Could not find triple to delete in map list", map, key, storedTripleToRemove);
    }
    
    TripleStore.prototype.removeTriple = function(storedTriple) {
        // TODO: Could check based on a Triple UUID?
        var a = storedTriple.a;
        var b = storedTriple.b;
        var c = storedTriple.c;
        
        var abKey = JSON.stringify([a, b]);
        removeTripleFromMap(this.ab, abKey, storedTriple);
        
        var cbKey = JSON.stringify([c, b]);
        removeTripleFromMap(this.cb, cbKey, storedTriple);
        
        var acKey = JSON.stringify([a, c]);
        removeTripleFromMap(this.ac, acKey, storedTriple);
    };
    
    TripleStore.prototype.addDocument = function(document) {
        // remove previous document
        var oldDocumentInformation = this.documents[document.id];
        if (oldDocumentInformation) {
            if (oldDocumentInformation.timestamp > document.timestamp) {
                console.log("already indexed document is older than version being added", oldDocumentInformation, document);
                return;
            }
            var oldTriples = oldDocumentInformation.triples;
            for (var oldTripleIndex = 0; oldTripleIndex < oldTriples.length; oldTripleIndex++) {
                var oldTriple = oldTriples[oldTripleIndex];
                this.removeTriple(oldTriple);
            }
        }
        var documentTriples = document.triples;
        var newTriples = [];
        if (documentTriples) {
            for (var newTripleIndex = 0; newTripleIndex < documentTriples.length; newTripleIndex++) {
                var documentTriple = documentTriples[newTripleIndex];
                var tripleToStore = this.addTriple(documentTriple, document.id, document.timestamp);
                newTriples.push(tripleToStore);
            }
            
        }
        if (newTriples.length) {
            this.documents[document.id] = {documentID: document.id, documentTimestamp: document.timestamp, triples: newTriples};
        } else if (oldDocumentInformation) {
            delete this.documents[document.id];
        }
    };
});