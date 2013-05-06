module('org.ui').requires('org.widgets', 'lively.ide.SyntaxHighlighting').toRun(function() {

org.model.User.addMethods({
    createIcon: function(verticalList) {
        return new org.ui.UserIcon(this, verticalList);
    },
    createCard: function() {
        return new org.ui.UserCard(this);
    }
});

org.model.Project.addMethods({
    createIcon: function(verticalList) {
        return new org.ui.ProjectIcon(this, verticalList);
    },
    createCard: function() {
        return new org.ui.ProjectCard(this);
    }
});

org.model.Note.addMethods({
    createIcon: function(verticalList) {
        return new org.ui.StickyNote(this);
    },
    createCard: function() {
        return new org.ui.StickyNote(this);
    }
});

Object.extend(org.ui, {
    lightBlue: Color.fromString('#D4D4E6'),
    blue: Color.fromString('#FF3333'),
    lightRed: Color.fromString('#E6D4D4'),
    red: Color.fromString('#337F7F')
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
            this.showWidgets();
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
        if (this.world.get('SearchBar_Flap')) return;
        var zoom = this.world.getZoomLevel(),
            width = 320,
            height = this.world.visibleBounds().height - 10,
            offset = this.world.visibleBounds().width - width - 10,
            pos = this.world.getScrollOffset().addXY(offset,0),
            extent = lively.pt(width, height);
        var searchBar = new org.ui.SearchBar(pos.extent(extent), this.hub);
        searchBar.setScale(1/zoom);
        var flap = searchBar.openInFlap('right');
        searchBar.setScale(1);
        searchBar.setName('SearchBar');
        if (UserAgent.isTouch) {
            searchBar.invoke('disableSelection');
        }
        flap.setName('SearchBar_Flap');
        flap.setBorderRadius(0);
    },
    setupTrashCan: function() {
        if (this.world.get('TrashCan')) return;
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
        if (this.world.get('StickyNoteStack')) return;
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
        if (this.world.get('CreateProjectIcon')) return;
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
        this.world.addScript(function onstore() {
            workspace.tearDown();
        }, 'onstore', {workspace: this});
        this.world.addScript(function onHTML5Drop(evt) {
            var target = evt.srcElement || evt.target;
            if (this.renderContext().shapeNode === target) {
                return $super(evt);
            }
            return false;
        });
        this.world.addScript(function morphMenuItems() {
            var items = $super();
            if (workspace.hasWidgets()) {
                items.push(['[X] Org widgets', workspace.hideWidgets.bind(workspace)]);
            } else {
                items.push(['[  ] Org widgets', workspace.showWidgets.bind(workspace)]);
            }
            return items;
        }, 'morphMenuItems', {workspace: this});
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
    },
    hasWidgets: function() {
        return !!this.world.get('SearchBar_Flap');
    },
    showWidgets: function() {
        this.setupSearchBar();
        this.setupTrashCan();
        this.setupStickyNoteStack();
        this.setupCreateProjectIcon();
    },
    hideWidgets: function() {
        var tc = this.world.get('TrashCan');
        if (tc) { tc.setFixed(false); tc.remove(); }
        var sn = this.world.get('StickyNoteStack');
        if (sn) { sn.setFixed(false); sn.remove(); }
        var cp = this.world.get('CreateProjectIcon');
        if (cp) { cp.setFixed(false); cp.remove(); }
        var sbf = this.world.get('SearchBar_Flap');
        if (sbf) { sbf.setFixed(false); sbf.remove(); }
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
    },
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
'interaction', {
    search: function(str) {
        var sb = this.world.get('SearchBar');
        if (!sb) return;
        sb.inputField.textString = str;
        sb.inputField.focus();
    }
},
'tear down', {
    tearDown: function () {
        this.hideWidgets();
        this.status.setFixed(false);
        this.status.remove();
        delete this.status;
        delete this.world.onHTML5Drop;
        delete this.world.onstore;
        delete this.world.morphMenuItems;
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

org.widgets.View.subclass('org.ui.View',
'serialization', {
    onstore: function($super, persistentCopy) {
        $super(persistentCopy);
        // if there is a currently connected workspace
        var workspace = org.ui.Workspace.current();
        if (workspace && workspace.isConnected) {
            // just connect again
            this.connect(workspace.hub);
        }
    },
    onrestore: function($super) {
        $super();
        // if there is a currently connected workspace
        var workspace = org.ui.Workspace.current();
        if (workspace && workspace.isConnected) {
            // connect direclty
            this.connect(workspace.hub);
        }
    }
});

org.ui.View.subclass('org.ui.AddNewNote',
'initialization', {
    initialize: function($super, ownerEntity) {
        var bounds = lively.rect(0, 0, 100, 20);
        $super(bounds, ownerEntity);
        this.setLayouter(new lively.morphic.Layout.HorizontalLayout());
        this.layout.resizeWidth = true;
        this.txt = new lively.morphic.Text(bounds, 'Add new note');
        this.txt.layout = {resizeWidth: true, resizeHeight: true};
        this.txt.setAlign('center');
        this.txt.setFill(null);
        this.txt.setBorderWidth(0);
        this.txt.emphasizeAll({color: Color.black, doit: {
            code: 'this.addNewNote()',
            context: this
        }});
        this.addMorph(this.txt);
    }
},
'interactions', {
    addNewNote: function() {
        if (this.owner instanceof org.ui.NoteList) {
            this.owner.addNewNote();
        }
    }
});

org.widgets.EntityList.subclass('org.ui.NoteList',
'initialization', {
    initialize: function($super, owner) {
        $super({tags: true});
        if (owner) {
            this.createNote = new org.ui.AddNewNote(owner);
            this.addMorph(this.createNote);
        }
    }
},
'accessing', {
    getStickyNotes: function() {
        return this.submorphs.select(function(m) {
            return m instanceof org.ui.StickyNote;
        });
    },
    getStickyForEntity: function(entity) {
        return this.getStickyNotes()
            .find(function(m) { return m.entity == entity; });
    }
},
'entities', {
    addNewNote: function() {
        var hub = org.ui.Workspace.current().hub;
        var newNote = hub.createNote();
        if (this.filter) newNote.setContent(' ' + this.filter);
        this.createNote.entity.addNote(newNote);
        var sticky = this.getStickyForEntity(newNote);
        sticky.submorphs.first().focus();
        this.owner.scrollToBottom();
    },
    addNote: function(noteEntity) {
        var note = new org.ui.StickyNote(noteEntity);
        note.layout.resizeWidth = true;
        this.addMorph(note);
        noteEntity.onChanged('content', this.tagList, 'updateNotes');
        return note;
    }
},
'updating', {
    update: function($super) {
        $super();
        if (this.createNote) {
            this.addMorph(this.createNote);
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
        this.pane = new org.widgets.VBox(5, 0);
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
        this.tabBar = new org.widgets.HBox(0, 0);
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
        this.noteList.setEntities(this.entity.getNotes());
    },
    connect: function($super, hub) {
        $super(hub);
        this.noteList.connect(hub);
    },
    disconnect: function($super) {
        this.noteList.disconnect();
        $super();
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
        this.infoPane = new org.widgets.HBox(12, 20);
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
        var phone = this.entity.getPhone();
        if (phone) {
            this.info.appendRichText('\nPhone: ' + phone, {});
        }
        var office = this.entity.getOffice();
        if (office) {
            this.info.appendRichText('\n' + office, {});
        }
        var company = this.entity.getCompany();
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
        this.projectList = new org.widgets.IconList();
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
'updating', {
    doUpdate: function($super) {
        $super();
        this.avatar.setImageURL(this.entity.getImageURL());
        this.initializeInfo();
        this.projectList.updateEntities(this.entity.getProjects());
    },
    connect: function($super, hub) {
        this.projectList.connect(hub);
        $super(hub);
    },
    disconnect: function($super) {
        this.projectList.disconnect();
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
        this.label.morphMenuItems = this.morphMenuItems.bind(this);
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
        this.memberList = new org.widgets.IconList();
        this.descriptionPane.addMorph(this.memberList);
    },
    initializeHistoryTab: function() {
        // just replace the history tab for now until it is implemented
        var partsTab = this.addTab("Parts");
        partsTab.setBorderRadius("0 10px 0 0");
        var layouter = new lively.morphic.Layout.TileLayout(partsTab.pane);
        layouter.displaysPlaceholders = Functions.False;
        partsTab.pane.setLayouter(layouter);
        partsTab.pane.unignoreEvents();
        partsTab.pane.disableGrabbing();
        this.partsTab = partsTab.pane;
        this.partsTab.card = this;
        this.partsTab.addScript(function addMorph(morph) {
            if (morph.name && this.owner && !this.owner.isUpdating) {
                morph.remove();
                if (this.card.entity.getParts().include(morph.name)) {
                    var msg = 'Morph with that name already exists. Keep name to overwrite.';
                    this.world().prompt(msg, function(input) {
                        if (input) {
                            morph.setName(input);
                            this.upload(morph);
                        }
                    }.bind(this), morph.name);
                } else {
                    this.upload(morph);
                }
                return morph;
            } else {
                return $super(morph);
            }
        });
        this.partsTab.addScript(function upload(morph) {
            var partsBinUrl = new URL(this.card.entity.getPartSpaceURL());
            var wr = partsBinUrl.asWebResource();
            if (!wr.exists()) wr.create();
            var info = morph.getPartsBinMetaInfo();
            info.partName = morph.name;
            morph.copyToPartsBinUrl(partsBinUrl);
            this.project.addPart.bind(this.card.entity, morph.name).delay(1);
        });
        return this.partsTab;
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
    updateParts: function() {
        var url = this.entity.getPartSpaceURL();
        this.partsTab.removeAllMorphs();
        this.entity.getParts().each(function(part) {
            var partItem = lively.PartsBin.getPartItem(part, url);
            var morph = partItem.asPartsBinItem();
            this.partsTab.addMorph(morph);
        }, this);
    },
    doUpdate: function($super) {
        $super();
        this.description.textString = this.entity.getDescription();
        this.memberList.updateEntities(this.entity.getMembers());
        this.descriptionPane.applyLayout.bind(this.descriptionPane).delay(0);
        this.updateParts();
    },
    connect: function($super, hub) {
        this.memberList.connect(hub);
        $super(hub);
    },
    disconnect: function($super) {
        this.memberList.disconnect();
        $super();
    }
});



org.widgets.Icon.subclass('org.ui.UserIcon',
'settings', {
    avatarExtent: lively.pt(50, 50),
    verticalListExtent: lively.pt(160, 76)
},
'initialization', {
    initialize: function($super, user, verticalList) {
        $super(user, verticalList);

        var avatarBounds = lively.pt(0,0).extent(this.avatarExtent);
        var avatar = new lively.morphic.Image(avatarBounds, user.getImageURL());
        avatar.layout = {centeredHorizontal: true};
        avatar.disableEvents();
        this.addMorph(avatar);
        this.avatar = avatar;
        this.color = verticalList ? Color.rgb(235, 235, 235) : Color.black;

        if (verticalList) {
            this.fullname = this.createTextMorph(user.getName(), true);
        } else {
            this.firstname = this.createTextMorph(user.getFirstName());
            this.lastname = this.createTextMorph(user.getLastName());
        }
    },
    createTextMorph: function(str, long) {
        var txt = new lively.morphic.Text(lively.rect(0,0,0,16));
        txt.beLabel();
        txt.setAlign('center');
        txt.textString = str.truncate(long ? 27 : 13);
        txt.applyStyle({resizeWidth: true, textColor: this.color});
        txt.disableEvents();
        this.addMorph(txt);
        return txt;
    }
},
'interaction', {
},
'updating', {
    doUpdate: function() {
        this.avatar.setImageURL(this.entity.getImageURL());
        if (this.fullname) {
            this.fullname.textString = this.entity.getName().truncate(27);
        } else {
            this.firstname.textString = this.entity.getFirstName().truncate(13);
            this.lastname.textString = this.entity.getLastName().truncate(13);
        }
    }
});

org.widgets.Icon.subclass('org.ui.ProjectIcon',
'initialization', {
    initialize: function($super, project, verticalList) {
        $super(project, verticalList);
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
},
'updating', {
    doUpdate: function() {
        this.text.textString = this.entity.getLabel();
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
        txt.syntaxHighlighter = new org.ui.Highlighter();
        txt.enableSyntaxHighlighting();
        txt.addScript(function onEnterPressed(evt) {
            if (!(this.owner instanceof org.ui.StickyNote) ||
                !evt.isCommandKey()) return $super(evt);
            this.owner.createAnotherNote();
        });
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
        if (this.owner instanceof org.ui.NoteList &&
            this.owner.card.entity instanceof org.model.Entity) {
            this.owner.card.entity.removeNote(this.entity);
        } else if(this.owner instanceof org.ui.SearchResults) {
            var note = new org.ui.StickyNote(this.entity);
            this.world().firstHand().grabMorph(note);
            return true;
        }
        return $super(evt);
    }
},
'interacting', {
    openCreator: function() {
        var card = new org.ui.UserCard(this.entity.getCreator());
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
    },
    createAnotherNote: function() {
        if (this.owner instanceof org.ui.NoteList) {
            return this.owner.addNewNote();
        }
        var hub = org.ui.Workspace.current().hub;
        var entity = hub.createNote();
        entity.setContent('');
        var note = new org.ui.StickyNote(entity);
        note.openInWorld();
        note.setPosition(this.globalBounds().bottomLeft().addXY(0, 5));
        note.submorphs.first().focus();
        return note;
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

org.widgets.VBox.subclass('org.ui.SearchBar',
'initialization', {
    initialize: function($super, bounds, entityHub) {
        $super(5, 5);
        this.setBounds(bounds);
        this.hub = entityHub;
        this.initializeSearchField();
        this.initializeSearchResults();
        this.applyLayout();
    },
    initializeSearchField: function() {
        var inputField = new lively.morphic.Text(rect(0,0,100,30))
        inputField.applyStyle({
            resizeWidth: true,
            resizeHeight: false,
            borderRadius: 6});
        inputField.setFontSize(16);
        inputField.setFixedWidth(true);
        inputField.setFixedHeight(true);
        this.inputField = inputField;
        connect(inputField, "textString", this, "search");
        this.searchField = inputField;
        this.addMorph(this.searchField);
    },
    initializeSearchResults: function() {
        var extent = this.getExtent().addXY(-20, -100);
        var bounds = extent.extentAsRectangle();
        this.searchResults = new org.ui.SearchResults(bounds);
        this.addMorph(this.searchResults);
    }
},
'searching', {
    searchImpl: function (str) {
        var s = str ? str.trim() : '';
        var results = s == '' ? [] : this.hub.searchSortByTypeAndDate(s);
        this.searchResults.showResults(results);
    },
    search: function (str) {
        this.search = Functions.debounce(200, this.searchImpl.bind(this));
        this.search();
    }
},
'event handling', {
    onTouchStart: function(evt) { evt.stop(); },
    onTouchMove: function(evt) { evt.stop(); },
    onTouchEnd: function(evt) { evt.stop(); }
});

org.widgets.VBox.subclass('org.ui.SearchResults',
'initialization', {
    initialize: function($super) {
        var borderSize = {top: 0, left: 0, right: 20, bottom: 10};
        $super(borderSize, 0);
        this.applyStyle({
            resizeHeight: true,
            resizeWidth: true,
            clipMode: {x: 'hidden', y: 'auto'}});
        this.setName('SearchResults');
        this.results = [];
    }
},
'serialization', {
    onstore: function() {
        this.removeAllMorphs();
    },
    doNotSerialize: ['results']
},
'displaying', {
    showResults: function(results) {
        // matching current morphs with results
        var morphs = this.submorphs.reject(function(m) { return m.isGroup }),
            matchedMorphs = 0;
        while (matchedMorphs < morphs.length &&
               matchedMorphs < results.length &&
               morphs[matchedMorphs].entity===results[matchedMorphs]){
            matchedMorphs++;
        }
        morphs.clone().each(function(morph, idx) {
            if (idx < matchedMorphs) {
                results.shift(); // keep matching morph
            } else {
                morph.remove(); // remove others
            }
        });

        // remove empty groups
        for (var i = this.submorphs.length - 1; i >= 0; i--) {
            if (this.submorphs[i].isGroup) {
                var next = this.submorphs[i+1];
                if (!next || next.isGroup) this.submorphs[i].remove();
            }
        }

        // add results until screen is about full
        this.results = results;
        var height = this.getExtent().y,
            shapeNode = this.renderContext().shapeNode;
        while (this.results.length > 0 && shapeNode.scrollHeight <= height) {
            this.showNext();
        }
        // indicate more results
        if (this.results.length > 0) {
            this.createMoreIcon();
        }
    },
    showNext: function() {
        if (this.results.length === 0) return;
        var nextResult = this.results.shift(),
            nextGroup = nextResult.getSearchGroup();
        if (this.submorphs.length == 0 ||
            this.submorphs.last().entity.getSearchGroup() !== nextGroup) {
            this.createGroup(nextGroup);
        }
        this.createIcon(nextResult);
    },
    numberToShowMore: 10,
    showMore: function() {
        var oldScroll = this.jQuery().scrollTop();
        var sm = this.get('showMore');
        if (sm) sm.remove();
        for (var i = 0; i < this.numberToShowMore; i++) {
            this.showNext();
        }
        if (this.results.length > 0) {
            this.createMoreIcon();
        }
        this.jQuery().scrollTop(oldScroll);
    },
    createGroup: function(nextGroup) {
        var group = new lively.morphic.Text(lively.rect(0,0,80,24), nextGroup);
        group.setFontSize(11);
        group.setAlign('center');
        group.setBorderWidth(0);
        group.setFill(null);
        group.setTextColor(Color.white);
        group.disableGrabbing();
        group.setInputAllowed(false);
        group.isGroup = true;
        group.layout = {resizeWidth: true};
        group.emphasizeAll({fontWeight: 'bold'});
        this.addMorph(group);
    },
    createIcon: function(entity) {
        var icon = entity.createIcon(true);
        icon.setPosition(pt(this.submorphs.length * 100, 0));
        icon.applyStyle({resizeWidth: true, resizeHeight: false});
        this.addMorph(icon);
    },
    createMoreIcon: function() {
        var more = new lively.morphic.Text(lively.rect(0,0,80,80), "...");
        more.setFontSize(30);
        more.setAlign('center');
        more.setBorderWidth(0);
        more.setFill(null);
        more.setTextColor(Color.gray);
        more.disableGrabbing();
        more.setInputAllowed(false);
        more.setName('showMore');
        more.layout = {resizeWidth: true};
        this.addMorph(more);
    }
},
'interaction', {
    onScroll: function(evt) {
        var total = this.jQuery().scrollTop() + this.getExtent().y;
        if (total == this.renderContext().shapeNode.scrollHeight) {
            this.showMore();
        }
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
        this.timeoutDialog = this.world().confirm(
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
        if (this.timeoutDialog) {
            this.timeoutDialog.removeTopLevel();
        }
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

lively.ide.SyntaxHighlighter.subclass('org.ui.Highlighter',
'settings', {
    minDelay: 300, // ms
    charLimit: 30000,
    howToStyleString: function($super, string, rules, defaultStyle) {
        var rules = $super(string, rules, defaultStyle);
        return rules.map(function(rule) {
            if (!rule[2].doit) return rule;
            rule[2] = Object.clone(rule[2]);
            rule[2].doit = {
                code: rule[2].doit.code,
                context: String(string.substring(rule[0], rule[1]))
            };
            return rule;
        });
    },
    rules: {
        // based on http://code.google.com/p/jquery-chili-js/ regex and colors
        hashtag: {
            match: /\B#\w+/g,
            style: {
                doit: {code: 'org.ui.Workspace.current().search(this)'},
                color: Color.black
            }
        }
    }
});

}) // end of module
