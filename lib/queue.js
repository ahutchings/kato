var async = require('async'),
    winston = require('winston').cli(),
    cliff = require('cliff'),
    finder = require('findit'),
    watch = require('watch'),
    neuron = require('neuron'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    path = require('path'),
    atomify = require('./atomify.js'),
    kutil = require('./kutil.js');

var ignore = {};

//cliff.putObject(argv);

exports.transcode = function(file) {
  kutil.fileOrDir(file, processFile, processDir);
};

exports.atomify = function(file) {
  winston.info("queueing up " + file);
  manager.enqueue('atomify', file);
};

//
// Create the manager and set the job.
//
var manager = new neuron.JobManager();
manager.addJob('atomify', {
  concurrency: 1,
  work: function(file) {
    var self = this;
    atomify.run(file, function() {
      self.finished = true;
    });
  }
});
manager.addJob('transcode', {
  //dirname: __dirname,
  concurrency: 1,
  work: function (file) {
    winston.info("processing: " + file);
    var self = this;
    var ofile = kutil.outFile(file);
    ignore[ofile] = true;
    hb = spawn('HandBrakeCLI', ['-Z', "iPhone 4", '-i', file, '-o', ofile]);
    hb.stdout.on('data', function (data) {
      winston.info('stdout: ' + (String(data)).replace(/(\n|\r)+$/, ''));
    });
    hb.stderr.on('data', function (data) {
      console.log((String(data)).replace(/(\n|\r)+$/, ''));
    });
    hb.on('exit', function (code) {
      manager.enqueue('atomify',ofile);
      self.finished = true;
    });
  }
});
manager.on('finish', function (job, worker) {
  if(job.name == 'atomify') {
    setTimeout(unignore, 3000, kutil.outFile(worker.args[0]));
  } else if(job.name == 'transcode') {
    unignore(worker.args[0]);
  }
});

function unignore(file) {
  delete(ignore[file]);
  //winston.info("unignore " + file);
}

function queueUp( file, callback ) {
  //cliff.putObject(file);

  var valid = false;
  for( var x in kutil.valid_patterns) {
    if( file.match( kutil.valid_patterns[x]) ) {
      valid = true;
      break;
    }
  }

  if( valid ) {
    winston.info("queueing: " + file);
    path.exists(kutil.outFile(file), function (exists) {
      if (!exists) manager.enqueue('transcode',file);
      else if (argv.overwrite) {
        winston.info("overwriting existing outfile");
        manager.enqueue('transcode',file);
      } else {
        winston.info("skipped. outfile already exists.");
        delete(ignore[file]);
      }

      if (callback) callback();
    });
  } else {
    //winston.info("invalid file. doesn't match: " + kutil.valid_patterns);
    delete(ignore[file]);
    if (callback) callback();
  }
}

function watchDir( watch_dir) {
	if (ignore[watch_dir]) return;
	else ignore[watch_dir] = true;
  watch.watchTree(watch_dir, function (file, curr, prev) {
    if (typeof file == "object" && prev === null && curr === null) {
      // Finished walking the tree
      winston.info("watching " + watch_dir);
    } else if (prev === null) {
      // f is a new file
      queueUp(file);
    } else if (curr.nlink === 0) {
      // f was removed
    } else {
      // f was changed
      //queueUp(file);
    }
  });
}

function queueContents(dir) {
  finder.find(dir, function (file) {
    fs.stat(file, function (err, stats) {
      if (err) throw err;
      if (stats.isFile()) {
        queueUp(file.replace('//', '/'));
      }
    });
  });
}

function processFile(path, callback) {
  queueUp(path, callback);
  if (callback) callback();
}
function processDir(path, callback) {
  queueContents(path);
  watchDir(path);
  if (callback) callback();
}
