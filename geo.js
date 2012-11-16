#!/usr/bin/env node

var color = require('color');
// Send test text message
var readline = require('readline');
var fs = require('fs');

var bootstrap = require('./test/bootstrap');
var makeQ = bootstrap.makeAuthQuery;
var request = bootstrap.request;
var xml2json = bootstrap.xml2json;

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var text_msg = fs.readFileSync(__dirname + '/test/wx_geo.xml', 'utf-8');

function run() {
  rl.question('x: ', function(text) {
    var text = text || '23.08';
    var t = text_msg.replace('23.0886', text);
    rl.question('y:', function(text) {
      var text = text || '113.24';
      var req = request.build('POST /', makeQ(), function(err, ret) {
        console.log(ret);
        var xml = JSON.parse(xml2json.toJson(ret)).xml;
        if (err) throw err;
        console.log(xml);
        console.log('\n');
        run();
      });
      req.write(t.replace('113.25', text));
      req.end();
    });
  });
}

run();
