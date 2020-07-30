var express = require('express');
var router = express.Router();
// var utils = require('../lib/utils.js')
var cors = require('./cors')
const redisClient = require('../redisClient.js')
const wss = require('../webSocket.js')

router.route('/redis')
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200)
  })
  .get(cors.corsWithOptions, (req, res, next) =>{
    let {key} = req.query
    // redisClient.get(key, (err, resObj) => {
    //   let len = redisClient.llen(key)
    // console.log('LLEN key', len)
    redisClient.lrange(key, 0, -1, (err, resObj) => {
      if (err) {
        res.status(500).json({
          result: false,
          message: '',
          error: err
        })
      } else {
        res.status(200).json({
          result: true,
          message: '',
          data: resObj
        })
      }
    })
  })
  .post(cors.corsWithOptions, (req, res, next) => {
    let {key, value} = req.body
    // console
    // redisClient.set(key, value, (err, resObj) => {
    redisClient.lpush(key, value, (err, resObj) => {
      if (err) {
        res.status(500).json({
          result: false,
          message: '',
          error: err
        })
      } else {
        res.status(200).json({
          result: true,
          message: '',
          data: resObj
        })
      }
    })
  })
  .put(cors.corsWithOptions, (req, res, next) => {
    res.send('put')
  })
  .delete(cors.corsWithOptions, (req, res, next) => {
    // 删除消息list中的指定下标的元素
    let delMsgIndex = (key, index) => {
      // return new Promise((resolve, reject) => {
      //   redisClient.lset(key, index, '$$value$$', (err, resObj) => {
      //     if (err) {
      //       reject(err)
      //     } else {
      //       redisClient.lrem(key, 0, '$$value$$', (err, resObj) => {
      //         err ? reject(err) : resolve(resObj)
      //       })
      //     }
      //   })
      // })
      // LINDEX key index
      return new Promise((resolve, reject) => {
        redisClient.lindex(key, index, (err, resObj) => {
          if (err) {
            reject(err)
          } else {
            console.log('resObj', resObj)
            redisClient.lrem(key, 0, resObj, (err, resObj) => {
              err ? reject(err) : resolve(resObj)
            })
          }
        })
      })
    }
    // res.send('delete')
    let {key} = req.body
    console.log(key)
    redisClient.del(key, (err, resObj) => {
      res.status(200).json({
        result: true,
        message: '',
        data: resObj
      })
    })
    // delMsgIndex(key, 0).then(response => {
    //   res.status(200).json({
    //     result: true,
    //     message: '',
    //     data: response
    //   })
    // }).catch(error => {
    //   res.status(200).json({
    //     result: true,
    //     message: '',
    //     data: error
    //   })
    // })
   })

// 父did的任务列表
router.route('/websocketClient')
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200)
  })
  .get(cors.corsWithOptions, (req, res, next) =>{
    res.status(200).json({
      result: true,
      message: '',
      // data: wss.clients
      data:{wss: wss, clients: wss.clients}
    })
  })
  .post(cors.corsWithOptions, (req, res, next) => {
    let {key, value} = req.body
    // console
    // redisClient.set(key, value, (err, resObj) => {
    redisClient.lpush(key, value, (err, resObj) => {
      if (err) {
        res.status(500).json({
          result: false,
          message: '',
          error: err
        })
      } else {
        res.status(200).json({
          result: true,
          message: '',
          // data: {wss: wss,resObj: resObj}
          data: resObj
        })
      }
    })
  })
  .put(cors.corsWithOptions, (req, res, next) => {
    res.send('put')
  })
  .delete(cors.corsWithOptions, (req, res, next) => {
    // 删除消息list中的指定下标的元素
    // res.send('delete')
    let {key} = req.body
    console.log(key)
    redisClient.del(key, (err, resObj) => {
      res.status(200).json({
        result: true,
        message: '',
        data: resObj
      })
    })
    // delMsgIndex(key, 0).then(response => {
    //   res.status(200).json({
    //     result: true,
    //     message: '',
    //     data: response
    //   })
    // }).catch(error => {
    //   res.status(200).json({
    //     result: true,
    //     message: '',
    //     data: error
    //   })
    // })
   })


module.exports = router;
