var bootstrap = require('./bootstrap');
var should = bootstrap.should;
var makeQ = bootstrap.makeAuthQuery;
var request = bootstrap.request;
var conf = bootstrap.conf;
var messages = bootstrap.messages;

describe('Authorize', function() {
  describe('GET', function(){
    var q = makeQ();
    q.echostr = 'abc';
    it('should pass good', function(done) {
      request('/', q, function(err, ret) {
        should.not.exist(err);
        should.exist(ret) && ret.should.equal(q.echostr);
        done();
      });
    });
    it('should block bad', function(done) {
      q.timestamp = '';
      request('/', q, function(err, ret) {
        should.exist(err) && err.should.be(403);
        should.not.exist(ret);
        done();
      });
    });
  });
  describe('POST', function(){
    it('should block bad', function(done) {
      request('/', function(err, ret) {
        should.exist(err) && err.should.be(403);
        should.not.exist(ret);
        done();
      });
    });
  });
});
