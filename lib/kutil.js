var winston = require('winston').cli(),
    cliff = require('cliff'),
    fs = require('fs');

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