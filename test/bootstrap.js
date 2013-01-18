var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser();
var _ = require('underscore')._
var request = require('request')

var default_url = 'http://localhost:3000/weixin' 
var default_token = 'keyboardcat123' 

/**
 * @class Helper 
 *
 * 测试辅助
 */

/**
 * @method makeAuthQuery 组装querystring
 * @param {String} token 微信token
 */
var makeAuthQuery = function(token){
  token = token || default_token;
  var q = {
    timestamp: new Date().getTime(),
    nonce: parseInt((Math.random() * 10e10), 10)
  }
  var s = [token, q.timestamp, q.nonce].sort().join('');
  q.signature = require('crypto').createHash('sha1').update(s).digest('hex');
  return q;
}

/**
 * @method makeRequest 获取发送请求的函数
 * 
 * @param  {String}   url   服务地址,默认值为http://localhost:3000/weixin
 * @param  {Object}   token 微信token,默认值为keyboardcat123
 * @return {Function} 发送请求的回调函数,签名为function(info, cb(err, result))
 * 
 * - info {Object} 要发送的内容:
 *
 *     - sp    {String} 微信公众平台ID
 *     - user  {String} 用户ID
 *     - type  {String} 消息类型: text / location / image
 *     - text  {String} 文本消息的内容
 *     - xPos  {Number} 地理位置纬度
 *     - yPos  {Number} 地理位置经度
 *     - scale {Number} 地图缩放大小
 *     - label {String} 地理位置信息
 *     - pic   {String} 图片链接
 * 
 * - cb {Function} 回调函数
 * 
 *     - err {Error} 错误消息
 *     - result {Object} 服务器回传的结果,JSON
 *
 * - return content {String} 返回发送的XML
 */
var makeRequest = function(url, token){
  return function(info, cb){
    //默认值
    info = _.isString(info) ? {text: info} : info;
    _.defaults(info, {
      sp: 'webot',
      user: 'client',
      type: 'text',
      text: 'help',
      pic: 'http://www.baidu.com/img/baidu_sylogo1.gif',
      xPos: '23.08',
      yPos: '113.24',
      scale: '20',
      label: 'this is a location'
    })

    var content = _.template(tpl)(info);
    
    //发送请求
    request.post({
      url: url || default_url,
      qs: makeAuthQuery(token||default_token),
      body: content
    }, function(err, res, body){
      if(err || res.statusCode=='403' || !body){
        cb(err || res.statusCode, body)
      }else{
        xmlParser.parseString(body, function(err, result){
          if (err || !result || !result.xml){
            cb(err || 'result format incorrect', result);
          }else{
            var json = result.xml
            json.ToUserName = json.ToUserName && String(json.ToUserName)
            json.FromUserName = json.FromUserName && String(json.FromUserName)
            json.CreateTime = json.CreateTime && Number(json.CreateTime)
            json.FuncFlag = json.FuncFlag && Number(json.FuncFlag)
            json.MsgType = json.MsgType && String(json.MsgType)
            json.Content = json.Content && String(json.Content)
            if(json.MsgType=='news'){
              json.ArticleCount = json.ArticleCount && Number(json.ArticleCount)
              json.Articles = json.Articles && json.Articles.length>=1 && json.Articles[0]
            }
            cb(err, json);
          }
        })
      }
    });
    return content;
  }
}

/**
 * @property {String} tpl XML模版
 */
var tpl= [
  '<xml>',
    '<ToUserName><![CDATA[<%=sp%>]]></ToUserName>',
    '<FromUserName><![CDATA[<%=user%>]]></FromUserName>',
    '<CreateTime><%=(new Date().getTime())%></CreateTime>',
    '<MsgType><![CDATA[<%=type%>]]></MsgType>',
    '<% if(type=="text"){ %>',
      '<Content><![CDATA[<%=text%>]]></Content>',
    '<% }else if(type=="location"){  %>',
      '<Location_X><%=xPos%></Location_X>',
      '<Location_Y><%=yPos%></Location_Y>',
      '<Scale>{<%=scale%>}</Scale>',
      '<Label><![CDATA[<%=label%>]]></Label>',
    '<% }else if(type=="image"){  %>',
      '<PicUrl><![CDATA[<%=pic%>]]></PicUrl>',
    '<% } %>',
  '</xml>'
].join('');


module.exports = exports = {
  makeRequest: makeRequest,
  makeAuthQuery: makeAuthQuery,
  default_url: default_url,
  default_token: default_token
};
