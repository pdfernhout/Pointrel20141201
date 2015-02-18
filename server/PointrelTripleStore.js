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
    
    function getTripleListFromMap(map, key) {
        // TODO: In practice, current users could be adapted to react to a null and not need to allocated empty list
        var list = map[key];
        if (!list) return [];
        return list;
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
 
        var acKey = JSON.stringify([a, c]);
        addTripleToMap(this.ac, acKey, tripleToStore);
          
        var cbKey = JSON.stringify([c, b]);
        addTripleToMap(this.cb, cbKey, tripleToStore);

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
    
    // Public API
    TripleStore.prototype.addOrRemoveTriplesForDocument = function(document) {
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
        
        // TODO: Legacy support for previous approach to tags and previously saved documents -- remove this eventually
        if (document.tags) {
            for (var i = 0; i < document.tags.length; i++) {
                var tag = document.tags[i];
                if (!tag) continue;
                var tagTriple = ({a: document.id, b: "document:tag", c: tag});
                var tagTripleToStore = this.addTriple(tagTriple, document.id, document.timestamp);
                newTriples.push(tagTripleToStore);
            }
        }
        // TODO: End of legacy support above
        
        if (newTriples.length) {
            this.documents[document.id] = {documentID: document.id, documentTimestamp: document.timestamp, triples: newTriples};
        } else if (oldDocumentInformation) {
            delete this.documents[document.id];
        }
    };
    
    // Public API
    TripleStore.prototype.findAllCForAB = function(a, b) {
        var abKey = JSON.stringify([a, b]);
        var triples = getTripleListFromMap(this.ab, abKey);
        var result = [];
        for (var i = 0; i < triples.length; i++) {
            // TODO: Eliminate duplicates and/or sort using dictionary?
            result.push(triples[i].c);
        }
        return result;
    };

    // Public API
    TripleStore.prototype.findAllBForAC = function(a, c) {
        var acKey = JSON.stringify([a, c]);
        var triples = getTripleListFromMap(this.ac, acKey);
        var result = [];
        for (var i = 0; i < triples.length; i++) {
            // TODO: Eliminate duplicates and/or sort using dictionary?
            result.push(triples[i].b);
        }
        return result;
    };

    // Public API
    TripleStore.prototype.findAllAForBC = function(b, c) {
        var cbKey = JSON.stringify([c, b]);
        var triples = getTripleListFromMap(this.cb, cbKey);
        var result = [];
        for (var i = 0; i < triples.length; i++) {
            // TODO: Eliminate duplicates and/or sort using dictionary?
            result.push(triples[i].a);
        }
        return result;
    };
    
    // Public API
    TripleStore.prototype.findLatestCForAB = function(a, b) {
        var abKey = JSON.stringify([a, b]);
        var triples = getTripleListFromMap(this.ab, abKey);
        if (triples.length === 0) return null;
        return triples[triples.length - 1].c;
    };

    // Public API
    TripleStore.prototype.findLatestBForAC = function(a, c) {
        var acKey = JSON.stringify([a, c]);
        var triples = getTripleListFromMap(this.ac, acKey);
        if (triples.length === 0) return null;
        return triples[triples.length - 1].b;
    };

    // Public API
    TripleStore.prototype.findLatestAForBC = function(b, c) {
        var cbKey = JSON.stringify([c, b]);
        var triples = getTripleListFromMap(this.cb, cbKey);
        if (triples.length === 0) return null;
        return triples[triples.length - 1].a;
    };
    
    // TODO: API and indexing to return all B's for an A or C? Or A or Cs for a B?
    
    return TripleStore;
});