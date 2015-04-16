## eth-faucet
Offer some ether for POST requests

####Prerequisites

* Redis
* An Ethereum client with RPC enabled (geth, eth, etc)
* Node

####Installation
1. clone repository
2. `npm install`
3. start ethereum client, set rpcport and rpcaddr in config.json
4. `redis-server &`
5. `node index.js`

####Get ether
Receive a percentage of available funds

`curl -X POST -d 'address=<recipient>' http://host:port/faucet`

Or request a specific amount

`curl -X POST -d 'address=<recipient>&amount=<amount>' http://host:port/faucet`