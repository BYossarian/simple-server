#!/usr/bin/env node --harmony

"use strict";

// modules
var http = require('http'),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    mime = require('mime-types'),
    commander = require('commander');

// error messages
var errMsgs = {
    badReq: '<h1>Bad request.</h1>',
    notFound: '<h1>File not found.</h1>',
    serverErr: '<h1>Server error.</h1>',
    badMethod: '<h1>HTTP method not allowed. Use GET or HEAD.</h1>'
};

// parse arguments and set up options
commander
    .option('-p, --port <port>', 'The port to listen on (default: 8080)')
    .option('-r, --root <root>', 'The public file directory (default: current directory)')
    .option('-s, --single [page]', 'Set single page web app entry page (default: index.html)')
    .parse(process.argv);

// defaults
var port = parseInt(commander.port, 10) || 8080,
    localRoot = process.cwd(),
    entryPage = '';

if (typeof commander.single === 'string') {
    entryPage = commander.single;
} else if (commander.single) {
    entryPage = 'index.html';
}

if (commander.root) {
    localRoot = path.resolve(process.cwd(), commander.root);
}

function sanitiseURL(requestUrl) {

    // protect against malformed URLs (in which case decodeURI throws an exception)
    try {
        
        requestUrl = decodeURIComponent(url.parse(requestUrl).pathname);

        // prevent any attempt to move up the directory structure using something like ../ or /../
        requestUrl = path.join('/', requestUrl);
            
    } catch(e) {
        
        return;

    }

    return requestUrl;

}

function log(status, req) {

    var style = null;

    switch(Math.floor(status/100)) {
        case 2:
            style = [32, 39];
            break;
        case 4:
        case 5:
            style = [31, 39];
            break;
        default:
            style = [39, 39];
    }

    console.log('    \u001b[' + style[0] + 'm' + status + '\u001b[' + style[1] + 'm ' + req.method + ' ' + req.path);

}

http.createServer(function(request, res) {

    var req = {
            original: request,
            method: request.method,
            path: '',
            localPath: ''
        },
        retriedReq = false;    

    function respond(code, type, size, body) {

        log(code, req);

        type = type || 'text/plain; charset=utf-8';

        res.writeHead(code, {
            'Content-Type': type,
            'Content-Length': size
        });

        if (req.method === 'HEAD') {
            // send only headers for HEAD request
            return res.end();
        }

        if (body instanceof fs.ReadStream) {

            body.on('error', function(err) {

                // TODO
                console.log('file stream error');

            });

            body.pipe(res);

        } else {
            res.end(body);
        }   

    }

    function processFile(err, stats) {

        if (err) {

            if (err.code === 'ENOENT') {

                // single page app returns entry page
                if (entryPage && !retriedReq) {
                    // boolean to prevent loop (when entry page doesn't exist):
                    retriedReq = true;
                    return processReq(entryPage);
                }

                return respond(404, '', errMsgs.notFound.length, errMsgs.notFound);

            }

            return respond(500, '', errMsgs.serverErr.length, errMsgs.serverErr);

        }

        if (stats.isFile()) {
            // file

            respond(200, mime.contentType(path.basename(req.localPath)), stats.size, fs.createReadStream(req.localPath));

        } else if (stats.isDirectory()) {
            // directory

            processReq(path.join(req.path, '/index.html'));

        } else {

            respond(400, '', errMsgs.badReq.length, errMsgs.badReq);

        }

    }

    function processReq(reqUrl) {

        // handle only GET and HEAD requests for now:
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return respond(405, '', errMsgs.badMethod.length, errMsgs.badMethod);
        }

        req.path = sanitiseURL(reqUrl);

        if (typeof req.path !== 'string') {
            // malformed URL

            return respond(400, '', errMsgs.badReq.length, errMsgs.badReq);
        }

        req.localPath = path.join(localRoot, req.path);
        
        fs.stat(req.localPath, processFile);

    }

    processReq(req.original.url);

}).listen(port, function() {

    console.log('\n  Server running on port ' + port + ' with a root of ' + localRoot + '\n');

});