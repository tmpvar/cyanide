#!/usr/bin/env node


var argv = require('optimist').argv;
var marked = require('marked');
var exec = require('child_process').exec;
var glob = require('glob');
var path = require('path');
var fs = require('fs');
var microdom = require('microdom');

require('microdom.byname');


if (!argv._.length) {
  return console.log('usage: cyanide <command> path/to/dir');
}

var root = path.join(process.cwd(), argv._[0]);
var master = fs.readFileSync(path.join(root, 'master.html'), 'utf8');


microdom.plugin({

  byId: function(id) {

    if (this.attr('id') === id) {
      return this;
    }

    var c = this.length();
    while (c--) {
      var node = this.child(c).byId(id);
      if (node) {
        return node;
      }
    }
  }
});

microdom.plugin(function(proto) {

  proto.toString = function(level) {
    if (this.name === 'text') {
      return this.value;
    }

    var ret = '';
    level = level || 0;
    if (this.name) {
      
      ret += '<' + this.name;

      Object.keys(this.attributes).forEach(function(attr) {
        ret += ' ' + attr + '="' + this.attr(attr) + '"';
      }.bind(this));
    }

    if (this.length()) {
      if (this.name) {
        ret += ">";
      }

      for (var i = 0; i<this.length(); i++) {
        ret += this.child(i).toString(level + 1);
      }

      if (this.name) {
        ret += '</' + this.name + '>\n';
      }
    } else {
      ret += " />";
    }

    return ret;
  }
});

glob(path.join(root, 'posts', '*.md'), function(err, posts) {
  posts.forEach(function(post) {
    var stats = fs.statSync(post);

    var parser = microdom.sax.createStream(true);
    var dom = microdom();
    microdom.parse(parser, dom);

    parser.end(master);
    dom.byId('content').append(marked(fs.readFileSync(post, 'utf8')));

    var el = dom.byId('content').byName('h1')[0];
    var name = el.attr('id');
    dom.byName('title')[0].child(0).value += el.child(0).value;

    var targetFile = path.join(root, 'static', name + '.html')


    var targetStats;
    try {
      targetStats = fs.statSync(targetFile);
    } catch (e) {}

    if (!targetStats || targetStats.mtime < stats.mtime || argv.force) {
      fs.writeFileSync(
        targetFile,
        dom.toString()
      );

      console.log(' + ' + name);
    }

  });
});
