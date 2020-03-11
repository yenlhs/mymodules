const xray = require('aws-xray-sdk');
const DEFAULT_TIMEOUT = 25000;

class HttpsTransformer {
    constructor(callback, httpOptions, responseTransform, requestTransform, noTrace) {
        if (callback) {
            this.callback = callback;
        }
        if (!noTrace) {
            this.https = xray.captureHTTPs(require('https'));
        } else {
            this.https = require('https');
        }
        this.options = httpOptions;
        this.options.timeout = parseInt(httpOptions.timeout);
        this.responseTransform = responseTransform;
        this.requestTransform = requestTransform;
        this.authenticator = null;

        // Constants
        this.STATUS_OK = 200;
        this.STATUS_SERVER_ERROR = 500;
        this.MIMETYPE_JSON = 'application/json';
    }
}

module.exports = {
    HttpsTransformer
}