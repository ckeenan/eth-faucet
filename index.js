var config = require('./config');
var express = require('express');
var redisClient = require('redis').createClient();
var web3 = require('web3');
var bodyParser = require('body-parser');
var app = express();

var limitExpire = 1000 * 60 * 60;

web3.setProvider(new web3.providers.HttpProvider('http://' + config.rpcaddr + ':' + config.rpcport));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.listen(config.port);

var limiter = require('express-limiter')(app, redisClient);

var sendEth = function(req, res, cb) {
  var addr = req.body.address || '';
  if (!addr || !addr.length) return res.send(0);
  var amount = Number(req.body.amount) || 0;

  var percent = config.percent >= 1 ? 0.99 : config.percent;

  web3.eth.getBalance(web3.eth.coinbase, function(err, balance) {
    var sendAmount = web3.toBigNumber(balance * percent).floor();
    if (amount > 0 && amount < sendAmount) sendAmount = web3.toBigNumber(amount).floor();

    web3.eth.sendTransaction({
      from: web3.eth.coinbase,
      to: addr,
      value: sendAmount
    }, function() {
      cb(sendAmount.toString(), res);
    });
  });
};

limiter({
  path: '/faucet',
  method: 'post',
  lookup: 'body.address',
  total: config.maxPerHr,
  expire: limitExpire
});

app.post('/faucet', sendEth, function(sent, res) {
  res.send(sent);
});

app.post('/balance', function(req, res) {
  web3.eth.getBalance(req.body.address, function(err, balance) {
    res.send(balance.toString());
  });
});
