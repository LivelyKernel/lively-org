module('org.widgets').requires('org.model', 'lively.morphic').toRun(function() {

org.model.Entity.addMethods({
    createIcon: function() {
        // override in subclasses
    },
    createView: function() {
        // override in subclasses
    }
});

lively.morphic.Box.subclass("org.widgets.Box", {
    initialize: function($super, layoutClass, padding, spacing) {
        $super(lively.rect(0, 0, 105, 105));
        this.ignoreEvents();
        this.layout = {resizeWidth: true, resizeHeight: true};
        var layouter = new layoutClass(this);
        layouter.setBorderSize(padding === undefined ? 20 : padding);
        layouter.setSpacing(spacing === undefined ? 20 : spacing);
        layouter.displaysPlaceholders = Functions.False;
        layouter.setHandlesSubmorphResized(true);
        Object.addScript(layouter, function orderedSubmorphs(submorphs) {
            return submorphs.reject(function(ea) {
                return ea.isEpiMorp || !ea.isLayoutable;
            });
        });
    }
});

org.widgets.Box.subclass("org.widgets.HBox", {
    initialize: function($super, padding, spacing) {
        $super(lively.morphic.Layout.HorizontalLayout, padding, spacing);
    }
});

org.widgets.Box.subclass("org.widgets.VBox", {
    initialize: function($super, padding, spacing) {
        $super(lively.morphic.Layout.VerticalLayout, padding, spacing);
    }
});

lively.morphic.Box.subclass('org.widgets.View',
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
            // store only entity id, not real entity
            persistentCopy.$entity = this.entity.getTypedId();
        }
    },
    onrestore: function() {}
});

org.widgets.View.subclass('org.widgets.Icon',
'settings', {
    defaultExtent: lively.pt(80, 96),
    verticalListExtent: lively.pt(160, 48)
},
'initialization', {
    initialize: function($super, entity, verticalList) {
        var extent = verticalList?this.verticalListExtent:this.defaultExtent;
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
        return this.entity.createCard();
    },
    onDragStart: function(evt) {
        var card = this.createCard();
        this.world().firstHand().grabMorph(card);
        return true;
    }
},
'optimization', {
    getGrabShadow: function() {
        return new lively.morphic.Box(this.getBounds());
    }
});

org.widgets.HBox.subclass('org.widgets.IconList',
'initialization', {
    initialize: function($super) {
        $super(0, 0);
        this.layout.resizeHeight = false;
        this.setBorderRadius(5);
        this.setClipMode({x: 'auto', y: 'hidden'});
    }
},
'entities', {
    updateEntities: function(newEntities) {
        var oldEntities = this.submorphs.map(function(m) {
            return m.entity;
        });
        // remove obsolete users
        oldEntities.withoutAll(newEntities).each(function(ea) {
            this.submorphs
                .find(function(m) { return m.entity == ea; })
                .remove();
        }, this);
        // add new users
        newEntities.withoutAll(oldEntities).each(function(ea) {
            this.addMorph(ea.createIcon());
        }, this);
    }
},
'updating', {
    connect: function(hub) {
        this.submorphs.invoke('connect', hub);
    },
    disconnect: function() {
        this.submorphs.invoke('disconnect');
    }
});

lively.morphic.Text.subclass('org.widgets.Tag',
'settings', {
    defaultHeight: 20
},
'initialization', {
    initialize: function($super, tagName) {
        var label = tagName ? tagName : 'all';
        var extent = lively.pt(label.length * 12, this.defaultHeight);
        $super(extent.extentAsRectangle(), label);
        this.tagName = tagName;
        this.setBorderRadius(6);
        this.setFixedWidth(true);
        this.setFixedHeight(true);
        this.setFontSize(10);
        this.setAlign('center');
        this.setInputAllowed(false);
    },
    removeUnlessInTags: function(tags) {
        if (this.tagName && !tags.include(this.tagName)) {
            this.remove();
        }
    }
},
'events', {
    onMouseDown: function(evt) {
        if (evt.isLeftMouseButtonDown()) {
            this.owner.owner.setFilter(this.tagName);
        }
    }
},
'activation', {
    setActive: function(tagName) {
        if (this.tagName === tagName) {
            this.activate();
        } else {
            this.deactivate();
        }
    },
    activate: function() {
        this.setFill(new Color(0.3, 0.3, 0.3));
        this.setTextColor(Color.white);
    },
    deactivate: function() {
        this.setFill(new Color(0.9, 0.9, 0.9));
        this.setTextColor(new Color(0.3, 0.3, 0.3));
    }
});

org.widgets.HBox.subclass('org.widgets.TagList',
'settings', {
    defaultHeight: 20,
    updateBufferTime: 500
},
'initialization', {
    initialize: function($super) {
        $super(5, 5);
        this.layout.resizeHeight = false;
        this.setExtent(lively.pt(100, this.defaultHeight));
    }
},
'user interface', {
    createTagMorph: function(tagName) {
        var tag = new org.widgets.Tag(tagName);
        tag.setActive(this.owner.filter);
        this.addMorph(tag);
    },
    setFilter: function(filter) {
        this.submorphs.invoke('setActive', filter);
    }
},
'updating', {
    setTags: function(tags) {
        if (tags.length == 0) { // trivial case
            this.removeAllMorphs();
            this.setExtent(lively.pt(this.getExtent().x, 0));
            this.owner.setFilter();
            return;
        }
        // remove obsolete tags
        this.submorphs.invoke('removeUnlessInTags', tags);
        // add new tags (undefined means 'all')
        tags.unshift(undefined);
        var currentTags = this.submorphs.pluck('tagName');
        tags.each(function(tag) {
            if (!currentTags.include(tag)) {
                this.createTagMorph(tag);
            }
        }, this);
        // fallback to 'all' if no other tag is selected
        if (!this.submorphs.any(function(m) {
            return m.tagName === this.owner.filter;
        }, this)) this.owner.setFilter();
    },
    updateTags: function() {
        this.updateTags = Functions.debounce(
            this.updateBufferTime,
            this.updateTagsImpl.bind(this));
        this.updateTags();
    },
    updateTagsImpl: function() {
        var entities = this.owner.getEntities();
        var tags = [];
        entities.each(function(entity) {
            var foundTags = entity.getTags();
            if (foundTags) foundTags.each(function(t) {
                tags.pushIfNotIncluded(t);
            });
        }, this);
        this.setTags(tags);
    }
});

org.widgets.VBox.subclass('org.widgets.EntityList',
'initialization', {
    initialize: function($super, options) {
        options = options || {};
        var borderSize = {top: 0, left: 0, right: 20, bottom: 10};
        $super(borderSize, 0);
        this.entities = [];
        this.setClipMode({x: 'hidden', y: 'auto'});
        if (options.tags) {
            this.initializeTagList();
            this.tagList.updateTags();
        }
    }
},
'tagging', {
    initializeTagList: function() {
        this.tagList = new org.widgets.TagList();
        this.addMorph(this.tagList);
    },
    setFilter: function(hashtag) {
        if (hashtag === this.filter) return; // do nothing
        this.filter = hashtag;
        this.tagList.setFilter(this.filter);
        this.update();
    }
},
'accessing', {
    getEntities: function() {
        return this.entities;
    },
    setEntities: function(entities) {
        this.entities = entities;
        this.update();
    },
    getViews: function() {
        return this.submorphs.select(function(m) {
            return m instanceof org.widgets.View;
        });
    }
},
'updating', {
    addViewForEntity: function(entity) {
        var view = entity.createIcon();
        view.layout.resizeWidth = true;
        this.addMorph(view);
        if (this.tagList) {
            entity.onChanged('content', this.tagList, 'updateTags');
        }
        return view;
    },
    getViewForEntity: function(entity) {
        return this.submorphs.find(function(m) {
            return m instanceof org.widgets.View && m.entity === entity;
        });
    },
    update: function() {
        var newEntities = this.filter ? this.entities.select(function(entity) {
            return entity.hasTag(this.filter);
        }, this) : this.entities;
        // remove obsolete views
        this.getViews().each(function(view) {
            if (!newEntities.include(view.entity)) view.remove();
        }, this);
        // add new views
        newEntities.each(function(ea) {
            if (!this.getViewForEntity(ea)) this.addViewForEntity(ea);
        }, this);
    },
    connect: function() {
        this.getViews().invoke('connect');
        this.getViews().pluck('entity').each(function(e) {
            e.onChanged('content', this.tagList, 'updateTags');
        }, this);
    },
    disconnect: function() {
        this.getViews().pluck('entity').each(function(e) {
            e.offChanged('content', this.tagList, 'updateTags');
        }, this);
        this.getViews().invoke('disconnect');
    }
});




}) // end of module