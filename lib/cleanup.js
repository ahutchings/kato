var async = require('async'),
    finder = require('findit'),
    prompt = require('prompt'),
    winston = require('winston').cli(),
    cliff = require('cliff'),
    fs = require('fs'),
    path = require('path'),
    kutil = require('./kutil.js'),
    remove = [], move = [];

exports.run = function(paths) {
  async.forEach(paths, function(item, callback) {
    kutil.fileOrDir(item, cleanupFile, cleanupDir, callback);
  }, function(err) {
    if (err) throw err;
    move.sort();
    remove.sort();
    promptAndProcess();
  });
};

function cleanupFile(path, callback) {
  // add file to move or remove list
  if (path.match(/\.mp4$/)){
    move.push(path);
  } else if (path.match(/\.nfo$/) && !path.match(/tvshow\.nfo$/)){
    remove.push(path);
  } else {
    for( var x in kutil.valid_patterns) {
      if( path.match( kutil.valid_patterns[x]) ) {
        remove.push(path);
      }
    }
  }
  if(callback) callback();
}
function cleanupDir(path, callback) {
  // check contents of dir for files to move or remove
  var files = finder.sync(path);
  winston.info("total files: " + files.length);
  if( files.length > 0) {
    async.forEach(files, function(file, cb2) {
      fs.stat(file, function (err, stats) {
        if (err) throw err;
        if (stats.isFile()) {
          cleanupFile(file.replace('//', '/'), cb2);
        } else {
          cb2();
        }
      });
    }, function(err) {
      if(err) throw err;
      //if(callback) callback();
    });
  } else {
    // for whatever reason, adding this callback hangs the app :-/ not sure why
    winston.info("no files");
    //if(callback) callback();
  }
}

function throwErr(err) {
  if (err) throw err;
}

function promptAndProcess() {
  var objs = [];
  for( var i = 0; i < move.length; i++) {
    objs.push({
                name: i +'',
                message: move[i] + "? " + "[y/n/s]".cyan,
                validator: /^[yns]$/i,
                default: 'y'
              });
  }
  prompt.start();
  prompt.message = "move".magenta;
  prompt.get(objs, function(err, result){
    //cliff.putObject(result);

    for( i = 0; i < move.length; i++) {
      if(result[i] == 'y'){
        winston.info("moving " + move[i]);
        fs.rename(move[i], kutil.itunes_auto_dir +'/'+ path.basename(move[i]), throwErr);
      }
    }

    prompt.message = "remove".red;
    objs = [];
    for( i = 0; i < remove.length; i++) {
      objs.push({
                  name: i +'',
                  message: remove[i] + "? " + "[y/n/s]".cyan,
                  validator: /^[yns]$/i,
                  default: 'y'
                });
    }
    prompt.get(objs, function(err, result){
      //cliff.putObject(result);
      for( i = 0; i < remove.length; i++) {
        if(result[i] == 'y'){
          winston.info("removing " + remove[i]);
          fs.unlink(remove[i], throwErr);
        }
      }
    });
  });
}
