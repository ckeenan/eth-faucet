var config = require('./config');
var express = require('express');
var redisClient = require('redis').createClient();
var web3 = require('web3');
var bodyParser = require('body-parser');
var log4js = require('log4js');
var app = express();

var limitExpire = 1000 * 60 * 60;

Object.keys(config).forEach(function(key) {
  if (key.toUpperCase() in process.env) {
    var newVal = process.env[key.toUpperCase()];
    console.log('overwriting ' + key + ': ' + config[key] + ' with ' + newVal);
    config[key] = newVal;
  } else console.log(key + ': ' + config[key]);
});

web3.setProvider(new web3.providers.HttpProvider('http://' + config.rpcaddr + ':' + config.rpcport));

log4js.configure({
  appenders: [
    {type: 'console'},
    {type: 'file', filename: config.logfile, maxLogSize: 20480}
  ]
});
var logger = log4js.getLogger();

function getParams(req) {
  return req.method === 'GET' ? req.query : req.body;
}

var debugLogs = function(req, res, next) {
  logger.debug(req.url, JSON.stringify(getParams(req)), req.connection.remoteAddress);
  next();
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(debugLogs);
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.listen(config.port);

var limiter = require('express-limiter')(app, redisClient);

limiter({
  path: '/faucet',
  method: 'post',
  lookup: 'body.address',
  total: config.maxPerHr,
  expire: limitExpire
});

function faucetRequest(req, res) {
  var params = getParams(req);
  var addr = params.address || '';
  if (!addr || !addr.length || !web3.isAddress(addr)) return res.send('invalid address');
  var amount = Number(params.amount) || 0;
  var amount = Math.min(amount, config.max);

  var percent = config.percent >= 1 ? 0.99 : config.percent;

  web3.eth.getBalance(web3.eth.coinbase, function(err, balance) {
    var sendAmount = web3.toBigNumber(Math.min(config.max, balance * percent));
    if (amount > 0 && amount < sendAmount) sendAmount = web3.toBigNumber(amount);

    logger.info(web3.fromWei(balance, 'ether').toString(), '=>', web3.fromWei(sendAmount, 'ether').toString(), '=>', addr, '(' + web3.fromWei(web3.eth.getBalance(addr), 'ether') + ')');

    web3.eth.sendTransaction({
      from: web3.eth.coinbase,
      to: addr,
      value: sendAmount.floor()
    }, function(err, hash) {
      if (err) hash = err;
      res.send(hash);
    });
  });
}


app.get('/faucet', faucetRequest);
app.post('/faucet', faucetRequest);
