var chalk = require('chalk'),
  util = require('util'),
  fs = require('fs'),
  _ = require('lodash');

var options = {
  colors: {
    'file name': 'magenta',
    'warn': 'yellow',
    'error': 'red',
    'error message': 'cyan',
    'warn message': 'cyan'
  },
  indentation: 4,
  stream: process.stdout
};

function prepareColor(color) {
  var splitted = color.split('.');
  var style = chalk;
  while(splitted.length) style = style[splitted.shift()];
  return style;
}

function prepareColors(colors) {
  for(var name in colors) {
    colors[name] = prepareColor(colors[name]);
  }
}

prepareColors(options.colors);

function color(name) {
  var args = Array.prototype.slice.call(arguments, 1);
  return options.colors[name].apply(null, args);
}



module.exports = {
  reporter: function (results, data, opts) {
    var indentationLevel = 1;

    function write() {
      var ident = new Array(options.indentation * indentationLevel).join(' ');
      options.stream.write(ident + util.format.apply(util, arguments));
    }

    function writeLine() {
      var args = Array.prototype.slice.call(arguments);
      args.push('\n');
      write.apply(this, args);
    }

    var preparedData = {};
    results.forEach(function(errorData) {
      preparedData[errorData.file] = preparedData[errorData.file] || [];
      preparedData[errorData.file].push({
        type: 'error',
        character: errorData.error.character,
        line: errorData.error.line,
        evidence: errorData.error.evidence,
        reason: errorData.error.reason
      });
    });

    var fsCache = {};
    data.forEach(function (data) {
      file = data.file;
      globals = data.implieds;
      unuseds = data.unused;

      if(globals || unuseds) {
        preparedData[file] = preparedData[file] || [];
        if(!fsCache[file]) {
          fsCache[file] = fs.readFileSync(file, { encoding: 'utf8' }).split('\n');
        }

        if (globals) {
          globals.forEach(function(glob) {
            glob.line.forEach(function(lineNumber) {
              preparedData[file].push({
                type: 'warn',
                line: lineNumber,
                evidence: fsCache[file] ? fsCache[file][lineNumber - 1] : '',
                reason: 'Implied global \'' + glob.name + '\''
              });
            });
          });
        }
        /*if (unuseds) {
          unuseds.forEach(function(unused) {
            preparedData[file].push({
              type: 'warn',
              character: unused.character,
              line: unused.line,
              evidence: fsCache[file] ? fsCache[file][unused.line - 1] : '',
              reason: 'Unused variable \'' + unused.name + '\''
            });
          });
        } it is usually contained in errors */
      }
    });


    _.each(preparedData, function(errors, file) {
      writeLine();
      writeLine(color('file name', '%s') + ':', file);
      indentationLevel++;

      errors = _.sortBy(errors, 'line');

      errors.forEach(function(error) {
        writeLine();
        writeLine(color(error.type, '%d') + ' | %s', error.line, error.evidence);
        var prefixLength = ('' + error.line + ' | ').length;
        var padding = new Array(prefixLength + error.evidence.length);
        padding[prefixLength + error.character - 1] = color(error.type, '^');
        writeLine(padding.join(' '));
        writeLine(color(error.type + ' message', '%s'), error.reason);
      });

      indentationLevel--;
    });
  }
};

