var redis = require('redis')
var config = require('./lib/config.js')


// 连接数据库
let red_config = config.redis,
    RED_HOST = red_config.host,
    RED_PWD = red_config.pass,
    RED_PORT = red_config.port,
    RED_OPTS = {auth_pass: RED_PWD},
    client = redis.createClient(RED_PORT, RED_HOST, RED_OPTS)
client.on('ready', (res) => {
  console.log('redis ready')
})
client.on('end', (res) => {
  console.log('redis end')
})
client.on('error', (error) => {
  console.log('redis error', error)
})
client.on('connect', (res) => {
  console.log('redis connect')
})

// module.exports = {
//   redisClient: client
// }
module.exports = client