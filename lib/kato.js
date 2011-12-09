
var winston = require('winston').cli(),
    db = require('sqlite').Database(),
    cliff = require('cliff'),
    exec = require('child_process').exec,
    path = require('path');    

var regexes = {
  'old_itunes': /^(.*\/)?(\d+)-(\d+) (.+?) \d+ ?(.+?)\....$/i, // 1-13 The Defenders 113 Nevada v. Donnie The Numbers Guy.mp4
  'itunes': /^(.*\/)?(.*)\/(\d+)-(\d+) (.+?)\....$/i,          // Californication/4-07 The Rescued.mp4
  'sb_daily': /^(.*\/)?(.+?) (20\d\d.\d\d.\d\d) (.+?)\....$/i, // Real Time With Bill Maher 2011.02.04 February 4, 2011.mp4
  'sb': /^(.*\/)?(.+?)( \(20\d\d\))? S(\d+)E(\d\d)(-\d\d)? (.+?)\....$/i // Human Target (2010) S02E02 The Wife's Tale.mp4
};

var data = {};
//exports.metadata = data;

function formatEpId(season, episode) {
  var id = 'S';
  if (season < 10) id += '0';
  id += season + 'E';
  if (episode < 10) id += '0';
  id += episode;
  return id;
}

exports.atomify = function(file, callback) {
  lookupMetadata(file, function(err, success) {
    if(err) throw err;

    if (success) {
      winston.info("atomifying: " + file);
      cliff.putObject(data[file]);
      var cmd = 'AtomicParsley \"'+outFile(file)+'\" --stik \"TV Show\" --TVSeason '+data[file].season+' --TVEpisode \"'+data[file].episode_id+'\" --TVEpisodeNum '+data[file].episode+' --TVShowName \"'+data[file].show+'\" --title \"'+data[file].title+'\" --disk '+data[file].season+' --tracknum '+data[file].episode+' --album \"'+data[file].show+'\" --artist \"'+data[file].show+'\" --genre \"TV Show\" --description \"'+data[file].description+'\" --longdesc \"'+data[file].description+'\" --overWrite';

      var art = path.dirname(file) + '/folder.jpg';
      path.exists(art, function (exists) {
        if (exists) cmd += ' --artwork \"'+art+'\"';
  
        //winston.debug(cmd);
        exec(cmd, function (error, stdout, stderr) {
          if (error) throw error;

          winston.info("atomified");
          if(callback) callback();
        });
      });
      
      delete(data[file]);
    } else {
      //winston.info("no data found. atomify skipped.");
      if(callback) callback();
    }
  });
};

function outFile(file) {
  var match = file.match(/^(.*)\....$/);
  return match[1] + ".mp4";
}
exports.outFile = outFile;

function lookupMetadata(filename, callback) {
  //winston.debug("looking up data: " + filename);
  var arg, match, show_id, title, airdate;
  var daily_sql = "select showid, episode_id, name, season, episode, description, airdate from tv_episodes where showid = ? AND airdate = ?";
  var regular_sql = "select showid, episode_id, name, season, episode, description, airdate from tv_episodes where showid = ? AND season = ? AND episode = ?";
  var sql,  sql_args;
  var init_date = new Date("0001.01.02");
  arg = filename;
  //winston.info(arg);
  airdate = undefined;
  data[filename] = {};
  if ((match = arg.match(regexes.sb)) !== null) {
    //winston.debug("Sickbeard format...");
    data[filename].show = match[2];
    data[filename].season = parseInt(match[4], 10);
    data[filename].episode = parseInt(match[5], 10);
    title = match[7];
    data[filename].tv_show = true;
  } else if ((match = arg.match(regexes.itunes)) !== null) {
    //winston.debug("iTunes NEW format...");
    data[filename].show = match[2];
    data[filename].season = parseInt(match[3], 10);
    data[filename].episode = parseInt(match[4], 10);
    title = match[5];
    data[filename].tv_show = true;
  } else if ((match = arg.match(regexes.sb_daily)) !== null) {
    //winston.debug("Sickbeard daily format...");
    data[filename].show = match[2];
    //airdate = Date.parse(match[3]);
    airdate = new Date(match[3]);
    title = match[4];
    data[filename].tv_show = true;
  } else if ((match = arg.match(regexes.old_itunes)) !== null) {
    //winston.debug("iTunes OLD format...");
    data[filename].show = match[4];
    data[filename].season = parseInt(match[2], 10);
    data[filename].episode = parseInt(match[3], 10);
    title = match[5];
    data[filename].tv_show = true;
  } else { 
    //winston.warn("unrecognized file name");
  }

  if (data[filename].tv_show) {
    if((match = data[filename].show.match(/^(NCIS|Criminal Minds) (.*)/)) !== null){
      data[filename].show = match[1] + ': ' + match[2];
    }

    db.open('/Users/saadiq/dev/Sick-Beard/sickbeard.db', function(err) {
      if(err) throw err;
      db.query("select tvdb_id, show_name, genre from tv_shows where show_name like '"+data[filename].show+"%'", [], function (err, row) {
        if(err) throw err;
        if (row === undefined) {
          //winston.warn("row undefined");
          return;
        }

        //cliff.putObject(row);
        //data[filename].show = row.show_name;
        //data[filename].show = show;
        data[filename].show_id = row.tvdb_id;
        data[filename].episode_id = formatEpId(data[filename].season,data[filename].episode);
        data[filename].title = title;
        //winston.info("show id: " + data[filename].show_id);
        //cliff.putObject(data);

        //winston.info("airdate: " + airdate);
        if(airdate === undefined){
          sql = regular_sql;
          sql_args = [data[filename].show_id, data[filename].season, data[filename].episode];
          //winston.info("no airdate... regular show");
        } else {
          sql = daily_sql;
          sql_args = [show_id, (airdate - new Date("0001.01.02"))];
          //winston.info("airdate defined... daily show");
        }

        // not bothering with airdate code right now
        db.query(sql, sql_args, function(err, row) {
          if(err) throw err;
          if (row === undefined) {
            //winston.warn("row undefined");
            return;
          }

          //data[filename].episode_id = row.episode_id;
          data[filename].episode_name = row.name;
          data[filename].description = row.description;
          //cliff.putObject(data);
                    
          if(callback) callback(null, true);
        });

      });
    });
    db.close(function (error) {});
  } else {
    if(callback) callback(null, false);
  }
}
