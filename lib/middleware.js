var crypto = require('crypto');

var parser = require('./parser');

var middlewares = {};

middlewares.checkSig = function(wx_token) {
  return function checkSig(req, res, next) {
    var sig = req.query.signature;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    var s = [wx_token, timestamp, nonce].sort().join('');
    var shasum = crypto.createHash('sha1');
    shasum.update(s);
    var dig = shasum.digest('hex');
    if (dig == sig) {
      if (req.method == 'GET') {
        return res.send(req.query.echostr);
      } else {
        return next();
      }
    }
    return blockReq(res);
  };
};
middlewares.bodyParser = function(opts) {
  return function(req, res, next) {
    var b = '';
    req.setEncoding('utf-8');
    req.on('data', function(data) {
      b += data;
    });
    req.on('end', function() {
      req.wx_data = parser(b, opts);
      next();
    });
  };
}

function blockReq(res) {
  res.statusCode = 403;
  return res.json({ 'r': 403, 'msg': 'Where is your key?' });
}

module.exports = middlewares;
