var nconf = require('nconf'),
    winston = require('winston').cli(),
    cliff = require('cliff'),
    fs = require('fs'),
    prompt = require('prompt'),
    kutil = require('../lib/kutil.js');

nconf.file({ file: kutil.config_file});
nconf.load();

function prepopMsg(key, msg, valid, warn) {
  var prop = {
              name: key,
              message: msg,
              validator: valid,
              warning: warn
            };
  if( nconf.get(key)) {
    prop.default = nconf.get(key);
  }
  obj.push(prop);
}
var path_warn = 'Path doesn\'t exist!';
function pathValidator(value) {
  return fs.existsSync(value);
}
function hbPresetValidator(value) {
  return value.match(/^[1234567]$/) || 
         value.match(/^Universal|iPod|iPhone & iPod Touch|iPhone 4|iPad|AppleTV|AppleTV 2$/);
}

var obj = [];
prepopMsg('itunes_auto_dir', 'Where is your iTunes "Automatically Add" directory?', pathValidator, path_warn);
prepopMsg('sickbeard_dir', 'Where is Sick Beard installed?', pathValidator, path_warn);
prepopMsg('couchpotato_dir', 'Where is CouchPotato installed?', pathValidator, path_warn);
prepopMsg('handbrake_preset', 
          'Default Handbrake preset?\n1) Universal\n2) iPod\n3) iPhone & iPod Touch\n4) iPhone 4\n5) iPad\n6) AppleTV\n7) AppleTV 2\n[1/2/3/4/5/6/7]',
          hbPresetValidator, 'Pick a number.');
var hb_presets = [ '',
'Universal',
'iPod',
'iPhone & iPod Touch',
'iPhone 4',
'iPad',
'AppleTV',
'AppleTV 2'
];

exports.required = function() {
  return !fs.existsSync(kutil.config_file) || !nconf.get('handbrake_preset');
};

exports.run = function() {
  winston.info("Config mode");
  prompt.start();
  prompt.get(obj, function(err, result){
    if(err) throw err;
    
    if(result.handbrake_preset.match(/^\d$/)) {
      result.handbrake_preset = hb_presets[result.handbrake_preset];
    }
    cliff.putObject(result);
    nconf.set('itunes_auto_dir', result.itunes_auto_dir);
    nconf.set('sickbeard_dir', result.sickbeard_dir);
    nconf.set('couchpotato_dir', result.couchpotato_dir);
    nconf.set('handbrake_preset', result.handbrake_preset);

    nconf.save(function (err) {
     if (err) throw err;
     winston.info('Config saved successfully.');
    });
  });
};
