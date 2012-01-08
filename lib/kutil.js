var winston = require('winston').cli(),
    cliff = require('cliff'),
    fs = require('fs'),
    nconf = require('nconf');

exports.config_file = process.env.HOME + '/.katorc';

nconf.file({ file: exports.config_file});
nconf.load();

exports.itunes_auto_dir = nconf.get('itunes_auto_dir');
exports.sickbeard_dir = nconf.get('sickbeard_dir');
exports.couchpotato_dir = nconf.get('couchpotato_dir');
exports.valid_patterns = [/\.avi$/i,/\.mkv$/i];

exports.fileOrDir = function(path, fileFunc, dirFunc, callback) {
  fs.stat(path, function (err, stats) {
    if (err) throw err;
    if (stats.isFile()) fileFunc(path, callback);
    else if (stats.isDirectory()) dirFunc(path, callback);
    else {
      winston.warn("Neither file nor directory: " + path);
      callback();
    }
  });
};

exports.outFile = function(file) {
  var match = file.match(/^(.*)\....$/);
  return match[1] + ".mp4";
};