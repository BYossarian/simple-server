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
    badReq: "<h1>Bad request.</h1>",
    notFound: "<h1>File not found.</h1>",
    serverErr: "<h1>Server error.</h1>",
    badMethod: "<h1>HTTP method not allowed. Use GET or HEAD.</h1>"
};

// parse arguments and set up options
commander
    .option('-p, --port <port>', 'The port to listen on (default: 8080)')
    .option('-r --root <root>', 'The public file directory (default: current directory)')
    .parse(process.argv);

// defaults
var port = commander.port || 8080,
    localRoot = process.cwd();

if (commander.root) {
    localRoot = path.resolve(process.cwd(), commander.root);
}

http.createServer(function(req, res) {

    var method = req.method,
        reqPath = "",
        headers = {};

    function log(code) {

        var style = null;

        switch(Math.floor(code/100)) {
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

        console.log("    \u001b[" + style[0] + "m" + code + "\u001b[" + style[1] + "m " + method + " " + reqPath);

    }

    function respond(code, type, size, body) {

        log(code);

        type = type || 'text/plain; charset=utf-8';

        res.writeHead(code, {
            'Content-Type': type,
            'Content-Length': size
        });

        if (method !== "HEAD") {

            if (body instanceof fs.ReadStream) {

                body.on('error', function(err) {

                    // TODO
                    console.log('file stream error');

                });

                body.pipe(res);

            } else {
                res.end(body);
            }
            
        } else {

            // send only headers for HEAD request
            res.end();
        }        

    }

    function processFile(err, stats) {

        if (err) {

            if (err.code = "ENOENT") {

                respond(404, "", errMsgs.notFound.length, errMsgs.notFound);

            } else {

                respond(500, "", errMsgs.serverErr.length, errMsgs.serverErr);

            }

        } else {

            if (stats.isFile()) {
                // file

                respond(200, mime.contentType(path.basename(reqPath)), stats.size, fs.createReadStream(reqPath));

            } else if (stats.isDirectory()) {
                // directory

                reqPath = reqPath.replace(/\/*$/,"/index.html");
                fs.stat(reqPath, processFile);

            } else {

                respond(400, "", errMsgs.badReq.length, errMsgs.badReq);

            }

        }

    }

    // protect against malformed URLs (in which case decodeURI throws an exception)
    try {
        
        reqPath = decodeURIComponent(url.parse(req.url).pathname);

        // prevent any attempt to move up the directory structure using something like ../ or /../
        reqPath = path.join('/', reqPath);
        
        reqPath = path.join(localRoot, reqPath);
    
    } catch(e) {
        
        respond(400, "", errMsgs.badReq.length, errMsgs.badReq);
        return;

    }
    
    if (method === "GET" || method === "HEAD") {

        fs.stat(reqPath, processFile);

    } else {
        
        respond(405, "", errMsgs.badMethod.length, errMsgs.badMethod);

    }

}).listen(port, function() {

    console.log("\n  Server running on port " + port + " with a root of " + localRoot + "\n");

});