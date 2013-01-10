var url = require('url');

var express = require('express');
var debug = require('debug');
var log = debug('wx');

var _ = require('underscore')._

//在真实环境中使用时请使用 var webot = require('weixin-robot');
var webot = require('../');
var Robot = require('../lib/robot3').Robot;
robot = new Robot()

//用文本匹配
robot.route({
  name: 'help', 
  description: 'pattern可以用字符串匹配,试着发送「help」',
  pattern: 'help',
  //指定如何回复
  handler: function(info, action, next) {
    var i = 1;
    var reply = _.chain(robot.get()).map(function(action){
      return (i++) + ') ' + (action.description||action.name)
    }).join('\n').value()
    next(null, '可用的指令:\n'+ reply);
  }
});

//用正则式匹配
robot.route({
  name: 'say_hi', 
  description: 'pattern可以用正则表达式匹配,试着发送「hi」',
  pattern: /^Hi/i,
  handler: function(info) {
    //回复的另一种方式
    return '你也好哈';
  }
});

//可以用函数匹配
robot.route({
  name: 'pattern_fn',
  description: 'pattern可以用函数匹配,试着发送「who」',
  pattern: function(info){
    return info.text == 'who'
  },
  handler: function(info, action, next){
    next(null, '我是猪...');
  }
});

//与waiter联动,等待下一次回复,试着发送 「 sex? 」 然后再回复girl或boy或both或其他
robot.route({
  name: 'ask_sex',
  description: '与waiter联动,等待下一次回复,试着发送 「 sex? 」 然后再回复girl或boy或both或其他',
  pattern: 'sex?',
  handler: 'you guess',
  //下次回复动作,object格式,key为pattern,value为handler
  replies: {
    '/^g(irl)?\\??$/i': '猜错',
    'boy': function(info, action, next){
      return next(null, '猜对了')
    },
    'both': '对你无语...'
  }
  
  //也可以是直接的函数,同action: function(info, action, [cb]) 
  // replies: function(info, action){
  //   return 'haha, I wont tell you'
  // }

  //也可以是数组格式,每个元素为一个action
  // replies: [{
  //   pattern: '/^g(irl)?\\??$/i',
  //   handler: '猜错'
  // },{
  //   pattern: '/^b(oy)?\\??$/i',
  //   handler: '猜对了'
  // },{
  //   pattern: 'both',
  //   handler: '对你无语...'
  // }]
});

//与waiter联动,等待下一次回复,试着发送 key nde 然后再回复Y或其他
robot.route({
  name: 'suggest_keyword',
  description: '与waiter联动,等待下一次回复,试着发送「key nde」  然后再回复Y或其他',
  pattern: /^(key)\s*(.+)/i,
  handler: function(info, action, next){
    //pattern的解析结果将放在query里
    var q = info.query[2];
    if(q == 'nde'){
      robot.wait(info.from,{
        name: 'try_waiter_suggest',
        data: q,
        handler: function(next_info, current_action, next_handler){
          if(next_info.text.match(/y/i)){
            next_handler(null, '输入变更为: node');
          }else{
            next_handler(null, '仍然输入:'+ current_action.data);
          }
        }
      });
      //返回下一步动作提示
      var tip = '你输入了:' + q + '，似乎拼写错误。要我帮你更改为「node」吗?';
      return next(null, tip)
    }
  }
});

//另一种与waiter联动的方式
//试着发送 s 500 然后再回复Y或n或bye或quit
robot.route({
  name: 'search', 
  pattern: /^(搜索?|search|s\b)\s*(.+)/i,
  handler: function(info, next){
    //pattern的解析结果将放在query里
    var q = info.query[2];
    var do_search = require('./support/search');

    //与waiter联动,等待下一次回复,试着发送 s 500 然后再回复Y
    var thesaurus = {
       '500': '伍佰'
    };
    if (q in thesaurus) {
      robot.wait(info.from,{
        name: 'try_another_waiter',
        replies: {
          //key支持正则式
          '/^y$/i': function(next_info, next_handler){
            log('search: %s', thesaurus[q])
            do_search({ q: thesaurus[q] }, function(err, reply){
              return next_handler(null, reply);
            });
          },
          '/^n$/i': function(next_info, next_handler){
            log('search: %s', q)
            do_search({ q: q }, function(err, reply){
              return next_handler(null, reply);
            });
          },
          //key也支持纯文字,handler也可以没有callback,直接返回.
          'bye': function(next_info){
            return 'see you'
          },
          //function也支持为纯文字,直接返回
          'quit': 'ok, quit'
        }
      })
      //返回下一步动作提示
      var tip = '你尝试搜索' + q + '，但其实搜「伍佰」得到的信息会更有用一点。要我帮你搜索「伍佰」吗?';
      return next(null, tip)
    }else{
      log('seraching: ',q)
      // 从某个地方搜索到数据...
      return do_search({ q: q }, next);
    }
  }
});


// 你在微信公众平台填写的 token
var WX_TOKEN = 'keyboardcat123';

// 启动服务
var app = express();
app.enable('trust proxy');

// 检查请求权限的 middleware
var checkSig = webot.checkSig(WX_TOKEN);

app.get('/', checkSig);

// 必须为 POST 请求添加 bodyParser
// parser 目前可以指定的选项有：
// {
//   'keepBlank': false // 是否保留消息头尾的空白字符，默认为 undefined
// }
app.post('/', checkSig, webot.bodyParser(), function(req, res, next) {
  var info = req.wx_data;
  
  log('got req msg:', info);

  //机器人根据请求提供回复
  //具体回复规则由 robot.route() 和 robot.wait() 定义
  robot.reply(info, function(err, ret) {
    log('got reply msg: %s, %s', err, ret);
    if(ret){
      if (ret instanceof Array) {
        // 在 app 层决定如何处理 robot 返回的内容
        // 如果 info.items 为一个数组，则发送图文消息
        // 否则按 info.reply 发送文字消息
        info.items = ret;
      } else if (typeof ret == 'string') {
        log('xx',ret)
        info.reply = ret;
      }
    }else{
      info.reply = err;
    }
    //返回消息,必须是XML
    res.type('xml');
    res.send(webot.makeMessage(info));
  });
});

// 图文列表的属性对应关系
// 有时候你返回给 webot.makeMessage 的 info.items 列表，
// 里面的对象并不使用标准键值，然后又不想自己用 map 处理
webot.set('article props', {
  'pic': 'image',
  'url': 'uri',
  'desc': 'description',
});


var port = process.env.PORT || 3000;
var hostname = '127.0.0.1';

// 微信后台只允许 80 端口，你可能需要自己做一层 proxy
app.listen(port, hostname, function() {
  log('listening on ', hostname, port);
});
