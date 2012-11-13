var https = require('https');
var http = require('http');
var url_util = require('url');

var debug = require('debug');
var log = debug('wx');
var error = debug('wx:request:error');

var conf = require('../conf');

function makeReq(url, params, next) {
  var tmp = url.split(' ');
  var info = url_util.parse(tmp.pop());
  if (!next) {
    next = params;
    params = null;
  }
  info.query = params;

  var m = (info.protocol === 'https:') ? https : http;

  info.protocol = info.protocol || 'http:';

  if (!info.hostname) {
    info.hostname = conf.hostname || '127.0.0.1';
    info.port = info.port || conf.port || 3000;
  }
  if (info.host == 'api.douban.com') {
    params.apikey = conf.douban.apikey;
  }

  info = url_util.format(info);
  var method = tmp[0] || 'GET';
  log(method, ': ', info);
  info = url_util.parse(info);
  info.method = method;

  var cb = next;
  if (next.length > 1) {
    cb = function(res) {
      var err = null;
      var ret = '';
      if (res.statusCode !== 200) {
        error('Request failed: ', url_util.format(info));
        return next(res.statusCode);
      }
      res.on('data', function(chunk) {
        ret += chunk;
      });
      res.on('error', function(e) {
        err = e;
      });
      res.on('end', function(e) {
        if (err) return next(err, ret);
        try {
          ret = JSON.parse(ret);
        } catch (e) {}
        next(null, ret);
      });
    };
  }

  return m.request(info, cb);
}

function request() {
  var req = makeReq.apply(this, arguments);
  req.end();
}

request.build = makeReq;
module.exports = request;
