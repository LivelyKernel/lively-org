Lively Org
----------

Lively Org is an organizer for people and projects with built-in realtime
collaboration. It can be used for assigned tasks to people, discussing topics,
and organizing different projects within an organization.

It is based on [LivelyKernel][1], written in pure JavaScript and it
synchronizes all changes made to entities to every other open instance of the
system and additionally keeps a log of these changes which can later be used
to review the history of each project and person and potentially undo any
change that needs to be reverted.

It has a desktop-like interface with sticky notes, which can be freely
positioned on the screen, and it uses drag-and-drop for most interactions.

Features
--------

 * Managing projects and collaboratively updating their description
 * Creating and attaching sticky notes to people and projects
 * Universal full-text search for finding any project, person or sticky note
 * Realtime synchronization between multiple connected Lively Org instances
 * History of changes to all entities over time

Syncronization is done by communicating with [Socket.IO][2] to the Lively Org
Server running with [Node.js][3] and storing changes with [Alfred][4].
(However, I consider using [SQLite][5] in the future.

Installation
------------

1. Clone this repository as ``org`` into the lively root folder (next to ``/core/``)

    $ cd /path/to/livelykernel
    $ git clone http://github.com/LivelyKernel/lively-org org

2. Add the following line to ``/core/lively/localconfig.js``:

    lively.Config.add("modulePaths", "org");

3. Install dependencies with npm

    $ cd org
    $ npm install

4. Create a link to ``subserver.js`` in the
   ``livelykernel-scripts/node_modules/life_star/subservers/`` directory.

    $ ln -s `pwd`/subserver.js /path/to/livelykernel-scripts/node_modules/life_star/subservers/org.js

5. Start the LivelyKernel server with

    $ lk server

[1]: http://github.com/LivelyKernel/LivelyKernel
[2]: http://socket.io/
[3]: http://nodejs.org/
[4]: http://pgte.github.io/alfred/
[5]: http://www.sqlite.org/
