module.exports = function getMIME(path) {

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

};