module('org.ui').requires('org.model').toRun(function() {

org.model.Entity.addMethods({
    createIcon: function() {
        // override in subclasses
    }
});

org.model.User.addMethods({
    createIcon: function(dark) {
        return new org.ui.UserIcon(this, dark);
    }
});

org.model.Project.addMethods({
    createIcon: function() {
        return new org.ui.ProjectIcon(this);
    }
});

org.model.Note.addMethods({
    createIcon: function(big) {
        return new org.ui.NoteIcon(this, big);
    }
});

Object.extend(org.ui, {
    lightBlue: Color.fromString('#D4D4E6'),
    blue: Color.fromString('#FF3333'),
    lightRed: Color.fromString('#E6D4D4'),
    red: Color.fromString('#337F7F')
});

lively.morphic.Box.subclass("org.ui.Box", {
    initialize: function($super, layoutClass, padding, spacing) {
        $super(lively.rect(0, 0, 105, 105));
        this.ignoreEvents();
        //this.disableHalos();
        this.layout = {resizeWidth: true, resizeHeight: true};
        var layouter = new layoutClass(this);
        layouter.setBorderSize(padding === undefined ? 20 : padding);
        layouter.setSpacing(spacing === undefined ? 20 : spacing);
        layouter.displaysPlaceholders = Functions.False;
        Object.addScript(layouter, function orderedSubmorphs(submorphs) {
            return submorphs.reject(function(ea) {
                return ea.isEpiMorp || !ea.isLayoutable;
            });
        });
    }
});

org.ui.Box.subclass("org.ui.HBox", {
    initialize: function($super, padding, spacing) {
        $super(lively.morphic.Layout.HorizontalLayout, padding, spacing);
    }
});

org.ui.Box.subclass("org.ui.VBox", {
    initialize: function($super, padding, spacing) {
        $super(lively.morphic.Layout.VerticalLayout, padding, spacing);
    }
});

Object.subclass('org.ui.Workspace',
'initialization', {
    initialize: function(world, options) {
        this.world = world;
        this.options = options;
        this.setupStyle();
        this.setupStatusBox();
        this.loadData();
    },
    initializeUserInterface: function() {
        if (!this.status) this.setupStatusBox();
        this.connectViews();
        if (!this.options.minimal) {
            this.setupSearchBar();
            this.setupTrashCan();
            this.setupStickyNoteStack();
            this.setupCreateProjectIcon();
        }
        this.prepareWorld();
    },
    setupStyle: function() {
        this.world.loadStyleSheetFromFile(URL.root.withFilename('org/style.css'));
        var newX = Math.max(window.innerWidth - 20, this.world.getExtent().x);
        var newY = Math.max(window.innerHeight, this.world.getExtent().y);
        this.world.setExtent(lively.pt(newX, newY));
    },
    setupSearchBar: function() {
        var zoom = this.world.getZoomLevel(),
            pos = this.world.getScrollOffset().addPt(pt(5,0)),
            extent = pt((this.world.visibleBounds().width - 10) * zoom, 150);
        var searchBar = new org.ui.SearchBar(pos.extent(extent), this.hub);
        searchBar.setScale(1/zoom);
        var flap = searchBar.openInFlap('top');
        searchBar.setScale(1);
        searchBar.setPosition(pt(0,0));
        searchBar.setName('SearchBar');
        if (UserAgent.isTouch) {
            searchBar.invoke('disableSelection');
        }
        flap.setName('SearchBar_Flap');
        flap.setBorderRadius(0);
    },
    setupTrashCan: function() {
        var available = Math.min(this.world.visibleBounds().height / 8,
                                 this.world.visibleBounds().width / 8),
            offset = this.status.getBounds().extent().withX(0),
            bottomLeft = this.world.visibleBounds().bottomLeft(),
            pos = bottomLeft.subPt(lively.pt(0,available)).subPt(offset),
            bounds = pos.extent(pt(available, available).scaleBy(this.world.getZoomLevel()));
        var trashCan = new org.ui.TrashCan(bounds);
        trashCan.setScale(1 / this.world.getZoomLevel());
        this.world.addMorph(trashCan);
        trashCan.setFixed();
        if (UserAgent.isTouch) trashCan.disableSelection();
        trashCan.setName('TrashCan');
    },
    setupStickyNoteStack: function() {
        var available = Math.min(this.world.visibleBounds().height / 8,
                                 this.world.visibleBounds().width / 8),
            offset = this.status.getBounds().extent().withX(0),
            bottomLeft = this.world.visibleBounds().bottomLeft(),
            pos = bottomLeft.subPt(lively.pt(-available,available)).subPt(offset),
            bounds = pos.extent(pt(available, available).scaleBy(this.world.getZoomLevel()));
        var stickyNoteStack = new org.ui.StickyNoteStack(bounds, this.hub);
        stickyNoteStack.setScale(1 / this.world.getZoomLevel());
        this.world.addMorph(stickyNoteStack);
        stickyNoteStack.setFixed();
        if (UserAgent.isTouch) {
            stickyNoteStack.setDraggableWithoutHalo(true);
            stickyNoteStack.disableSelection();
        }
        stickyNoteStack.setName('StickyNoteStack');
    },
    setupCreateProjectIcon: function() {
        var available = Math.min(this.world.visibleBounds().height / 8,
                                 this.world.visibleBounds().width / 8),
            offset = this.status.getBounds().extent().withX(0),
            bottomLeft = this.world.visibleBounds().bottomLeft(),
            pos = bottomLeft.subPt(lively.pt(2 * -available,available)).subPt(offset),
            bounds = pos.extent(pt(available, available).scaleBy(this.world.getZoomLevel()));
        var createProjectIcon = new org.ui.CreateProjectIcon(bounds, this.hub);
        createProjectIcon.setScale(1 / this.world.getZoomLevel());
        this.world.addMorph(createProjectIcon);
        createProjectIcon.setFixed();
        if (UserAgent.isTouch) {
            createProjectIcon.setDraggableWithoutHalo(true);
            createProjectIcon.disableSelection();
        }
        createProjectIcon.setName('CreateProjectIcon');
    },
    setupStatusBox: function() {
        var statusBox = this.world.get("StatusBox");
        if (!statusBox) {
            statusBox = new org.ui.StatusBox();
            this.world.addMorph(statusBox);
        }
        var offset = statusBox.getBounds().extent().withX(0);
        statusBox.setScale(1 / this.world.getZoomLevel());
        statusBox.setPosition(this.world.visibleBounds().bottomLeft().subPt(offset));
        statusBox.setFixed();
        this.status = statusBox;
    },
    prepareWorld: function() {
        var onstore = function() { workspace.tearDown(); };
        onstore.asScriptOf(this.world, "onstore", {workspace: this});
        this.world.addScript(function onHTML5Drop(evt) {
            var target = evt.srcElement || evt.target;
            if (this.renderContext().shapeNode === target) {
                return $super(evt);
            }
            return false;
        });
        var weakRef = {
            ref: this,
            call: function() { if (this.ref) this.ref.initializeUserInterface(); },
            doNotSerialize: ['ref']
        };
        lively.bindings.connect(this.world, 'savingDone', weakRef, 'call');
    },
    login: function() {
        var list = this.hub.getUsers().map(function(u) {
            return {isListItem: true, value: u.id, string: u.getName()};
        });
        return this.world.askForUserNameInList(list);
    }
},
'synchronization', {
    loadData: function() {
        this.status.status('Loading entities...');
        this.hub = new org.model.ClientHub();
        this.hub.loadFromFile.bind(this.hub).delay(3);
        lively.bindings.connect(this.hub, 'loadComplete', this, 'loadComplete');
    },
    loadComplete: function(resp) {
        if (resp.error) {
            this.status.error(resp.error);
        } else {
            this.status.ok("Successfully loaded entities!", 2000);
            this.status.status('Connecting to server...');
            lively.bindings.connect(this.hub, 'connectComplete', this, 'connectComplete');
            lively.bindings.connect(this.hub, 'unsaved', this, 'unsaved');
            lively.bindings.connect(this.hub, 'synchronizing', this, 'synchronizing');
            lively.bindings.connect(this.hub, 'synchronized', this, 'synchronized');
            var me = this.world.getUserName();
            if (!this.hub.users[me] || me == "anonymous") {
                var prompt = this.login();
                connect(prompt, 'result', this.hub, 'connect');
            } else {
                this.hub.connect();
            }
        }
    },
    connectComplete: function(resp) {
        if (resp.error) {
            this.status.error(resp.error);
        } else {
            this.initializeUserInterface();
        }
    },
    unsaved: function() {
        this.status.warn("Synchronizing...");
    },
    synchronizing: function() {
        this.status.error("Timeout!");
        this.status.warn("Synchronizing...", 10000);
    },
    synchronized: function() {
        this.status.status("Synchronized.");
        this.status.ok("Synchronized.", 2000);
    }
},
'sync', {
    connectViews: function() {
        this.isConnected = true;
        this.world.submorphs
            .select(function(m) { return m instanceof org.ui.View; })
            .invoke('connect', this.hub);
    },
    disconnectViews: function() {
        delete this.isConnected;
        this.world.submorphs
            .select(function(m) { return m instanceof org.ui.View; })
            .invoke('disconnect');
    }
},
'tear down', {
    tearDown: function () {
        var tc = this.world.get('TrashCan'),
            sn = this.world.get('StickyNoteStack'),
            cp = this.world.get('CreateProjectIcon'),
            sbf = this.world.get('SearchBar_Flap');
        tc && tc.setFixed(false);
        tc && tc.remove();
        sn && sn.setFixed(false);
        sn && sn.remove();
        cp && cp.setFixed(false);
        cp && cp.remove();
        sbf && sbf.setFixed(false);
        sbf && sbf.remove();
        this.status.setFixed(false);
        this.status.remove();
        delete this.status;
        delete this.world.onHTML5Drop;
        delete this.world.onstore;
        this.disconnectViews();
    }
});

Object.extend(org.ui.Workspace, {
    current: function() {
        return this.currentWS;
    },
    defaultOptions: {
        minimal: false
    },
    setUp: function(optWorldOrOptions) {
        var world, options;
        if (optWorldOrOptions && optWorldOrOptions.isWorld) {
            world = optWorldOrOptions;
            options = this.defaultOptions;
        } else {
            options = Object.merge([this.defaultOptions, optWorldOrOptions]);
            world = options.world || lively.morphic.World.current();
        }
        this.currentWS = new org.ui.Workspace(world, options);
        return this.currentWS;
    }
});

org.ui.HBox.subclass('org.ui.IconList',
'initialization', {
    initialize: function($super) {
        $super(0, 0);
        this.layout.resizeHeight = false;
        this.setBorderRadius(5);
        this.setClipMode(UserAgent.isTouch ? 'hidden' : {x: 'auto', y: 'hidden'});
    }
},
'entities', {
    updateEntities: function(newEntities) {
        var oldEntities = this.submorphs.map(function(m) {
            return m.entity;
        });
        // remove obsolete users
        oldEntities.withoutAll(newEntities).each(function(ea) {
            this.submorphs.find(function(m) { return m.entity == ea; }).remove();
        }, this);
        // add new users
        newEntities.withoutAll(oldEntities).each(function(ea) {
            this.addMorph(ea.createIcon(true));
        }, this);
    }
},
'iPad', {
    onTouchStart: function(evt) {
        evt.stop();
        var touch = evt.touches[0];
        if(touch) {
            touch.originalDragOffset = touch.screenY;
            touch.originalMenuOffset = this.getPosition().y;
        }
        return true;
    },
    onTouchMove: function(evt) {
        evt.stop();
        var touch = evt.touches[0];
        if (touch && touch.originalDragOffset && !touch.draggingCanceled) {
            var delta = (touch.screenY - touch.originalDragOffset);
            var pos = touch.originalMenuOffset+delta;
            pos = Math.max(-this.getExtent().y + this.owner.getExtent().y, pos);
            pos = Math.min(0,pos);
            this.setPosition(pt(0,pos));
        }
        return true;
    }
});

org.ui.VBox.subclass('org.ui.NoteList',
'initialization', {
    initialize: function($super, entity) {
        var borderSize = {top: 0, left: 0, right: 20, bottom: 10};
        $super(borderSize, 0);
        this.entity = entity;
        //TODO: Make this a view
        this.setClipMode(UserAgent.isTouch ? 'hidden' : {x: 'hidden', y: 'auto'});
        this.initializeCreateNote();
    },
    initializeCreateNote: function() {
        var bounds = lively.pt(100, 20).extentAsRectangle();
        this.createNote = new lively.morphic.Text(bounds, 'Add new note');
        this.createNote.layout = {centeredHorizontal: true};
        this.createNote.setFill(null);
        this.createNote.setBorderWidth(0);
        this.createNote.emphasizeAll({color: Color.black, doit: {
            code: 'this.addNewNote()',
            context: this
        }});
        this.addMorph(this.createNote);
    }
},
'entities', {
    addNewNote: function() {
        var hub = org.ui.Workspace.current().hub;
        var newNote = hub.createNote();
        this.entity.addNote(newNote);
        var sticky = this.getStickyForEntity(newNote);
        sticky.submorphs.first().focus();
        this.scrollToBottom();
    },
    addNote: function(noteEntity) {
        var note = new org.ui.StickyNote(noteEntity);
        note.layout.resizeWidth = true;
        this.addMorph(note);
        return note;
    },
    getStickyForEntity: function(entity) {
        return this.submorphs
            .find(function(m) { return m.entity == entity; });
    },
    update: function() {
        var newEntities = this.entity.getNotes();
        // remove obsolete notes
        var currentNotes = this.submorphs.select(function(m) {
            return m instanceof org.ui.StickyNote;
        });
        currentNotes.each(function(m) {
            if (!newEntities.include(m.entity)) m.remove();
        }, this);
        // add new notes
        newEntities.each(function(ea) {
            if (!this.getStickyForEntity(ea)) this.addNote(ea);
        }, this);
        this.addMorph(this.createNote);
    }
});

lively.morphic.Box.subclass('org.ui.View',
'initialization', {
    initialize: function($super, bounds, entity) {
        $super(bounds);
        this.entity = entity;
    }
},
'interaction', {
    withoutUpdating: function(cb) {
        // edits the entity through this view
        // also prevents recursive and automatically triggered updates
        if (this.isUpdating || !(this.entity instanceof org.model.Entity)) return;
        try {
            this.preventUpdates = true;
            cb.call(this);
        } finally {
            delete this.preventUpdates;
        }
    }
},
'updating', {
    onOwnerChanged: function(newOwner) {
        // clean up connections when removing this view
        if (newOwner) {
            this.entity.onChanged(this, 'onEntityChange');
            this.entity.onDeleted(this, 'remove');
        } else if (this.entity) {
            this.entity.offChanged(this, 'onEntityChange');
            this.entity.offDeleted(this, 'remove');
        }
    },
    onEntityChange: function() {
        // triggered on every change on the entity
        if (!this.preventUpdates) {
            this.update();
        }
    },
    doUpdate: function() {
        // actual update logic
        // override in subclass
    },
    update: function() {
        // update view without triggering recursive updates
        try {
            this.isUpdating = true;
            this.doUpdate();
        } finally {
            delete this.isUpdating;
        }
    },
    connect: function(hub) {
        if (!this.entity) { // resolve entity id to real entity if not already done
            this.entity = hub.get(this.$entity);
        }
        // create entity change connections
        this.entity.onChanged(this, 'onEntityChange');
        this.entity.onDeleted(this, 'remove');
        this.onEntityChange();
        delete this.$entity;
    },
    disconnect: function() {
        // remove entity change connections
        this.entity.offChanged(this, 'onEntityChange');
        this.entity.offDeleted(this, 'remove');
    }
},
'serialization', {
    doNotSerialize: ['entity'],
    onstore: function(persistentCopy) {
        // disconnect when storing
        if (this.entity) {
            this.disconnect();
        }
        // store only entity id, not real entity
        persistentCopy.$entity = this.entity.getTypedId();
        // if there is a currently connected workspace
        var workspace = org.ui.Workspace.current();
        if (workspace && workspace.isConnected) {
            // just connect again
            this.connect(workspace.hub);
        }
    },
    onrestore: function() {
        // if there is a currently connected workspace
        var workspace = org.ui.Workspace.current();
        if (workspace && workspace.isConnected) {
            // connect direclty
            this.connect(workspace.hub);
        }
    }
});

lively.morphic.Text.subclass('org.ui.CardTabHeader',
'settings', {
    defaultFill: null,
    activeFill: Color.white
},
'initialization', {
    initialize: function($super, label) {
        $super(lively.rect(0, 0, 10, 32), '');
        this.setPadding(lively.rect(10, 0, 0, 0));
        this.setBorderWidth(0);
        this.setFill(this.defaultFill);
        this.setFontFamily("Helvetica, Arial, sans");
        this.setFontSize(10);
        this.setFixedWidth(false);
        this.setFixedHeight(true);
        this.textString = label;
        this.setLineHeight("32px");
        this.setInputAllowed(false);
        this.initializePane();
    },
    initializePane: function() {
        this.pane = new org.ui.VBox(5, 0);
    }
},
'rendering', {
    prepareForNewRenderContext: function($super, ctx) {
        var res = $super(ctx);
        ctx.textNode.style.outline = 'none';
        return res;
    }
},
'events', {
    onMouseDownEntry: function($super, evt) {
        if (evt.isLeftMouseButtonDown()) {
            this.activate();
            return false;
        }
        return $super(evt);
    }
},
'activation', {
    activate: function() {
        this.owner.submorphs.each(function(ea) {
            if (ea !== this) ea.deactivate();
        }, this);
        this.setFill(this.activeFill);
        this.owner.owner.showTab(this.pane);
    },
    deactivate: function() {
        this.pane.remove();
        this.setFill(this.defaultFill);
    }
});

lively.morphic.Box.subclass('org.ui.CardResizeCorner',
'settings', {
    defaultExtent: lively.pt(20, 20),
    isLayoutable: false
},
'initialization', {
    initialize: function($super, card) {
        $super(this.defaultExtent.extentAsRectangle());
        this.card = card;
        connect(this.card.shape, '_Extent', this, 'align');
        this.card.addMorph(this);
        this.align();
        this.setHandStyle('se-resize');
        this.enableDragging();
        this.setFill(Color.rgba(0, 0, 0, 0.2));
    }
},
'events', {
    align: function() {
        this.setPosition(this.card.getExtent().subPt(this.defaultExtent));
    },
    onDragStart: function(evt) {
        this.prevDrag = evt.getPosition();
    },
    onDrag: function(evt) {
        var offset = evt.getPosition().subPt(this.prevDrag);
        this.card.setExtent(this.card.getExtent().addPt(offset));
        this.prevDrag = evt.getPosition();
    },
    onDragEnd: function() {
        delete this.prevDrag;
    }
});

org.ui.View.subclass('org.ui.Card',
'settings', {
    minExtent: lively.pt(300, 200),
    defaultExtent: lively.pt(320, 284)
},
'initialization', {
    initialize: function($super, entity) {
        var minExtent = this.minExtent;
        minExtent.x = 200 + entity.getLabel().length * 8;
        var extent = minExtent.maxPt(this.defaultExtent);
        $super(extent.extentAsRectangle(), entity);
        this.setMinExtent(minExtent);
        this.addStyleClassName('Card');
        this.setBorderStylingMode(true);
        this.setFill(this.background);
        this.resize = new org.ui.CardResizeCorner(this);
        var layouter = new lively.morphic.Layout.VerticalLayout(this);
        layouter.setBorderSize(0);
        layouter.setSpacing(0);
        layouter.displaysPlaceholders = Functions.False;
        Object.addScript(layouter, function orderedSubmorphs(submorphs) {
            return submorphs.reject(function(ea) {
                return ea.isEpiMorp || !ea.isLayoutable;
            });
        });
        this.setLayouter(layouter);
        this.initializeTabBar();
        this.initializeTabs();
        this.setClipMode('hidden');
    },
    initializeTabBar: function() {
        this.tabBar = new org.ui.HBox(0, 0);
        this.tabBar.setExtent(lively.pt(100, 32));
        this.tabBar.layout.resizeHeight = false;
        this.tabBar.setBorderRadius("10px 10px 0 0");
        this.tabBar.setFill(Color.rgba(255, 255, 255, 0.5));
        this.tabBar.ignoreEvents();
        this.tabBar.applyLayout.bind(this.tabBar).delay(0.1);
        this.addMorph(this.tabBar);
    },
    initializeTabs: function() {
        this.initializeDescriptionTab();
        this.initializeNotesTab();
        this.initializeHistoryTab();
        this.tabBar.submorphs.first().activate();
    },
    addTab: function(label) {
        var tabHeader = new org.ui.CardTabHeader(label);
        this.tabBar.addMorph(tabHeader);
        return tabHeader;
    },
    showTab: function(pane) {
        this.addMorph(pane);
        this.addMorph(this.resize);
    },
    initializeDescriptionTab: function() {
        var descriptionTab = this.addTab(this.entity.getLabel());
        descriptionTab.layout = {resizeWidth: true};
        descriptionTab.setFontSize(14);
        descriptionTab.setBorderRadius("10px 0 0 0");
        this.label = descriptionTab;
        var pane = descriptionTab.pane;
        pane.setClipMode({x: 'hidden', y: 'auto'});
        pane.getLayouter().setBorderSize({top: 0, left: 0, right: 20, bottom: 0});
        return pane;
    },
    initializeNotesTab: function() {
        var notesTab = this.addTab("Notes");
        this.noteList = new org.ui.NoteList(this.entity);
        notesTab.pane.addMorph(this.noteList);
        return notesTab.pane;
    },
    initializeHistoryTab: function() {
        var historyTab = this.addTab("History");
        historyTab.setBorderRadius("0 10px 0 0");
        var txt = new lively.morphic.Text(lively.rect(0, 0, 200, 100), '\nnot implemented yet');
        txt.setFill(null);
        txt.setBorderWidth(0);
        txt.setFontSize(14);
        historyTab.pane.addMorph(txt);
        return historyTab.pane;
    }
},
'dropping', {
    wantsToBeDroppedInto: function(targetMorph) {
        return targetMorph.isWorld || (targetMorph.getName && targetMorph.getName() === 'TrashCan');
    },
    wantsDroppedMorph: function(droppedMorph) {
        return droppedMorph instanceof org.ui.View;
    }
},
'optimization', {
    getGrabShadow: function() {
        return false;
    }
},
'updating', {
    doUpdate: function() {
        this.label.textString = this.entity.getLabel();
        this.noteList.update();
    }
},
'notes', {
    addNote: function(note) {
        this.entity.addNote(note);
    },
    showNotes: function() {
        this.tabBar.submorphs[1].activate();
    }
});


lively.FileUploader.subclass('org.ui.AvatarUploader', {
    initialize: function(user) {
        this.user = user;
    },
    handleDroppedFiles: function(files, evt) {
        if (files.length !== 1 || files[0].type !== 'image/png') {
            return alert('Expects PNG image as avatar.');
        }
        var opts = {onLoad: 'onLoadImageBinary', asBinary: true};
        this.loadAndOpenDroppedFiles(evt, Array.from(files), opts);
    },
    uploadAndOpenImageTo: function($super, _, mime, binaryData) {
        var wr = new WebResource(this.user.getImageURL());
        var onloadDo = function(status) {
            if (!status.isDone()) return;
            if (status.isSuccess()) this.user.setImageURL();
            else alert('Failure uploading image: ' + status);
        }.bind(this);
        connect(wr, 'status', {call: onloadDo}, 'call');
        wr.beBinary().beAsync().put(binaryData, mime);
    }
});

org.ui.Card.subclass('org.ui.UserCard',
'settings', {
    background: org.ui.lightRed
},
'initialization', {
    initialize: function($super, user) {
        $super(user);
        this.update();
    },
    initializeDescriptionTab: function($super) {
        this.descriptionPane = $super();
        this.infoPane = new org.ui.HBox(12, 20);
        this.initializeAvatar();
        this.initializeInfo();
        this.descriptionPane.addMorph(this.infoPane);
        this.initializeProjectList();
    },
    initializeAvatar: function() {
        var bounds = lively.pt(100,100).extentAsRectangle();
        var url = this.entity.getImageURL();
        this.avatar = new lively.morphic.Image(bounds, url, false);
        this.avatar.setBorderStylingMode(true);
        this.avatar.ignoreEvents();
        this.infoPane.addMorph(this.avatar);
    },
    initializeInfo: function() {
        if (!this.info) {
            this.info = new lively.morphic.Text(lively.rect(10, 10));
            this.info.setLineHeight(1.5);
            this.info.layout = {resizeWidth: true, resizeHeight: true};
            this.info.setFixedHeight(false);
            this.info.ignoreEvents();
            this.info.setFill(null);
            this.info.setBorderWidth(0);
            this.info.setTextColor(Color.black);
            this.info.setFontSize(10);
            this.info.setWordBreak('normal');
        }
        this.info.textString = this.entity.getName();
        var email = this.entity.getEmail();
        if (email) {
            this.info.appendRichText("\n" + email, {
                color: Color.gray.darker(2),
                uri: "mailto:" + email
            });
        }
        var company = this.entity.getCompany();
        var phone = this.entity.getPhone();
        if (phone) {
            this.info.appendRichText('\nPhone: ' + phone, {});
        }
        var office = this.entity.getOffice();
        if (office) {
            this.info.appendRichText('\n' + office, {});
            //this.info.appendRichText(this.entity.getOffice(), {
            //    color: Color.gray.darker(2),
            //    doit: {code: 'this.openOffice()', context: this}
            //});
        }
        if (company) {
            this.info.appendRichText('\n' + company, {});
        }
        if (this.info.owner !== this.infoPane) {
            this.infoPane.addMorph(this.info);
        }
    },
    initializeProjectList: function() {
        var bounds = lively.pt(100, 20).extentAsRectangle();
        var projectHeader = new lively.morphic.Text(bounds, "Projects");
        projectHeader.setFill(null);
        projectHeader.setBorderWidth(0);
        projectHeader.setFixedWidth(true);
        projectHeader.setFixedHeight(true);
        projectHeader.emphasizeAll({fontWeight: 'bold'});
        projectHeader.disableEvents();
        this.descriptionPane.addMorph(projectHeader);
        this.projectList = new org.ui.IconList(true);
        this.descriptionPane.addMorph(this.projectList);
    }
},
'dropping', {
    wantsToBeDroppedInto: function($super, targetMorph) {
        return (targetMorph instanceof org.ui.ProjectCard) || $super(targetMorph);
    },
    onDropOn: function($super, aMorph) {
        if (aMorph instanceof org.ui.ProjectCard) {
            this.remove();
            aMorph.entity.addMember(this.entity);
        } else {
            return $super(aMorph);
        }
    },
    onHTML5Drop: function(evt) {
        var files = evt.dataTransfer.files;
        if (files) {
            new org.ui.AvatarUploader(this.entity).handleDroppedFiles(files, evt);
        }
        evt.stop();
        return true;
    }
},
'interaction', {
    openOffice: function() {
        this.world().get("MapView").openOffice(this.entity);
    }
},
'updating', {
    doUpdate: function($super) {
        $super();
        this.avatar.setImageURL(this.entity.getImageURL());
        this.initializeInfo();
        this.projectList.updateEntities(this.entity.getProjects());
    },
    disconnect: function($super) {
        this.projectList.updateEntities([]);
        $super();
    }
});
org.ui.Card.subclass('org.ui.ProjectCard',
'settings', {
    background: org.ui.lightBlue
},
'initialization', {
    initialize: function($super, project) {
        $super(project);
        this.update();
    },
    initializeDescriptionTab: function($super) {
        this.descriptionPane = $super();
        this.initializeDescription();
        this.initializeMemberList();
    },
    initializeDescription: function() {
        var text = new lively.morphic.Text(lively.rect(10, 10));
        text.layout = {resizeWidth: true};
        text.setFixedHeight(false);
        text.setFill(null);
        text.setBorderWidth(0);
        text.setTextColor(Color.black);
        text.setFontSize(10);
        text.setWordBreak('normal');
        connect(text, 'textString', this, 'setDescription');
        this.description = text;
        this.descriptionPane.addMorph(text);
    },
    initializeMemberList: function() {
        var bounds = lively.pt(100, 20).extentAsRectangle();
        var memberHeader = new lively.morphic.Text(bounds, "Members");
        memberHeader.setFill(null);
        memberHeader.setBorderWidth(0);
        memberHeader.setFixedWidth(true);
        memberHeader.setFixedHeight(true);
        memberHeader.emphasizeAll({fontWeight: 'bold'});
        memberHeader.disableEvents();
        this.descriptionPane.addMorph(memberHeader);
        this.memberList = new org.ui.IconList(true);
        this.descriptionPane.addMorph(this.memberList);
    }
},
'dropping', {
    wantsToBeDroppedInto: function($super, targetMorph) {
        return (targetMorph instanceof org.ui.UserCard) || $super(targetMorph);
    },
    onDropOn: function($super, aMorph) {
        if (aMorph instanceof org.ui.UserCard) {
            this.remove();
            aMorph.entity.addProject(this.entity);
        } else {
            return $super(aMorph);
        }
    }
},
'interaction', {
    setDescription: function(description) {
        this.descriptionPane.applyLayout();
        this.withoutUpdating(function() {
            this.entity.setDescription(description);
        });
    },
    changeName: function() {
        this.world().prompt('Set Project name', function(input) {
            if (input !== null) this.entity.setName(input || '');
        }.bind(this), this.entity.getName());
    },
    morphMenuItems: function($super) {
        var items = $super();
        items.push(['Change name', this.changeName.bind(this)]);
        return items;
    }
},
'updating', {
    doUpdate: function($super) {
        $super();
        this.description.textString = this.entity.getDescription();
        this.memberList.updateEntities(this.entity.getMembers());
        this.descriptionPane.applyLayout.bind(this.descriptionPane).delay(0);
    },
    disconnect: function($super) {
        this.memberList.updateEntities([]);
        $super();
    }
});


org.ui.View.subclass('org.ui.Icon',
'settings', {
    defaultExtent: lively.pt(80, 96),
    bigExtent: lively.pt(160, 96)
},
'initialization', {
    initialize: function($super, entity, big) {
        var extent = big ? this.bigExtent : this.defaultExtent;
        $super(extent.extentAsRectangle(), entity);
        var layouter = new lively.morphic.Layout.VerticalLayout(this);
        layouter.setBorderSize(5);
        layouter.setSpacing(0);
        Object.addScript(layouter, function orderedSubmorphs(submorphs) {
            return submorphs.reject(function(ea) {
                return ea.isEpiMorp || !ea.isLayoutable;
            });
        });
        this.addStyleClassName('Icon');
        this.setLayouter(layouter);
        this.setClipMode('hidden');
        this.disableGrabbing();
        this.enableDragging();
    }
},
'interaction', {
    createCard: function() {
        // override in subclass
    },
    setGrabDirection: function(aString) {
        // can be horizontal and vertical
        this.grabDirection = aString;
    },
    getGrabDirection: function() {
        // can be horizontal and vertical
        return this.grabDirection === 'vertical'? 'vertical' : 'horizontal';
    },
    onDragStart: function(evt) {
        var card = this.createCard();
        if (UserAgent.isTouch) {
            card.setDraggableWithoutHalo(true)
            card.disableSelection();
        }
        this.world().firstHand().grabMorph(card);
        return true;
    },
    onTouchEnd: function(evt) {
        evt.world.dispatchDrop(evt);
    },
    onTouchMove: function(evt) {
        var touch = evt.touches[0];
        evt.hand.setPosition(evt.getPosition());
        if(touch && touch.partItemOffset) {
            var vertical = this.getGrabDirection() === 'vertical',
                originalOffset = vertical ? touch.screenY : touch.screenX,
                delta = originalOffset - touch.partItemOffset;
            if (Math.abs(delta) > 100) {
                this.onDragStart(evt)
                delete touch.partItemOffset;
                touch.draggingCanceled = true;
            }
        }
    },
    onTouchStart: function(evt) {
        var touch = evt.touches[0];
        if (touch) {
            var vertical = this.getGrabDirection() === 'vertical';
            touch.partItemOffset = vertical? touch.screenY : touch.screenX;
        }
    },
},
'optimization', {
    getGrabShadow: function() {
        return new lively.morphic.Box(this.getBounds());
    }
});

org.ui.Icon.subclass('org.ui.UserIcon',
'settings', {
    avatarExtent: lively.pt(50, 50)
},
'initialization', {
    initialize: function($super, user, dark) {
        $super(user);

        var avatarBounds = lively.pt(0,0).extent(this.avatarExtent);
        var avatar = new lively.morphic.Image(avatarBounds, user.getImageURL());
        avatar.layout = {centeredHorizontal: true};
        avatar.disableEvents();
        this.addMorph(avatar);
        this.avatar = avatar;

        var textColor = dark ? Color.black : Color.rgba(234,234,234);

        var firstname = new lively.morphic.Text(lively.rect(0,0,0,16));
        firstname.beLabel();
        firstname.textString = user.getFirstName().truncate(13);
        firstname.applyStyle({resizeWidth: true, textColor: textColor, align: 'center'});
        firstname.disableEvents();
        this.addMorph(firstname);
        this.firstname = firstname;

        var lastname = new lively.morphic.Text(lively.rect(0,0,0,16));
        lastname.beLabel();
        lastname.setAlign('center');
        lastname.textString = user.getLastName().truncate(13);
        lastname.applyStyle({resizeWidth: true, textColor: textColor, align: 'center'});
        lastname.disableEvents();
        this.addMorph(lastname);
        this.lastname = lastname;
    }
},
'interaction', {
    createCard: function() {
        return new org.ui.UserCard(this.entity);
    }
},
'updating', {
    doUpdate: function() {
        this.avatar.setImageURL(this.entity.getImageURL());
        this.firstname.textString = this.entity.getFirstName().truncate(13);
        this.lastname.textString = this.entity.getLastName().truncate(13);
    }
});

org.ui.Icon.subclass('org.ui.ProjectIcon',
'initialization', {
    initialize: function($super, project) {
        $super(project);
        var text = new lively.morphic.Text();
        text.beLabel();
        text.setAlign('center');
        text.setFixedWidth(true);
        text.setFixedHeight(true);
        text.setClipMode('hidden');
        text.setWordBreak('normal');
        text.setFontSize(8);
        text.setFontFamily("verdana, sans");
        text.textString = project.getLabel();
        text.layout = {resizeWidth: true, resizeHeight: true};
        text.disableEvents();
        text.setBorderRadius(10);
        text.setBorderColor(Color.gray.darker(2));
        text.setBorderWidth(1);
        text.setFill(org.ui.lightBlue);
        text.setPadding(lively.rect(0, 5, 0, 0));
        this.text = text;
        this.addMorph(this.text);
    }
},
'interaction', {
    createCard: function() {
        return new org.ui.ProjectCard(this.entity);
    }
},
'updating', {
    doUpdate: function() {
        this.text.textString = this.entity.getLabel();
    }
});

org.ui.Icon.subclass('org.ui.NoteIcon',
'settings', {
    defaultExtent: lively.pt(80, 64),
    bigExtent: lively.pt(160, 64)
},
'initialization', {
    initialize: function($super, note, big) {
        $super(note, big);
        var txt = new lively.morphic.Text();
        txt.layout = {resizeWidth: true, resizeHeight: true};
        txt.addStyleClassName('StickyNote');
        txt.setFill(null);
        txt.setBorderStylingMode(true);
        txt.setFontFamily("verdana, sans");
        txt.setFontSize(9);
        txt.setWordBreak('normal');
        var length = big ? 64 : 23;
        txt.textString = note.getContent().truncate(length);
        txt.disableEvents();
        txt.setPadding(lively.rect(5, 5, 0, 0));
        this.addMorph(txt);
        this.text = txt;
    }
},
'interaction', {
    createCard: function() {
        return new org.ui.StickyNote(this.entity);
    }
},
'updating', {
    doUpdate: function() {
        this.text.textString = this.entity.getContent().truncate(23);
    }
});

org.ui.View.subclass('org.ui.StickyNote',
'settings', {
    infoColor: Color.gray.darker(),
    defaultExtent: lively.pt(220, 50)
},
'initialization', {
    initialize: function($super, note) {
        var bounds = lively.pt(0,0).extent(this.defaultExtent);
        $super(bounds, note);
        this.setMinExtent(this.defaultExtent);
        this.setBorderStylingMode(true);
        this.addStyleClassName('StickyNote');
        var layouter = new lively.morphic.Layout.JournalLayout(this);
        layouter.setBorderSize(4);
        layouter.setSpacing(6);
        Object.addScript(layouter, function orderedSubmorphs(submorphs) {
            return submorphs.reject(function(ea) {
                return ea.isEpiMorp || !ea.isLayoutable;
            });
        });
        this.setLayouter(layouter);
        this.content = this.createText();
        this.addMorph(this.content);
        this.info = this.createInfo();
        this.setInfoText();
        this.addMorph(this.info);
        this.disableDropping();
    },
    createText: function() {
        var content = this.entity.getContent();
        var txt = new lively.morphic.Text(rect(0, 0, 180, 20), content);
        txt.setFontFamily("verdana, sans");
        txt.setFontSize(9);
        txt.setFill(null);
        txt.setBorderWidth(0);
        txt.layout = {resizeWidth: true, resizeHeight: true};
        txt.setFixedWidth(true);
        txt.setFixedHeight(false);
        txt.setWordBreak('normal');
        connect(txt, 'textString', this, 'setContent');
        return txt;
    },
    createInfo: function() {
        var info = new lively.morphic.Text(rect(0,100,180,20));
        info.ignoreEvents();
        info.setFontFamily('verdana, sans');
        info.setFill(null);
        info.setBorderWidth(0);
        info.setFontSize(8);
        info.layout = {resizeWidth: true, resizeHeight: false};
        info.setFixedWidth(true);
        info.setFixedHeight(true);
        info.setTextColor(this.infoColor);
        return info;
    }
},
'connecting', {
    wantsToBeDroppedInto: function(targetMorph) {
        return targetMorph.isWorld ||
            (targetMorph instanceof org.ui.Card) ||
            (targetMorph.name === 'TrashCan');
    },
    onDropOn: function($super, aMorph) {
        if (aMorph instanceof org.ui.Card) {
            this.remove();
            aMorph.addNote(this.entity);
        } else {
            return $super(aMorph);
        }
    },
    onDragStart: function($super, evt) {
        if (this.owner instanceof org.ui.NoteList) {
            this.owner.entity.removeNote(this.entity);
        }
        return $super(evt);
    }
},
'interacting', {
    openCreator: function() {
        var card = new org.ui.UserCard(this.entity.getCreator());
        card.setCollapsed();
        this.world().firstHand().grabMorph(card);
    },
    setContent: function(content) {
        this.withoutUpdating(function() {
            this.entity.setContent(content);
        });
    },
    remove: function($super, deleteEntity) {
        $super();
        if (deleteEntity) {
            var hub = org.ui.Workspace.current().hub;
            hub.deleteNote(this.entity);
        }
    }
},
'updating', {
    onOwnerChanged: function($super, newOwner) {
        $super(newOwner);
        if (newOwner) {
            this.tick.bind(this).delay(60);
            delete this.wasRemoved;
        } else {
            this.wasRemoved = true;
        }
    },
    doUpdate: function() {
        this.content.textString = this.entity.getContent();
        this.content.fit();
        this.info.textString = '';
        this.setInfoText();
    },
    tick: function() {
        if (!this.wasRemoved) {
            this.update();
            this.tick.bind(this).delay(60);
        }
    },
    setInfoText: function() {
        var creator = this.entity.getCreator();
        if (!creator.isAnonymous()) {
            this.info.appendRichText('- ');
            this.info.appendRichText(creator.getFirstName(), {
                color: this.infoColor,
                decoration: 'underline',
                doit: {code: 'this.openCreator()', context: this}
            });
        }
        var date = this.entity.getCreationDateInEnglish();
        this.info.appendRichText(' (' + date + ')', {});
    }
});

lively.morphic.Box.subclass('org.ui.SearchBar',
'initialization', {
    initialize: function($super, bounds, entityHub) {
        $super(bounds);
        this.hub = entityHub;
        this.layout = {adjustForNewBounds: true};
        var layouter = new lively.morphic.Layout.VerticalLayout(this);
        layouter.setSpacing(5);
        layouter.setBorderSize(5);
        this.setLayouter(layouter);
        this.applyLayout();
        this.searchResults = this.initializeSearchResults();
        this.searchField = this.initializeSearchField();
    },
    initializeSearchField: function() {
        var sf = new lively.morphic.Box(rect(0,0,this.getExtent().x,30)),
            sf_layouter = new lively.morphic.Layout.HorizontalLayout(sf),
            searchIcon = this.createSearchIcon(),
            inputField = this.createInputField();
        searchIcon.inputField = inputField;
        sf.applyStyle({resizeWidth: true, resizeHeight: false});
        sf.setLayouter(sf_layouter);
        sf_layouter.setHandlesSubmorphResized(true);
        sf_layouter.setBorderSize(3)
        sf.applyLayout();
        sf.setName('SearchField')
        sf.addMorph(searchIcon);
        sf.addMorph(inputField);
        return this.addMorph(sf)
    },
    createInputField: function() {
        var inputField = new lively.morphic.Text(rect(0,0,100,30))
        inputField.applyStyle({
            resizeWidth: true,
            resizeHeight: false,
            borderRadius: 6});
        inputField.setFontSize(16);
        inputField.setFixedHeight(true);
        if (UserAgent.isTouch) {
            inputField.disableTextControl()
        }
        connect(inputField, "textString", this, "search");
        return inputField;
    },
    createSearchIcon: function() {
        var searchURL = URL.root.withFilename('org/media/search.png'),
            searchIcon = new lively.morphic.ImageButton(rect(0,0,30,30), searchURL);
        searchIcon.image.setScale(.2);
        searchIcon.image.setPosition(UserAgent.isTouch ? pt(2,2) : pt(-10.5,3.2));
        searchIcon.applyStyle({
            resizeWidth: false,
            resizeHeight: true
        });
        connect(searchIcon, "fire", this, "search", {
            converter: function () {
                return this.sourceObj.inputField.getTextString();
            }
        });
        return searchIcon;
    },
    initializeSearchResults: function() {
        var results = new org.ui.SearchResults(rect(0,0,this.getExtent().x,105));
        return this.addMorph(results);
    }
},
'searching', {
    search: function (str) {
        var s = str ? str.trim() : '';
        var results = s == '' ? [] : this.hub.search(s);
        this.searchResults.showResults(results);
    },
},
'event handling', {
    onTouchStart: function(evt) { evt.stop(); },
    onTouchMove: function(evt) { evt.stop(); },
    onTouchEnd: function(evt) { evt.stop(); }
});
lively.morphic.Box.subclass('org.ui.SearchResults',
'initialization', {
    initialize: function($super, extensions) {
        $super(extensions);
        var scrollContainer = new lively.morphic.Box(rect(0,0,0,this.getExtent().y));
        var layouter = new lively.morphic.Layout.HorizontalLayout(scrollContainer);
        layouter.setBorderSize(0)
        this.applyStyle({
            resizeHeight: false,
            resizeWidth: true,
            clipMode: {x: 'auto', y: 'hidden'}});
        scrollContainer.applyStyle({
            resizeWidth: false
        });
        scrollContainer.setLayouter(layouter);
        scrollContainer.applyLayout();
        scrollContainer.getLayouter().setHandlesSubmorphResized(true);
        if (UserAgent.isTouch)
            scrollContainer.beHorizontalScroll();
        this.setName('SearchResults');
        this.addMorph(scrollContainer);
        this.scrollContainer = scrollContainer;
    }
},
'displaying', {
    showResults: function(results) {
        this.scrollContainer.removeAllMorphs();
        this.scrollContainer.setExtent(pt(0, this.scrollContainer.getExtent().y))
        this.showMore(results);
    },
    showMore: function(results) {
        var that = this,
            sm = this.get('showMore');
        if (sm) sm.remove();
        var displayable = this.displayableEntities();
        if (results.length > displayable) {
            var more = this.createMoreIcon();
            var reactFunction = function() { // too many local references here to add as Script
                that.showMore(results.slice(displayable, results.length));
            };
            more.onMouseUp = reactFunction;
            more.onTap = reactFunction;
            results.slice(0, displayable).each(this.createIcon.bind(this));
            this.scrollContainer.addMorph(more);
        } else {
            results.each(this.createIcon.bind(this));
        }
    },
    createIcon: function(entity) {
        var icon = entity.createIcon();
        icon.setGrabDirection('vertical');
        icon.setPosition(pt(this.scrollContainer.submorphs.length * 100, 0));
        this.scrollContainer.addMorph(icon);
    },
    displayableEntities: function() {
        // returns the number of displayable entities based on flap extent
        var layouter = this.scrollContainer.getLayouter(),
            width = this.getExtent().x,
            spacing = layouter.getBorderSize('left') + layouter.getBorderSize('right')
                    + layouter.getSpacing();
        // this calculates one spacing too much
        return Math.floor((width - spacing) / (80 + layouter.getSpacing())) - 1;
    },
    createMoreIcon: function() {
        var more = new lively.morphic.Text(pt(99000,0).extent(pt(80,80)), "...");
        more.setFontSize(30);
        more.setAlign('center');
        more.setBorderWidth(0);
        more.setFill(null);
        more.setTextColor(Color.gray);
        more.disableGrabbing();
        more.setInputAllowed(false);
        more.setName('showMore');
        return more;
    },
    getContainer: function() {
        return UserAgent.isTouch ? this.scrollContainer : this;
    }
});

lively.morphic.Image.subclass('org.ui.TrashCan',
'initialization', {
    initialize: function($super, bounds) {
        var url = URL.root.withFilename('org/media/trashcan.png');
        $super(bounds, url);
        this.name = 'TrashCan';
    }
},
'behavior', {
    addMorph: function($super, m) {
        $super(m);
        m.remove(true); // true indicates that new entity can be deleted as well
        return m;
    }
});

lively.morphic.Image.subclass('org.ui.StickyNoteStack',
'initialization', {
    initialize: function($super, bounds, entityHub) {
        var url = URL.root.withFilename('org/media/stickynote.png');
        $super(bounds, url)
        this.name = 'StickyNoteStack';
        this.hub = entityHub;
    },
},
'behavior', {
    copyNoteToHand: function(evt) {
        var entity = this.hub.createNote();
        entity.setContent('type here');
        var note = new org.ui.StickyNote(entity);
        if (UserAgent.isTouch) {
            note.setDraggableWithoutHalo(true);
        }
        note.setPosition(evt.getPositionIn(this).negated());
        this.world().firstHand().grabMorph(note);
        return true;
    },
    onDragStart: function(evt) {
        this.copyNoteToHand(evt);
    },
});

lively.morphic.Image.subclass('org.ui.CreateProjectIcon',
'initialization', {
    initialize: function($super, bounds, entityHub) {
        var url = URL.root.withFilename('org/media/project.png');
        $super(bounds, url)
        this.name = 'CreateProject';
        this.hub = entityHub;
    },
},
'behavior', {
    copyCardToHand: function(evt) {
        var entity = this.hub.createProject();
        entity.setName('New Project');
        entity.setDescription('Add description here');
        var card = new org.ui.ProjectCard(entity);
        if (UserAgent.isTouch) {
            note.setDraggableWithoutHalo(true);
        }
        card.setPosition(evt.getPositionIn(this).negated());
        this.world().firstHand().grabMorph(card);
        return true;
    },
    onDragStart: function(evt) {
        this.copyCardToHand(evt);
    }
});

lively.morphic.Text.subclass('org.ui.StatusBox',
'documentation', {
    usage: "This box accepts 'error', 'warn', 'ok' and 'status'. " +
           "If no timeout is given, it becomes the default status," +
           "otherwise the status will only be shown for a certain time."
},
'settings', {
    defaultExtent: lively.pt(240, 22),
    normalColor: Color.gray,
    okColor: Color.green.lighter(2),
    warnColor:  Color.yellow.lighter(),
    errorColor:  Color.red.lighter(2)
},
'initialization', {
    initialize: function($super) {
        $super(this.defaultExtent.extentAsRectangle());
        this.setTextColor(Color.black);
        this.setFontWeight('bold');
        this.disableEvents();
        this.setBorderWidth(0);
        this.setBorderRadius("0 10px 0 0");
        this.name = 'StatusBox';
        this.status('');
    }
},
'special', {
    notifyTimeout: function() {
        this.world().confirm(
            "Lost connection to server! " +
            "Do you want to reload this page? " +
            "(You can also stay on this page " +
            "and hope for the connection to come back.)",
            function(answer) { answer && window.location.reload(); });
    }
},
'status', {
    updateStatus: function(str, color, optDuration, back) {
        this.setFill(color);
        this.textString = str;
        if (back && str == "Timeout!") this.notifyTimeout();
        if (optDuration) {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(function() {
                this.lastStatus();
            }.bind(this), optDuration);
        } else {
            this.lastStatus = this.updateStatus.bind(this, str, color, undefined, true);
        }
    },
    ok: function(str, optDuration) {
        this.updateStatus(str, this.okColor, optDuration);
        console.log(str);
    },
    warn: function(str, optDuration) {
        this.updateStatus(str, this.warnColor, optDuration);
        console.warn(str);
    },
    error: function(str, optDuration) {
        this.updateStatus(str, this.errorColor, optDuration);
        console.error(str);
    },
    status: function(str, optDuration) {
        this.updateStatus(str, this.normalColor, optDuration);
    }
});

lively.morphic.Text.subclass('org.ui.ChangeLog', {
    initialize: function($super) {
        $super(pt(1400, 300).extentAsRectangle(), '');
        this.setBorderWidth(3);
        this.setBorderColor(Color.rgb(128, 128, 128));
        this.setFill(Color.rgb(200, 200, 200));
        this.setBorderRadius(6);
        this.setPadding(lively.rect(10, 10, 0, 0));
        this.setFontFamily("monospace");
        this.setTextColor(Color.gray.darker());
        this.setFixedWidth(true);
        this.setFixedHeight(true);
        this.setClipMode('auto');
        this.addLog("SUBJECT", "MESSAGE", "OBJECT", "USER", "TIMESTAMP");
    },
    addText: function(txt, length, style) {
        txt = txt.truncate(length, '');
        txt = Strings.pad(txt, length - txt.length);
        this.appendRichText(txt + '  ', style);
    },
    change: function(subject, message, object) {
        this.addLog(subject.getTypedId(),
                    message,
                    object ? JSON.stringify(this.hub.serialize(object)) : '',
                    "anonymous",
                    String((new Date()).getTime()));
    },
    addLog: function(subject, message, object, user, timestamp) {
        this.addText(subject, 42, {color: Color.blue.darker()});
        this.addText(message, 18, {fontWeight: 'bold'});
        this.addText(object, 56, {fontWeight: 'bold', color: Color.black});
        this.addText(user, 8, {color: Color.red.darker()});
        this.addText(timestamp, 10, {color: Color.white});
        this.appendRichText("\n", {});
        this.fit();
    }
});

}) // end of module
