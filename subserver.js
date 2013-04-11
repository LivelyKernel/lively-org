var lively = require('livelykernel'),
    server;

lively.onServerReady = function(hub) { server = hub; }
lively.JSLoader.require('./server');

module.exports = function(baseRoute, app) {
    app.get(baseRoute, function(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(server.asJSON());
        res.end();
    });
    app.get(baseRoute + "/journal", function(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(server.getJournal());
        res.end();
    });
    app.get(baseRoute + "images/:id", function(req, res) {
        server.getImageFor(req.params.id, function(data) {
            if (data) {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(data, 'binary');
            } else {
                res.send(500, { error: 'something blew up' });
            }
        });
    });
}
