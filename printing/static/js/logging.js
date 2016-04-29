"use strict"
var Logger = function () {
    self = this;
    self.DEBUG = 10;
    self.INFO = 20;
    self.WARNING = 30;
    self.ERROR = 40;
    self.CRITICAL = 50;

    self.log_level = self.WARNING;

    self.set_level = function(log_level) {
        self.log_level = log_level;
    }

    self.debugable = function() {
        return self.log_level <= self.DEBUG;
    }
    self.infoable = function(){
        return self.log_level <= self.INFO;
    }
    self.warningable = function() {
        return self.log_level <= self.WARNING
    }
    self.errorable = function() {
        return true;
    }
    self.criticalable = function() {
        return true;
    }

    self.debug = function(msg) {
        if (self.log_level <= self.DEBUG) {
            console.log("debug:" + msg);
        }
    }
    self.info = function(msg) {
        if (self.log_level <= self.INFO) {
            console.log("info:" + msg);
        }
    }
    self.warning = function(msg) {
        if (self.log_level <= self.WARNING) {
            console.log("warning:" + msg);
        }
    }
    self.error = function(msg) {
        console.log("error:" + msg);
    }
    self.critical = function(msg) {
        console.log("critical:" + msg);
    }
    /*
     * Return true if msg is not a error msg; otherwise return false
     */
    self.relay = function(msg) {
        if (msg.substr(0,6) == "debug:" || msg.substr(0,5) == "info:" || msg.substr(0,8) == "warning:") {
            console.log(msg);
            return true;
        } else if (msg.substr(0,6) == "error:" || msg.substr(0,9) == "critical:") {
            console.log(msg);
            return false;
        } else if (msg.toLowerCase().indexOf("error") >= 0) {
            console.log("warning:" +  msg);
            return true;
        } else {
            console.log("info:" + msg);
            return true;
        }
    }
    return self;
};
var logger = new Logger();
if ('undefined' !== typeof exports)
    exports.logger = new Logger();

