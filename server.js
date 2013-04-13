module('org.server').requires('org.model').toRun(function() {

org.model.Change.addMethods({
    record: function() {
        if (this.message[0] !== '=') return;
        this.oldValue = this.subject[this.message.substring(1)];
    },
    asJournalEntry: function() {
        return {
            subject: this.subject.getTypedId(),
            message: this.message,
            value: this.serialize(this.value),
            oldValue: this.serialize(this.oldValue),
            user: this.user,
            timestamp: this.timestamp
        };
    }
});

org.model.EntityHub.subclass('org.server.ServerHub',
'accessing', {
    dataFile: function() {
        return _require('path').resolve(__dirname, './data.json');
    },
    exampleFile: function() {
        return _require('path').resolve(__dirname, './empty-data.json');
    },
    dbDir: function() {
        return _require('path').resolve(__dirname, './journal');
    },
    imageDir: function() {
        return _require('path').resolve(__dirname, './images');
    },
    asJSON: function() {
        return JSON.stringify(this.asData());
    },
    getJournal: function() {
        var result;
        this.journal.find().all(function(err, key, value) {
            result[key] = value;
        });
        return JSON.stringify(result);
    }
},
'loading', {
    loadFromFile: function() {
        var fs = _require('fs'),
            Alfred = _require('alfred');
        if (!fs.existsSync(this.dbDir())) {
            fs.mkdirSync(this.dbDir());
            console.log("created " + this.dbDir());
        }
        if (!fs.existsSync(this.imageDir())) {
            fs.mkdirSync(this.imageDir());
            console.log("created " + this.imageDir());
        }
        Alfred.open(this.dbDir(), function(err, db) {
            if (err) return console.error(err);
            this.setupDB(db);
            if (fs.existsSync(this.dataFile())) {
                this.loadInitialData();
            } else {
                console.log('creating initial state from example data');
                var readStream = fs.createReadStream(this.exampleFile());
                var writeStream = fs.createWriteStream(this.dataFile());
                readStream.pipe(writeStream);
                writeStream.on('close', this.loadInitialData.bind(this));
            }
        }.bind(this));
    },
    setupDB: function(db) {
        this.journal = db.define('Journal');
        this.journal.property('subject', 'string', {
            optional: false,
            minLength: 1,
            maxLenght: 42
        });
        this.journal.property('message', 'string', {
            optional: false,
            minLength: 2,
            maxLenght: 42
        });
        this.journal.property('value', '', {
            optional: true
        });
        this.journal.property('oldValue', '', {
            optional: true
        });
        this.journal.property('user', 'string', {
            optional: false,
            minLength: 2,
            maxLenght: 42
        });
        this.journal.property('timestamp', 'number', {
            optional: false,
            minimum: 1300000000
        });
        this.journal.index('subject', function(journal) {
            return journal.subject;
        });
        this.journal.index('user', function(journal) {
            return journal.user;
        });
        this.journal.index('timestamp', function(journal) {
            return journal.timestamp;
        });
    },
    loadInitialData: function() {
        _require('fs').readFile(this.dataFile(), function (err, buffer) {
            if (err) return console.error(err);
            this.loadComplete(String(buffer));
        }.bind(this));
    }
},
'images', {
    getImageFor: function(id, callback) {
        var fs = _require('fs');
        var origFile = this.imageDir() + '/' + id + '.png';
        fs.exists(origFile, function(exists) {
            var file = exists ? origFile :
                _require('path').resolve(__dirname, './media/person.png');
            fs.readFile(file, function (err, data) {
                if (err) return callback(undefined);
                callback(data);
            });
        });
    },
    setImageFor: function(id, imagedata, callback) {
        var fs = _require('fs');
        var path = this.imageDir() + '/' + id + '.png';
        fs.writeFile(path, imagedata, 'binary', callback);
    }
},
'saving', {
    save: function() {
        clearTimeout(this.bounceTimeout);
        clearTimeout(this.maxTimeout);
        _require('fs').writeFile(this.dataFile(), this.asJSON());
    }
},
'synchronization', {
    receiveChange: function($super, subject, message, value, user, timestamp, prevHash, socket) {
        var change = $super(subject, message, value, user, timestamp, prevHash);
        if (this.hash === prevHash) {
            change.record();
            this.sendUpdates(socket, change, prevHash);
            this.saveChange(change, function() {
                change.apply();
                this.hash = change.hash;
            }.bind(this));
        } else {
            console.error("received out-dated change");
        }
    },
    sendUpdates: function(socket, change, prevHash) {
        console.log('-> ok ' + change.hash);
        socket.emit('ok', change.hash);
        change.send(socket.broadcast.emit.bind(socket.broadcast), prevHash);
    },
    saveChange: function(change, cb) {
        var journalEntry = this.journal.new(change.asJournalEntry());
        journalEntry.save(function(err) {
            if (err) return console.error(err);
            console.log("stored " + change.hash + ' by ' + change.user);
            clearTimeout(this.bounceTimeout);
            this.bounceTimeout = setTimeout(this.save.bind(this), 10000);
            if (!this.maxTimeout) {
                this.maxTimeout = setTimeout(this.save.bind(this), 60000);
            }
            cb();
        }.bind(this));
    },
    start: function() {
        var io = _require('socket.io').listen(8114);
        io.set('log level', 1);
        io.set('origins', '*:*');
        io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);
        io.sockets.on('connection', function(socket) {
            socket.on('change', function(subject, message, object, user, timestamp, prevHash) {
                this.receiveChange(subject, message, object, user, timestamp, prevHash, socket);
            }.bind(this));
        }.bind(this));
        return this;
    }
});

if (Global.onServerReady) {
    var hub = new org.server.ServerHub();
    connect(hub, 'loadComplete', hub, 'start');
    connect(hub, 'start', Global, 'onServerReady');
    hub.loadFromFile();
}

});
