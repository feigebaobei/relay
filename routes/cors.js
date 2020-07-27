var cors = require('cors')

// var whiteList = [
//   'http://localhost:3000',
//   'https://localhost:3443',
//   'https://localhost:8080',
//   'http://localhost:8080',
//   'http://mockvue.feigebaobei.now.sh',
//   'https://mockvue.feigebaobei.now.sh',
//   'http://mockvue.now.sh',
//   'https://mockvue.now.sh',
//   'http://mockvue-git-master.feigebaobei.now.sh',
//   'https://mockvue-git-master.feigebaobei.now.sh'
// ]
var corsOptionDelegate = (req, cb) => {
  var corsOptions
  // console.log('req.header', req.header)
  // if (whiteList.indexOf(req.header('Origin')) !== -1 || !origin) {
    corsOptions = {
      origin: true,
      optionsSuccessStatus: 200,
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      allowdHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Type', 'X-Content-Range']
    }
  // } else {
  //   corsOptions = {origin: false}
  // }
  cb(null, corsOptions)
}

module.exports = {
  cors: cors(),
  corsWithOptions: cors(corsOptionDelegate)
}