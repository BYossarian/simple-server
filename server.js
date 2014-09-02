#!/usr/bin/env node --harmony

// copy to /usr/local/bin/server

"use strict";

// modules
var http = require('http'),
    fs = require('fs'),
    url = require('url');

var localRoot = process.argv[2] || process.cwd();

// error messages
var badReq = "<h1>Bad request.</h1>",
    notFound = "<h1>File not found.</h1>",
    serverErr = "<h1>Server error.</h1>",
    badMeth = "<h1>HTTP method not allowed. Use GET or HEAD.</h1>";

http.createServer(function(req, res) {

    var method = req.method,
        reqPath = "",
        headers = {};

    function log(code) {

        console.log(code + " " + method + " " + reqPath.replace(localRoot, ""));

    }

    function respond(code, type, size, body) {

        log(code);

        type = type || 'text/html; charset=utf-8';

        res.writeHead(code, {
            'Content-Type': type,
            'Content-Length': size
        });

        if (method === "GET") {

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

    function getMIME(path) {

        var extension = path.replace(/^.*\./,"");

        switch(extension) {
            case "html":
            case "htm":
                return "text/html; charset=utf-8";
            case "txt":
                return "text/plain; charset=utf-8";
            case "css":
                return "text/css; charset=utf-8";
            case "js":
                return "text/javascript; charset=utf-8";
            case "md":
                return "text/x-markdown; charset=utf-8";
            case "jpeg":
            case "jpg":
                return "image/jpeg";
            case "gif":
                return "image/gif";
            case "png":
                return "image/png";
            case "svg":
                return "image/svg+xml";
            case "ico":
                return "image/x-icon";
            default:
                return "application/octet-stream";
        }

    }

    function processFile(err, stats) {

        if (err) {

            if (err.code = "ENOENT") {

                respond(404, "", notFound.length, notFound);

            } else {

                respond(500, "", serverErr.length, serverErr);

            }

        } else {

            if (stats.isFile()) {
                // file

                respond(200, getMIME(reqPath), stats.size, fs.createReadStream(reqPath));

            } else if (stats.isDirectory()) {
                // directory

                reqPath = reqPath.replace(/\/*$/,"/index.html");
                fs.stat(reqPath, processFile);

            } else {

                respond(400, "", badReq.length, badReq);

            }

        }

    }

    // protect against malformed URLs (in which case decodeURI throws an exception)
    try {
        
        reqPath = decodeURIComponent(url.parse(req.url).pathname);
        // prevent any attempt to move up the directory structure using something like ../ or /../
        reqPath = reqPath.replace(/(^|[\/\\])\.\.(?=([\/\\]|$))/g, "").replace(/^\/?/, "/");
        
        reqPath = localRoot + reqPath;
    
    } catch(e) {
        
        respond(400, "", badReq.length, badReq);
        return;

    }
    
    if (method === "GET" || method === "HEAD") {

        fs.stat(reqPath, processFile);

    } else {
        
        respond(405, "", badMeth.length, badMeth);

    }

}).listen(8080);

console.log("\nServer running on port 8080 with a root of " + localRoot + "\n");