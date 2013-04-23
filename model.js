module('org.model').requires('lively.persistence.Serializer').requiresLib({url:Config.rootPath+'org/node_modules/moment/moment.js',loadTest:function(){return!!Global.moment}}).toRun(function(){

Object.subclass('org.model.EntityHub',
'initialization', {
    initialize: function() {
        this.hash = '00000000';
        this.users = {};
        this.projects = {};
        this.notes = {};
        this.initializeIndex();
        var anon = new org.model.User('anonymous');
        anon.setFirstName('Anonymous');
        anon.setLastName('');
        this.addUser(anon);
    },
    initializeIndex: function() {
        // create first level of index with
        // dummy object that does not store entities
        this.index = {};
        var s = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < s.length; i++) {
            var e = {_: {}};
            Object.addScript(e._, 'function pushIfNotIncluded(){}');
            this.index[s[i]] = e;
        }
    },
    indexAll: function() {
        this.initializeIndex();
        var indexEntity = function(key, entity) {
            this.indexEntity(entity);
        };
        Properties.forEachOwn(this.users, indexEntity, this);
        Properties.forEachOwn(this.projects, indexEntity, this);
        Properties.forEachOwn(this.notes, indexEntity, this);
    }
},
'entities', {
    changedEntity: function(changeParams) {
        var entity = changeParams[0];
        this.indexEntity(entity);
    },
    addProject: function(project) {
        if (!this.projects.hasOwnProperty(project)) {
            this.projects[project] = project;
            this.indexEntity(project);
            project.onChanged(this, 'changedEntity');
        }
    },
    createProject: function(optId) {
        var project = new org.model.Project(optId);
        this.addProject(project);
        return project;
    },
    getProjects: function() {
        return Object.values(this.projects);
    },
    removeProject: function(project) {
        delete this.projects[project];
        //TODO: not implemented yet
    },
    addUser: function(user) {
        if (!this.users.hasOwnProperty(user)) {
            this.users[user] = user;
            this.indexEntity(user);
            user.onChanged(this, 'changedEntity');
        }
    },
    createUser: function(optId) {
        var user = new org.model.User(optId);
        this.addUser(user);
        return user;
    },
    getUsers: function() {
        return Object.values(this.users);
    },
    removeUser: function(user) {
        delete this.users[user];
        //TODO: not implemented yet
    },
    addNote: function(note) {
        if (!this.notes.hasOwnProperty(note)) {
            this.notes[note] = note;
            this.indexEntity(note);
            note.onChanged(this, 'changedEntity');
        }
    },
    getNotes: function() {
        return Object.values(this.notes);
    },
    removeNote: function(note) {
        if (this.notes.hasOwnProperty(note)) {
            note.remove();
            delete this.notes[note];
        }
    },
    createNote: function() {
        var note = new org.model.Note();
        note.setCreator(this.me());
        this.addNote(note);
        return note;
    },
    me: function() {
        var me = 'anonymous';
        if (Global.$world) me = $world.getUserName();
        if (!this.users.hasOwnProperty(me)) me = 'anonymous';
        return this.users[me];
    }
},
'meta', {
    getType: function(typeCode) {
        if (!this.typeTable) {
            this.typeTable = {};
            org.model.Entity.withAllSortedSubclassesDo(function(cls) {
                this.typeTable[cls.prototype.typeCode] = cls;
            }.bind(this));
        }
        return this.typeTable[typeCode];
    },
    getEntityMapping: function(typeCode) {
        return this.getType(typeCode).name.toLowerCase() + "s";
    },
    get: function(typeCode, id) {
        if (!id) {
            id = typeCode.substring(1);
            typeCode = typeCode[0];
        }
        if (typeCode === '/') return this;
        return this[this.getEntityMapping(typeCode)][id];
    },
    getTypedId: function() {
        return '/';
    }
},
'search', {
    normalize: function(token) {
        return token
            .replace(/Ä/g, 'A').replace(/ä/g, 'a')
            .replace(/Ǟ/g, 'A').replace(/ǟ/g, 'a')
            .replace(/C̈/g, 'C').replace(/c̈/g, 'c')
            .replace(/Ë/g, 'E').replace(/ë/g, 'e')
            .replace(/Ḧ/g, 'H').replace(/ḧ/g, 'h')
            .replace(/Ï/g, 'I').replace(/ï/g, 'i')
            .replace(/Ḯ/g, 'I').replace(/ḯ/g, 'i')
            .replace(/M̈/g, 'M').replace(/m̈/g, 'm')
            .replace(/N̈/g, 'N').replace(/n̈/g, 'n')
            .replace(/Ö/g, 'O').replace(/ö/g, 'o')
            .replace(/Ȫ/g, 'O').replace(/ȫ/g, 'o')
            .replace(/Ṏ/g, 'O').replace(/ṏ/g, 'o')
            .replace(/P̈/g, 'P').replace(/p̈/g, 'p')
            .replace(/S̈/g, 'S').replace(/s̈/g, 's')
            .replace(/T̈/g, 'T').replace(/ẗ/g, 't')
            .replace(/Ü/g, 'U').replace(/ü/g, 'u')
            .replace(/Ǖ/g, 'U').replace(/ǖ/g, 'u')
            .replace(/Ǘ/g, 'U').replace(/ǘ/g, 'u')
            .replace(/Ǚ/g, 'U').replace(/ǚ/g, 'u')
            .replace(/Ǜ/g, 'U').replace(/ǜ/g, 'u')
            .replace(/Ṳ/g, 'U').replace(/ṳ/g, 'u')
            .replace(/Ṻ/g, 'U').replace(/ṻ/g, 'u')
            .replace(/V̈/g, 'V').replace(/v̈/g, 'v')
            .replace(/Ẅ/g, 'W').replace(/ẅ/g, 'w')
            .replace(/Ẍ/g, 'X').replace(/ẍ/g, 'x')
            .replace(/Ÿ/g, 'Y').replace(/ÿ/g, 'y')
            .replace(/[^A-Za-z0-9]/, '')
            .toLowerCase()
            .substring(0, 12);
    },
    tokenize: function(string) {
        return string
            .replace(/[\.\-\_\/\\\(\)\[\]\{\}\:\;\"\'\=\+\!\?\#\$\%\&\,]/, ' ')
            .split(/\s/)
            .map(this.normalize)
            .reject(function(t) { return t.length < 2})
            .sort()
            .uniq(true);
    },
    addIndexEntry: function(entity, keyword) {
        var curLevel = this.index;
        var n = keyword.length;
        for (var i = 0; i < n; i++) {
            var l = curLevel[keyword[i]];
            if (!l) {
                l = curLevel[keyword[i]] = {_:[]};
            }
            curLevel = l;
            curLevel._.pushIfNotIncluded(entity);
        }
    },
    indexEntity: function(entity) {
        this.tokenize(entity.getSearchDocument())
            .each(this.addIndexEntry.bind(this, entity));
    },
    lookup: function(keyword) {
        var i = -1, l = this.index, n = keyword.length;
        while (l && (++i < n)) l = l[keyword[i]];
        return l ? l._ : [];
    },
    search: function(query) {
        var keywords = this.tokenize(query);
        if (keywords.length < 1) return [];
        var results = this.lookup(keywords[0]);
        for (var i = 1; i < keywords.length; i++) {
            results = results.intersect(this.lookup(keywords[i]));
        }
        return results.slice(0,80).select(function(e) { return !!this.get(e.getTypedId()) }, this);
    }
},
'serialization', {
    getSerializer: function() {
        var serializer = ObjectGraphLinearizer.forNewLivelyCopy();
        var ignoreConnections = new GenericFilter();
        ignoreConnections.addPropertyToIgnore('attributeConnections');
        ignoreConnections.addPropertyToIgnore('doNotSerialize');
        ignoreConnections.addPropertyToIgnore('doNotCopyProperties');
        serializer.addPlugin(ignoreConnections);
        return serializer;
    }
},
'loading', {
    loadFromFile: function() {
        // override in subclass
    },
    loadComplete: function(content) {
        try {
            var data = this.getSerializer().deserialize(content);
            this.hash = data.hash;
            this.users = data.users;
            this.projects = data.projects;
            this.notes = data.notes;
            this.connectAll();
            this.indexAll();
            return {};
        } catch(e) {
            console.error(e, e.stack);
            return {error: e};
        }
    }
},
'synchronization', {
    receiveChange: function(subject, message, value, user, timestamp, prevHash) {
        var change = new org.model.Change(this);
        change.receive(subject, message, value, user, timestamp, prevHash);
        return change;
        // add additional behavior in subclass
    }
},
'saving', {
    asData: function() {
        return this.getSerializer().serializeToJso({
            hash: this.hash,
            users: this.users,
            projects: this.projects,
            notes: this.notes
        });
    },
    connectAll: function() {
        var connectChange = function(key, entity) {
            entity.onChanged(this, 'changedEntity');
        };
        Properties.forEachOwn(this.users, connectChange, this);
        Properties.forEachOwn(this.projects, connectChange, this);
        Properties.forEachOwn(this.notes, connectChange, this);
    },
    saveToFile: function() {
        // override in subclass
    },
    saveComplete: function() {
        console.log("Succesfully saved entities");
    }
});

org.model.EntityHub.subclass('org.model.ClientHub',
'settings', {
    sendBufferTime: 5000
},
'serialization', {
    doNotSerialize: ['socket']
},
'entities', {
    changedEntity: function($super, changeParams) {
        $super(changeParams);
        if (!this.isReceiving) {
            var entity = changeParams[0],
                message = changeParams[1],
                value = changeParams[2],
                oldValue = changeParams[3];
            this.sendChange(entity, message, value, oldValue);
        }
    },
    createProject: function($super, optId) {
        var project = $super(optId);
        this.sendChange(this, '+project', project);
        return project;
    },
    createUser: function($super, optId) {
        var user = $super(optId);
        this.sendChange(this, '+user', user);
        return user;
    },
    createNote: function($super) {
        var note = $super();
        this.sendChange(this, '+note', note);
        this.sendChange(note, '=creator', note.getCreator());
        this.sendChange(note, '=creationDate', note.getCreationDate());
        return note;
    },
    deleteNote: function(note) {
        this.sendChange(this, '-note', note);
        this.removeNote(note);
    }
},
'loading', {
    fileURI: function() {
        var name = Config.get('orgFile', true);
        return name ? name : URL.root.withFilename('nodejs/org/');
    },
    loadFromFile: function() {
        var webR = this.fileURI().asWebResource().beAsync();
        connect(webR, 'content', this, 'loadComplete', {
            updater: function($upd, content) {
                if (this.sourceObj.status &&
                    this.sourceObj.status.isDone()) $upd(content);
            }
        });
        webR.get();
    }
},
'synchronization', {
    syncURL: function() {
        var url;
        if (Config.orgServer) {
            url = Config.orgServer;
        } else {
            var host = URL.codeBase.hostname;
            url = 'http://' + host + ':8114/socket.io';
        }
        return url;
    },
    syncHost: function() {
        var url = new URL(this.syncURL());
        return url.protocol + '://' + url.hostname + (url.port ? ':' + url.port : '');
    },
    syncResource: function() {
        var url = this.syncURL();
        return url.match(/\/([^\/]+)$/)[1];
    },
    connect: function() {
        if (!Global.io) {
            require([]).requiresLib({
                url: this.syncURL() + "/socket.io.js", loadTest: function() { return !!Global.io; }
            }).toRun(this.connectComplete.bind(this));
        }
    },
    connectComplete: function() {
        this.socket = io.connect(this.syncHost(), {resource: this.syncResource()});
        this.socket.on('change', this.receiveChange.bind(this));
        this.socket.on('ok', this.successfulChange.bind(this));
        this.pendingChanges = [];
        lively.bindings.signal(this, 'synchronized', this);
        return {}; // no error reporting yet
    },
    currentHash: function() {
        var sentChanges = this.pendingChanges
            .select(function(change) { return change.wasSent; });
        return sentChanges.length > 0 ? sentChanges.last().hash : this.hash;
    },
    discardRedundantUpdates: function(change) {
        this.pendingChanges = this.pendingChanges.reject(function(pending) {
            return !pending.wasSent && pending.isRedundant(change);
        });
    },
    successfulChange: function(hash) {
        console.log('<- ok ' + hash);
        if (this.pendingChanges.first().hash === hash) {
            this.pendingChanges.shift();
        }
        if (this.pendingChanges.length === 0) {
            lively.bindings.signal(this, 'synchronized', this);
        }
        this.hash = hash;
    },
    rollbackPendingChanges: function() {
        this.pendingChanges.reverse().invoke('undo');
        this.pendingChanges = [];
    },
    receiveChange: function($super, subject, message, value, user, timestamp, prevHash) {
        var change = $super(subject, message, value, user, timestamp, prevHash);
        if (this.hash !== prevHash) throw new Error("This should never happen.");
        var obsoleteChanges = this.pendingChanges.clone();
        this.rollbackPendingChanges();
        change.apply();
        this.hash = change.hash;
        obsoleteChanges.each(function(change) {
            change.apply();
            this.sendChange(change.subject, change.message, change.value);
        }.bind(this));
        return change;
    },
    sendChange: function(subject, message, value, oldValue) {
        if (this.pendingChanges.length === 0) {
            lively.bindings.signal(this, 'unsaved', this);
        }
        var change = new org.model.Change(this);
        change.init(subject, message, value, oldValue);
        this.discardRedundantUpdates(change);
        this.pendingChanges.push(change);
        this.sendPendingChanges();
        return change;
    },
    sendPendingChangesImpl: function() {
        var prevHash = this.currentHash();
        lively.bindings.signal(this, 'synchronizing', this);
        this.pendingChanges
            .select(function(change) { return !change.wasSent; })
            .each(function(change) {
                change.send(this.socket.emit.bind(this.socket), prevHash);
                prevHash = change.hash;
            }, this);
    },
    sendPendingChanges: function() {
        this.sendPendingChanges = Functions.debounce(
            this.sendBufferTime,
            this.sendPendingChangesImpl.bind(this));
        this.sendPendingChanges();
    }
},
'saving', {
    saveToFile: function() {
        var webR = this.fileURI().asWebResource().beAsync();
        connect(webR, 'content', this, 'saveComplete', {
            updater: function($upd, content) {
                if (this.sourceObj.status &&
                    this.sourceObj.status.isDone()) $upd();
            }
        });
        webR.put(JSON.stringify(this.asData()), 'application/json');
    }
});

Object.subclass('org.model.Change',
'initialization', {
    initialize: function(hub) {
        this.hub = hub;
    },
    init: function(subject, message, optValue, optOldValue) {
        this.subject = subject;
        this.message = message;
        this.value = optValue;
        this.oldValue = optOldValue;
        this.timestamp = (new Date()).getTime();
    },
    computeHash: function(components) {
        var hashCode = components.join('').hashCode();
        if (hashCode < 0) {
            hashCode += 0x100000000;
        }
        var hash = hashCode.toString(16);
        hash = hash.substring(hash.length - 8);
        hash = Strings.pad(hash, 8 - hash.length, true).replace(' ', '0');
        if (this.hash === undefined) return this.hash = hash;
        if (this.hash !== hash) throw Error('Hash changed!');
        return this.hash;
    }
},
'application', {
    opcode: {
        "+": "add",
        "=": "set",
        "-": "remove"
    },
    inverseOp: {
        "+": "-",
        "=": "=",
        "-": "+"
    },
    methodName: function() {
        return this.opcode[this.message[0]] + this.message.substring(1).capitalize();
    },
    apply: function() {
        var methodName = this.methodName();
        var method = this.subject[methodName];
        if (!method || !Object.isFunction(method)) {
            console.error('Received invalid change, no method ' + methodName);
        }
        try {
            this.hub.isReceiving = true;
            method.call(this.subject, this.value);
        } finally {
            delete this.hub.isReceiving;
        }
    },
    undo: function() {
        var message = this.inverseOp[this.message[0]] + this.message.substring(1);
        var value = this.message[0] === '=' ? this.oldValue : this.value;
        var unchange = new org.model.Change(this.hub);
        unchange.init(this.subject, message, value);
        unchange.apply();
    }
},
'comparison', {
    isRedundant: function(otherChange) {
        return this.message[0] === '=' &&
               otherChange.subject == this.subject &&
               otherChange.message == this.message;
    }
},
'serialization', {
    serialize: function(obj) {
        // serialize entities as references
        if (obj instanceof org.model.Entity) {
            return obj.getReference();
        }
        if (obj instanceof Date) {
            return {$t: obj.getTime()};
        }
        return obj;
    },
    deserialize: function(obj) {
        // deserialize references to entities
        if (obj && Object.isObject(obj)) {
            if (typeof obj.$r === "string") {
                var typeCode = obj.$r[0];
                var id = obj.$r.substring(1);
                var entity = this.hub.get(typeCode, id);
                if (!entity) {
                    var constr = this.hub.getType(typeCode);
                    entity = new constr(id);
                }
                return entity;
            }
            if (typeof obj.$t === "number") {
                return new Date(obj.$t);
            }
        }
        return obj;
    }
},
'networking', {
    send: function(send, prevHash) {
        var subjectID = this.subject.getTypedId();
        var serializedValue = this.value && this.serialize(this.value);
        if (!this.user) this.user = this.hub.me().id;
        var components = [
            this.subject.getTypedId(),
            this.message,
            this.serialize(this.value),
            this.user,
            this.timestamp,
            prevHash];
        this.computeHash(components);
        var output = components.map(String).invoke('truncate', 16);
        console.log('-> ' + output.join(' '));
        components.pushAt('change', 0);
        send.apply(this, components);
        this.wasSent = true;
    },
    receive: function(subject, message, value, user, timestamp, prevHash) {
        var components = Array.from(arguments);
        this.computeHash(components);
        this.subject = this.hub.get(subject);
        this.message = message;
        this.value = this.deserialize(value);
        this.user = user;
        this.timestamp = timestamp;
        var output = components.map(String).invoke('truncate', 16);
        console.log('<- ' + output.join(' '));
    }
});

Object.subclass('org.model.Entity',
'settings', {
    typeCode: '-'
},
'initialization', {
    newId: function() {
        return (new UUID()).id;
    },
    initialize: function(optId) {
        this.id = optId || this.newId();
        this.notes = [];
    }
},
'accessing', {
    getId: function() {
        return this.id;
    },
    addNote: function(note) {
        if (!this.notes.include(note)) {
            this.notes.push(note);
            note.setEntity(this);
            this.changed("+note", note);
        }
    },
    removeNote: function(note) {
        if (this.notes.include(note)) {
            this.notes.remove(note);
            note.setEntity(null);
            this.changed("-note", note);
        }
    },
    getNotes: function() {
        return this.notes;
    },
    toString: function() {
        return this.id;
    }
},
'meta', {
    getTypedId: function() {
        return this.typeCode + this.id;
    },
    getReference: function() {
        return {$r: this.getTypedId()};
    }
},
'updating', {
    set: function(prop, value) {
        var oldValue = this[prop];
        this[prop] = value;
        this.changed("=" + prop, value, oldValue);
    },
    changed: function(message, optValue, optOldValue) {
        var args = [this, message];
        if (optValue !== undefined) args.push(optValue);
        if (optOldValue !== undefined) args.push(optOldValue);
        lively.bindings.signal(this, 'change', args);
        lively.bindings.signal(this, 'change' + message.substring(1).capitalize(), args);
    },
    onChanged: function(optChangedProp, targetObj, targetProp) {
        var msg = 'change';
        if (!targetProp) {
            targetProp = targetObj;
            targetObj = optChangedProp;
        } else {
            msg += optChangedProp.capitalize();
        }
        return lively.bindings.connect(this, msg, targetObj, targetProp);
    },
    onDeleted: function(targetObj, targetProp) {
        return lively.bindings.connect(this, "delete", targetObj, targetProp);
    },
    offChanged: function(optChangedProp, targetObj, targetProp) {
        var msg = 'change';
        if (!targetProp) {
            targetProp = targetObj;
            targetObj = optChangedProp;
        } else {
            msg += optChangedProp.capitalize();
        }
        return lively.bindings.disconnect(this, msg, targetObj, targetProp);
    },
    offDeleted: function(targetObj, targetProp) {
        return lively.bindings.disconnect(this, "delete", targetObj, targetProp);
    },
    remove: function() {
        lively.bindings.signal(this, "delete");
        lively.bindings.disconnectAll(this);
    }
},
'searching', {
    getSearchDocument: function() {
        return '';
    }
});

org.model.Entity.subclass('org.model.User',
'settings', {
    typeCode: 'e'
},
'initialization', {
    initialize: function($super, id) {
        $super(id);
        this.projects = [];
    }
},
'accessing', {
    isAnonymous: function() {
        return this.id == "anonymous";
    },
    getName: function() {
        return (this.getFirstName() + ' ' + this.getLastName()).trim();
    },
    getLabel: function() {
        return this.getName();
    },
    getFirstName: function() {
        return this.firstName;
    },
    setFirstName: function(firstName) {
        this.set('firstName', firstName);
    },
    getLastName: function() {
        return this.lastName;
    },
    setLastName: function(lastName) {
        this.set('lastName', lastName);
    },
    getEmail: function() {
        return this.email;
    },
    setEmail: function(email) {
        this.set('email', email);
    },
    getProjects: function() {
        return this.projects;
    },
    addProject: function(project) {
        if (!this.projects.include(project)) {
            this.projects.push(project);
            project.addMember(this);
            this.changed("+project", project);
        }
    },
    removeProject: function(project) {
        if (this.projects.include(project)) {
            this.projects.remove(project);
            project.removeMember(this);
            this.changed("-project", project);
        }
    },
    getImageURL: function() {
        // hard-coded all image URLs to URL.root
        return URL.root.withFilename('nodejs/org/images/' + this.getId());
    },
    setImageURL: function() {
        // do not actually set url but update views
        this.changed("=imageURL");
    },
    getDepartment: function() {
        return this.department;
    },
    setDepartment: function(department) {
        this.set('department', department);
    },
    getPhone: function() {
        return this.phone;
    },
    setPhone: function(phone) {
        this.set('phone', phone);
    },
    getCompany: function() {
        return this.company;
    },
    setCompany: function(company) {
        this.set('company', company);
    },
    getOffice: function() {
        return this.office;
    },
    setOffice: function(office) {
        this.set('office', office);
    }
},
'searching', {
    getSearchDocument: function() {
        var results = [
            this.getFirstName(), this.getLastName(),
            this.getPhone(), this.getOffice(),
            this.getDepartment(), this.getCompany()
        ];
        return results.join(' ');
    }
});

org.model.Entity.subclass('org.model.Project',
'settings', {
    typeCode: 'p'
},
'initialization', {
    initialize: function($super, optId) {
        $super(optId);
        this.members = [];
        this.parts = [];
    }
},
'accessing', {
    getName: function() {
        return this.name;
    },
    getLabel: function() {
        return this.getName();
    },
    setName: function(name) {
        this.set('name', name);
    },
    addMember: function(member) {
        if (!this.members.include(member)) {
            this.members.push(member);
            member.addProject(this);
            this.changed("+member", member);
        }
    },
    getMembers: function() {
        return this.members;
    },
    removeMember: function(member) {
        if (this.members.include(member)) {
            this.members.remove(member);
            member.removeProject(this);
            this.changed("-member", member);
        }
    },
    getDescription: function() {
        return this.description;
    },
    setDescription: function(description) {
        this.set('description', description);
    },
    getParts: function() {
        if (!this.parts) this.parts = [];
        return this.parts;
    },
    addPart: function(part) {
        if (!this.parts.include(part)) {
            this.parts.push(part);
            this.changed('+part', part);
        }
    },
    removePart: function(part) {
        if (this.parts.include(part)) {
            this.parts.remove(part);
            this.changed('-part', part);
        }
    },
    getPartSpaceURL: function() {
        return URL.root.withFilename('org/parts/' + this.id + '/').toString();
    }
},
'searching', {
    getSearchDocument: function() {
        return this.getName() + ' ' + this.getDescription() + this.getParts().join(' ');
    }
});

org.model.Entity.subclass('org.model.Note',
'settings', {
    typeCode: 'n'
},
'initialization', {
    initialize: function($super, optId) {
        $super(optId);
        this.setContent('');
        this.setCreationDate(new Date());
    }
},
'accessing', {
    getCreationDate: function() {
        return new Date(this.creationDate);
    },
    setCreationDate: function(date) {
        if (!(date instanceof Date)) return;
        this.creationDate = date.getTime();
    },
    getCreationDateInEnglish: function() {
        var creation = moment(this.getCreationDate());
        if (moment().diff(creation, 'hours') < 12) {
            return creation.fromNow();
        } else {
            return creation.calendar();
        }
    },
    getCreator: function() {
        return this.creator;
    },
    setCreator: function(creator) {
        this.creator = creator;
    },
    getContent: function() {
        return this.content;
    },
    setContent: function(content) {
        this.set('content', content);
    },
    getEntity: function() {
        return this.entity;
    },
    setEntity: function(entity) {
        if (this.entity == entity) return;
        if (this.entity) this.entity.removeNote(this);
        this.entity = entity;
        this.changed('=entity', entity);
        if (this.entity) this.entity.addNote(this);
    },
    remove: function($super) {
        this.setEntity(null);
        return $super();
    }
},
'tagging', {
    hashTagRegEx: /\B#\w+/g,
    getTags: function() {
        return this.getContent().match(this.hashTagRegEx);
    },
    hasTag: function(tag) {
        if (!tag) return true;
        var reg = new RegExp('\B' + tag + '(?![a-zA-Z0-9_])');
        return reg.test(this.getContent());
    }
},
'searching', {
    getSearchDocument: function() {
        var creator = this.getCreator();
        return this.getContent() + (creator ? ' ' + creator.getName() : '');
    }
});


});
