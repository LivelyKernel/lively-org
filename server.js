module('org.server').requires('org.model').toRun(function() {

Object.subclass('org.server.Mutex', {
    initialize: function() {
        var EventEmitter = _require('events').EventEmitter;
        this.queue = new EventEmitter();
        this.queue.setMaxListeners(100);
        this.locked = false;
    },
    lock: function (fn) {
        if (this.locked) {
            this.queue.once('ready', this.lock.bind(this, fn));
        } else {
            this.locked = true;
            fn();
        }
    },
    release: function () {
        this.locked = false;
        this.queue.emit('ready');
    }
});

org.model.Change.addMethods({
    record: function() {
        if (this.message[0] !== '=') return;
        var prop = this.message.substring(1);
        if (!this.subject || !this.subject.hasOwnProperty(prop)) return;
        this.oldValue = this.subject[prop];
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
    dbFile: function() {
        return _require('path').resolve(__dirname, './journal.db');
    },
    imageDir: function() {
        return _require('path').resolve(__dirname, './images');
    },
    partsDir: function() {
        return _require('path').resolve(__dirname, './parts');
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
        var fs = _require('fs');
        if (!fs.existsSync(this.imageDir())) {
            fs.mkdirSync(this.imageDir());
            console.log("created " + this.imageDir());
        }
        if (!fs.existsSync(this.partsDir())) {
            fs.mkdirSync(this.partsDir());
            console.log("created " + this.partsDir());
        }
        var sqlite3 = _require('sqlite3').verbose();
        var cb = fs.existsSync(this.dbFile()) ? this.initDB : this.setupDB;
        this.db = new sqlite3.Database(this.dbFile(), cb.bind(this));
    },
    setupDB: function(err) {
        if (err) return console.error(err);
        var query = "CREATE TABLE journal (" +
                    "    id INTEGER PRIMARY KEY ASC AUTOINCREMENT," +
                    "    subject VARCHAR(42) NOT NULL," +
                    "    message VARCHAR(42) NOT NULL," +
                    "    value_lit TEXT," +
                    "    value_ref VARCHAR(42)," +
                    "    old_lit TEXT," +
                    "    old_ref VARCHAR(42)," +
                    "    user VARCHAR(42) NOT NULL," +
                    "    timestamp INTEGER NOT NULL," +
                    "    hash CHARACTER(8) UNIQUE NOT NULL" +
                    ")";
        this.db.run(query, function(err) {
            if (err) return console.error(err);
            var query = "CREATE INDEX user ON journal (user)";
            this.db.run(query, function(err) {
                if (err) return console.error(err);
                var query = "CREATE INDEX ref ON journal (subject, value_ref, old_ref)";
                this.db.run(query, function(err) {
                    if (err) return console.error(err);
                    var query = "CREATE INDEX time ON journal (timestamp)";
                    this.db.run(query, function(err) {
                        if (err) return console.error(err);
                        this.initDB();
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }.bind(this));
    },
    initDB: function(err) {
        this.mutex = new org.server.Mutex();
        var fs = _require('fs');
        if (err) return console.error(err);
        if (fs.existsSync(this.dataFile())) {
            this.loadInitialData();
        } else {
            console.log('creating initial state from example data');
            var readStream = fs.createReadStream(this.exampleFile());
            var writeStream = fs.createWriteStream(this.dataFile());
            readStream.pipe(writeStream);
            writeStream.on('close', this.loadInitialData.bind(this));
        }
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
        this.mutex.lock(function() {
            var change = $super(subject, message, value, user, timestamp, prevHash);
            if (this.hash === prevHash) {
                change.record();
                this.sendUpdates(socket, change, prevHash);
                this.saveChange(change, function(e) {
                    if (e) {
                        console.error(e);
                    } else {
                        change.apply();
                        this.hash = change.hash;
                    }
                    this.mutex.release();
                }.bind(this));
            } else {
                console.error("received out-dated change");
                this.mutex.release();
            }
        }.bind(this));
    },
    sendUpdates: function(socket, change, prevHash) {
        console.log('-> ok ' + change.hash);
        socket.emit('ok', change.hash);
        change.send(socket.broadcast.emit.bind(socket.broadcast), prevHash);
    },
    insertQuery: 'INSERT INTO journal (subject, message, {value} {old} user, timestamp, hash) VALUES (#)',
    saveChange: function(change, cb) {
        var query = this.insertQuery;
        var params = [change.subject.getTypedId(), change.message];
        if (change.value instanceof org.model.Entity) {
            params.push(change.value.getTypedId());
            query = query.replace('{value}', 'value_ref, ');
        } else if (change.value) {
            params.push(change.serialize(change.value));
            query = query.replace('{value}', 'value_lit, ');
        } else {
            query = query.replace('{value}', '');
        }
        if (change.oldValue instanceof org.model.Entity) {
            params.push(change.oldValue.getTypedId());
            query = query.replace('{old}', 'old_ref, ');
        } else if (change.oldValue) {
            params.push(change.serialize(change.oldValue));
            query = query.replace('{old}', 'old_lit, ');
        } else {
            query = query.replace('{old}', '');
        }
        params.push(change.user);
        params.push(change.timestamp);
        params.push(change.hash);
        query = query.replace('#', '?'.times(params.length).split('').join(', '));
        this.db.run(query, params, function(err) {
            if (err) return cb(err);
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
