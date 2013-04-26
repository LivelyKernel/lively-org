module('org.tests').requires('org.model', 'org.server', 'lively.TestFramework').toRun(function() {

Object.subclass('org.tests.DummySocket', {
    initialize: function(broadcast) {
        this.messages = [];
        if (broadcast) {
            this.broadcast = new org.tests.DummySocket();
        }
    },
    emit: function() {
        this.messages.push(Array.from(arguments));
    },
    transport: function(otherHub) {
        this.messages.each(function(m) {
            if (m[0] == 'change') {
                m.shift();
                otherHub.receiveChange.apply(otherHub, m);
            } else if (m[0] == 'ok') {
                m.shift();
                otherHub.successfulChange.apply(otherHub, m);
            }
        });
        this.messages = [];
    }
});

org.model.ClientHub.subclass('org.tests.ClientHub', {
    initialize: function($super) {
        $super();
        this.socket = new org.tests.DummySocket();
        this.pendingChanges = [];
    },
    sendPendingChanges: function() {
        this.pendingChanges.each(function(m) { m.timestamp = 13e11; });
    }
});

org.server.ServerHub.subclass('org.tests.ServerHub', {
    initialize: function($super) {
        $super();
        this.socket = new org.tests.DummySocket(true);
        this.mutex = {
            lock: function(fn) { fn(); },
            release: function() {}
        };
    },
    saveChange: function(change, cb) { cb(); },
    sendUpdates: function($super, socket, change, prevHash) {
        $super(this.socket, change, prevHash);
    }
});

TestCase.subclass('org.tests.Base',
'helping', {
    copyHub: function() {
        var data = this.hub.asData();
        this.hub.loadComplete(JSON.stringify(data));
    },
    createJohn: function() {
        var john = new org.model.User("PK1");
        john.setFirstName("John");
        john.setLastName("Doe");
        john.setEmail("john.doe@example.com");
        john.setCompany("ACME Inc.");
        john.setOffice("Sao Paulo, Brazil");
        john.setPhone("+1 555 664-2962");
        this.hub.addUser(john);
        return john;
    },
    createJane: function() {
        var jane = new org.model.User("PK2");
        jane.setFirstName("Jane");
        jane.setLastName("Doe");
        jane.setEmail("jane.doe@example.com");
        jane.setCompany("ACME Inc. Outer Rim");
        jane.setOffice("London, UK");
        this.hub.addUser(jane);
        return jane;
    },
    createOmega: function() {
        var omega = new org.model.Project("omega");
        omega.setName('Omega Project');
        omega.setDescription('An ACME project to explore the space beyond the Outer Rim.');
        this.hub.addProject(omega);
        return omega;
    },
},
'running', {
    setUp: function() {
        this.hub = new org.tests.ClientHub();
        this.john = this.createJohn();
        this.jane = this.createJane();
    }
});

org.tests.Base.subclass('org.tests.ModelTests',
'running', {
    setUp: function($super) {
        $super();
        this.omega = this.createOmega();
        this.john.addProject(this.omega);
    }
},
'testing', {
    testGetUser: function() {
        var john = this.hub.users["PK1"];
        this.assertIdentity(this.john, john);
        this.assertEquals("PK1", john.getId());
        this.assertEquals("John", john.getFirstName());
        this.assertEquals("Doe", john.getLastName());
        this.assertEquals("John Doe", john.getName());
        this.assertEquals("john.doe@example.com", john.getEmail());
        this.assertEquals("+1 555 664-2962", john.getPhone());
        this.assertEquals("ACME Inc.", john.getCompany());
        this.assertEquals("Sao Paulo, Brazil", john.getOffice());
    },
    testAnonymous: function() {
        var anon = this.hub.users["anonymous"];
        this.assert(anon.isAnonymous());
        this.assertEquals("Anonymous", anon.getFirstName());
        this.assertEquals("", anon.getLastName());
        this.assertEquals("Anonymous", anon.getName());
    },
    testGetWithType: function() {
        var type = org.model.User.prototype.typeCode;
        var john = this.hub.get(type, 'PK1');
        var john2 = this.hub.users['PK1'];
        this.assertIdentity(this.john, john);
        this.assertIdentity(john, john2);
    },
    testGetProject: function() {
        var omega = this.hub.getProjects().first();
        this.assertIdentity(this.omega, omega);
        this.assertEquals("Omega Project", omega.getName());
    },
    testGetProjectsOfUser: function() {
        this.assertEqualState([this.omega], this.john.getProjects());
        this.assertEqualState([], this.jane.getProjects());
    },
    testGetProjectMembers: function() {
        this.assertEqualState([this.john], this.omega.getMembers());
    },
    testUserImageURL: function() {
        this.assertEquals(
            URL.root + "nodejs/org/images/PK1",
            this.john.getImageURL());
        this.assertEquals(
            URL.root + "nodejs/org/images/PK2",
            this.jane.getImageURL());
    },
    testUpdateProject: function() {
        var desc = "A project to enable people to control their dreams.";
        this.omega.setDescription(desc);
        this.assertEquals(desc, this.omega.getDescription());
    },
    testSearchIndex: function() {
        var a = {getSearchDocument: function() { return 'aa'; }};
        this.hub.initializeIndex(); // reset index
        this.hub.indexEntity(a);
        this.assertEqualState({a: {_: [a]}, _: {}}, this.hub.index.a);
        this.assertEqualState([a], this.hub.lookup('aa'));
    },
    testUniversalSearch: function() {
        this.assertEqualState([this.omega], this.hub.search("omega"));
        this.assertEqualState([this.omega], this.hub.search("beyond"));
        this.assertEqualState([this.jane, this.omega], this.hub.search("outer rim"));
        this.assertEqualState([this.jane, this.omega], this.hub.search("Outer Rim"));
        this.assertEqualState([this.john, this.jane, this.omega], this.hub.search("ACME"));
        this.assertEqualState([this.john, this.jane], this.hub.search("doe"));
        this.assertEqualState([], this.hub.search("bfghz"));
    },
    testCreateNewNote: function() {
        var note = this.hub.createNote();
        var creator = note.getCreator();
        this.assertIdentity(this.hub.me(), creator);
        this.epsilon = 1000;
        this.assertEqualsEpsilon(new Date(), note.getCreationDate());
        var sameNote = this.hub.notes[note];
        note.setContent("foobar");
        this.assertEquals(sameNote.getContent(), note.getContent());
    },
    testFindNote: function() {
        var note = this.hub.createNote();
        note.setContent('Lorem ipsum dolor sit amet');
        this.assertEqualState([note], this.hub.search("Lorem"));
        this.assertEqualState([note], this.hub.search("lorem"));
        this.assertEqualState([], this.hub.search("loren"));
        this.assertEqualState([note], this.hub.search("lor"));
        this.assertEqualState([], this.hub.search("olo"));
    },
    testAttachNote: function() {
        var note = this.hub.createNote();
        note.setContent('Lorem ipsum dolor sit amet');
        this.john.addNote(note);
        this.assertIdentity(this.john, note.getEntity());
        this.assertEqualState([note], this.john.getNotes());
    },
    testDetachNote: function() {
        var note = this.hub.createNote();
        note.setContent('Lorem ipsum dolor sit amet');
        this.john.addNote(note);
        this.john.removeNote(note);
        this.assertIdentity(null, note.getEntity());
        this.assertEqualState([], this.john.getNotes());
    },
    testNoteEnglishDate: function() {
        var note = this.hub.createNote(),
            now = new Date();

        var fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        note.setCreationDate(fiveMinutesAgo);
        this.assertEquals("5 minutes ago", note.getCreationDateInEnglish());

        var halfADayAgo = new Date(now.getTime() - 13 * 60 * 60 * 1000);
        note.setCreationDate(halfADayAgo);
        var englishDay = /^(Yester|To)day at [0-2][0-9]?:[0-5][0-9]$/;
        this.assert(englishDay.test(note.getCreationDateInEnglish()));

        var sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        note.setCreationDate(sixMonthsAgo);
        var englishDate = sixMonthsAgo.format("d mmm yyyy");
        this.assertEquals(englishDate, note.getCreationDateInEnglish());
    },
    testRemoveNote: function() {
        var note = this.hub.createNote();
        note.setContent('Lorem ipsum dolor sit amet');
        this.john.addNote(note);
        this.hub.removeNote(note);
        this.assertIdentity(null, note.getEntity());
        this.assertEqualState([], this.john.getNotes());
        this.assertEqualState([], this.hub.getNotes());
        this.assertEqualState([], this.hub.search("Lorem"));
    },
    testAssignProject: function() {
        this.jane.addProject(this.omega);
        this.assertEqualState([this.omega], this.jane.getProjects());
        this.assertEqualState([this.john, this.jane], this.omega.getMembers());
    },
    testAddProjectMember: function() {
        this.omega.addMember(this.jane);
        this.assertEqualState([this.omega], this.jane.getProjects());
        this.assertEqualState([this.john, this.jane], this.omega.getMembers());
    },
    testUnassignProject: function() {
        this.john.removeProject(this.omega);
        this.assertEqualState([], this.john.getProjects());
        this.assertEqualState([], this.omega.getMembers());
    },
    testRemoveProjectMember: function() {
        this.omega.removeMember(this.john);
        this.assertEqualState([], this.john.getProjects());
        this.assertEqualState([], this.omega.getMembers());
    },
    testTags: function() {
        var note = this.hub.createNote();
        note.setContent('#Lorem() ipsum #dolor s#it #amet.');
        var expectedTags = ['#Lorem', '#dolor', '#amet'];
        this.assertEqualState(expectedTags, note.getTags());
        expectedTags.each(function(tag) {
            this.assert(note.hasTag(tag));
        }, this);
    },
    testSearchGroupsForNotes: function() {
        var note = this.hub.createNote();
        this.assertEquals('Today', note.getSearchGroup());
        note.setCreationDate(new Date(2008, 11, 24));
        this.assertEquals('24 Dec 2008', note.getSearchGroup());
    }
});

org.tests.Base.subclass('org.tests.ChangeTests',
'running', {
    setUp: function($super) {
        $super();
        this.omega = this.createOmega();
        this.tau = this.createTau();
        this.john.addProject(this.omega);
        this.hub.pendingChanges = [];
        var data = JSON.stringify(this.hub.asData());
        this.hub2 = new org.tests.ClientHub();
        this.hub2.loadComplete(data);
        this.omega2 = this.hub2.projects.omega;
        this.tau2 = this.hub2.projects.tau;
        this.server = new org.tests.ServerHub();
        this.server.loadComplete(data);
    }
},
'helping', {
    createTau: function() {
        var tau = this.hub.createProject('tau');
        tau.setName('Tau Project');
        tau.setDescription('A project to create products which reverse the human aging process.');
        return tau;
    },
    assertSync: function() {
        this.assertEqualState(this.hub.asData(), this.server.asData());
        this.assertEqualState(this.hub.asData(), this.hub2.asData());
        this.assertEqualState([], this.hub.pendingChanges);
        this.assertEqualState([], this.hub2.pendingChanges);
    },
    assertMessage: function(hub, subject, message, value, username, optPrevHash) {
        var msg = hub.socket.messages.shift();
        this.assertEqualState(subject, msg[1]);
        this.assertEqualState(message, msg[2]);
        this.assertEqualState(value, msg[3]);
        this.assertEqualState(username, msg[4]);
        if (optPrevHash !== undefined) {
            this.assertEqualState(optPrevHash, msg[6]);
        }
    },
    sync: function() {
        this.hub.sendPendingChangesImpl();
        this.hub.socket.transport(this.server);
        this.server.socket.transport(this.hub);
        this.server.socket.broadcast.transport(this.hub2);
        this.hub2.sendPendingChangesImpl();
        this.hub2.socket.transport(this.server);
        this.server.socket.transport(this.hub2);
        this.server.socket.broadcast.transport(this.hub);
        this.assertSync();
    }
},
'testing', {
    testSimpleChanges: function() {
        var desc = "A project to enable people to control their dreams.";
        this.omega.setDescription(desc);
        this.hub.sendPendingChangesImpl();
        this.assertMessage(this.hub, "pomega", "=description", desc, "anonymous", "00000000");
        var desc2 = "A project to create affordable personal levitation devices.";
        this.omega.setDescription(desc2);
        this.hub.sendPendingChangesImpl();
        this.assertMessage(this.hub, "pomega", "=description", desc2, "anonymous", "e96a8414");
    },
    testDiscardRedundantChanges: function() {
        var desc = "A project to enable people to control their dreams.";
        this.omega.setDescription(desc);
        var desc2 = "A project to create affordable personal levitation devices.";
        this.omega.setDescription(desc2);
        this.hub.sendPendingChangesImpl();
        this.assertMessage(this.hub, "pomega", "=description", desc2, "anonymous", "00000000");
    },
    testStartsSynced: function() {
        this.assertSync();
    },
    testUpdateProject: function() {
        var desc = "A project to enable people to control their dreams.";
        this.omega.setDescription(desc);
        this.sync();
    },
    testRollbackUpdateProject: function() {
        var oldDesc = this.omega.getDescription();
        var newDesc = "A project to enable people to control their dreams.";
        this.omega.setDescription(newDesc);
        this.assertEquals(1, this.hub.pendingChanges.length);
        var change = this.hub.pendingChanges[0];
        this.assertEquals(newDesc, this.omega.getDescription());
        this.hub.rollbackPendingChanges();
        this.assertEquals(oldDesc, this.omega.getDescription());
        change.apply();
        this.assertEquals(newDesc, this.omega.getDescription());
    },
    testConcurrentUpdates: function() {
        var desc2 = "A project to create affordable personal levitation devices.";
        var desc = "A project to enable people to control their dreams.";
        this.tau2.setDescription(desc2);
        this.omega.setDescription(desc);
        this.hub2.sendPendingChangesImpl();
        this.hub.sendPendingChangesImpl();
        this.hub2.socket.transport(this.server);
        this.hub.socket.transport(this.server);
        // both hub and hub2 have pending changes and wait for the servers' response
        this.assertEquals(1, this.hub.pendingChanges.length);
        this.assertEquals(1, this.hub2.pendingChanges.length);
        this.assertEqualState( // hub2 was first, so it gets ok
            [['ok', '2a4c7e0f']],
            this.server.socket.messages);
        this.assertEqualState( // hub2 was too late, it gets the other change
            [["change", "ptau", "=description", desc2, "anonymous", 13e11, "00000000"]],
            this.server.socket.broadcast.messages);
        // send messages from the server to hub and hub2
        this.server.socket.transport(this.hub2);
        this.server.socket.broadcast.transport(this.hub);
        // hub2 is already up-to-date
        this.assertEquals(this.server.hash, this.hub2.hash);
        this.assertEqualState([], this.hub2.pendingChanges);
        // hub got the change, applied it first and applied its own change on top of it
        this.assertEquals(desc, this.omega.getDescription());
        this.assertEquals(desc2, this.tau.getDescription());
        this.assertEquals(this.server.hash, this.hub.hash);
        this.assertEquals(1, this.hub.pendingChanges.length);
        this.assertEquals(this.omega, this.hub.pendingChanges[0].subject);
        this.assertEquals("=description", this.hub.pendingChanges[0].message);
        this.assertEquals(desc, this.hub.pendingChanges[0].value);
        // sending this pending change will sync server and hub2 again
        this.sync();
        this.assertEquals(desc, this.omega.getDescription());
        this.assertEquals(desc, this.omega2.getDescription());
        this.assertEquals(desc2, this.tau.getDescription());
        this.assertEquals(desc2, this.tau2.getDescription());
    },
    testConflictingUpdates: function() {
        var desc2 = "A project to create affordable personal levitation devices.";
        var desc = "A project to enable people to control their dreams.";
        this.omega2.setDescription(desc2);
        this.omega.setDescription(desc);
        this.hub2.sendPendingChangesImpl();
        this.hub.sendPendingChangesImpl();
        this.hub2.socket.transport(this.server);
        this.hub.socket.transport(this.server);
        // both hub and hub2 have pending changes and wait for the servers' response
        this.assertEquals(1, this.hub.pendingChanges.length);
        this.assertEquals(1, this.hub2.pendingChanges.length);
        this.assertEqualState( // hub2 was first, so it gets ok
            [['ok', '249c33f6']],
            this.server.socket.messages);
        this.assertEqualState( // hub2 was too late, it gets the other change
            [["change", "pomega", "=description", desc2, "anonymous", 13e11, "00000000"]],
            this.server.socket.broadcast.messages);
        // send messages from the server to hub and hub2
        this.server.socket.transport(this.hub2);
        this.server.socket.broadcast.transport(this.hub);
        // hub2 is already up-to-date
        this.assertEquals(this.server.hash, this.hub2.hash);
        this.assertEqualState([], this.hub2.pendingChanges);
        // hub got the change, applied it first and applied its own change on top of it
        this.assertEquals(this.server.hash, this.hub.hash);
        this.assertEquals(1, this.hub.pendingChanges.length);
        // sending this pending change will sync server and hub2 again
        this.sync();
        this.assertEquals(desc, this.omega.getDescription());
        this.assertEquals(desc, this.omega2.getDescription());
    },
    testCreateNote: function() {
        var note = this.hub.createNote();
        var str = "Lorem ipsum dolor sit amet.";
        note.setContent(str);
        this.hub.sendPendingChangesImpl();
        this.assertMessage(this.hub, "/", "+note", note.getReference(), "anonymous", "00000000");
        var nid = note.getTypedId();
        var me = this.hub.me().getReference();
        this.assertMessage(this.hub, nid, "=creator", me, "anonymous", "09dca58b");
        var creation = {$t: note.getCreationDate().getTime()};
        this.assertMessage(this.hub, nid, "=creationDate", creation, "anonymous");
        this.assertMessage(this.hub, nid, "=content", str, "anonymous");
    },
    testDeleteNote: function() {
        var note = this.hub.createNote();
        note.setContent("Lorem ipsum dolor sit amet.");
        this.sync();
        this.hub.deleteNote(note);
        this.sync();
    },
    testCreateProject: function() {
        var project = this.hub.createProject();
        project.setName("Aldabaran");
        project.setDescription("Lorem ipsum dolor sit amet.");
        this.sync();
    },
    testTwoNotesSimultaneously: function() {
        var noteA = this.hub.createNote();
        noteA.setContent("Lorem ipsum dolor sit amet.");
        var noteB = this.hub2.createNote();
        noteB.setContent("Example text.");
        this.hub.sendPendingChangesImpl();
        this.hub2.sendPendingChangesImpl();
        this.sync();
    },
    testAssignProject: function() {
        this.john.addProject(this.tau);
        this.sync();
    },
    testAddProjectMember: function() {
        this.tau.addMember(this.john);
        this.sync();
    },
    testUnassignProject: function() {
        this.john.removeProject(this.omega);
        this.sync();
    },
    testRemoveProjectMember: function() {
        this.omega.removeMember(this.john);
        this.sync();
    }
});

}) // end of module
