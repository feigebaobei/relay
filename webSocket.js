// var express = require('express');
// var utils = require('./lib/utils.js')
// var tokenSDKServer = require('token-sdk-server')
var config = require('./lib/config')
const redisClient = require('./redisClient.js')
// const http = require('http')
// const WebSocket = require('ws')
// const server = http.createServer()
// const wss2 = new WebSocket.Server({noServer: true})
const ws = require('ws')

const WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({
    port: config.webSocket.port
  })
  // ,
  // wss2 = new WebSocketServer({
  //   noServer: true
  // })

// 广播
wss.broadcast = (data) => {
  wss.clients.forEach(client => {
    client.send(data)
  })
}
// 创建消息
let createMessage = (content = '', receiver = [], method = 'message', messageId = [], createTime = new Date().getTime()) => {
  return JSON.stringify({
    method: method,
    content: content,
    messageId: messageId,
    createTime: createTime,
    receiver: receiver
  })
}
// 根据dids获取在线的客户端
let onlineClientByDid = (dids) => {
  dids = [...new Set(dids)]
  let clients = [...wss.clients]
  let onlineClient = clients.filter(item => dids.some(subItem => subItem === item.did))
  return onlineClient
}
// 完善消息
let completeMsg = (infoObj, obj) => Object.assign({}, infoObj, obj)
// 保持同一did只有一个client
let onlyOneOnline = (did, wss, ws) => {
  ws.did = did
  let clients = [...wss.clients]
  let sameDid = clients.filter(item => {
    return item.did === did
  })
  if (sameDid.length > 1) {
    sameDid[0].send('相同did不能多点登录')
    sameDid[0].close()
  } else {
    // 无操作
  }
}
// 在消息列表末尾追加消息
let rpushMsgList = (key, value) => {
  return new Promise((resolve, reject) => {
    redisClient.rpush(key, value, (err, resObj) => {
      err ? reject(err) : resolve(resObj)
    })
  })
}
// 压入消息
let pressInMsg = (dids, msg) => {
  dids = [...new Set(dids)]
  let clients = [...wss.clients]
  let pArr = dids.reduce((resObj, item) => {
    resObj.push(rpushMsgList(item, msg))
    return resObj
  }, [])
  return Promise.all(pArr)
}
// 从redis里取出消息列表
let getMsgList = (key) => {
  // console.log('key', key)
  return new Promise((resolve, reject) => {
    redisClient.lrange(key, 0, -1, (err, resObj) => {
      err ? reject(err) : resolve(resObj)
    })
  })
}
/**
 * 弹出消息
 * @param  {array} dids [接收者did组成的数组]
 * @return {[type]}      [description]
 */
let popUpMsg = (dids) => {
  // dids去重
  dids = [...new Set(dids)]
  let clients = [...wss.clients]
  let onlineClient = clients.filter(item => dids.some(subItem => subItem === item.did))
  // 为每一个在线在did发送消息
  onlineClient.map(item => {
    getMsgList(item.did).then(response => {
      // 若key存在则返回key对应的value。value是数组。
      // 若key不存在则返回[]。
      // 即response总是数组。
      // console.log('发出的消息 response', response)
      let arr = response.reduce((resObj, cur, index) => {
        cur = JSON.parse(cur)
        // cur.messageId = index
        // cur.messageIndex = index
        resObj.push(cur)
        return resObj
      }, [])
      item.send(JSON.stringify(arr))
    }).catch(error => {
      item.send(JSON.stringify(error))
    })
  })
}
// 为指定did逐条发送消息
let popUpMsgOneByOne = (dids) => {
  let onlineClient = onlineClientByDid(dids)
  onlineClient.map(client => {
    getMsgList(client.did).then(msgList => {
      msgList.reduce((resObj, cur, index) => {
        cur = JSON.parse(cur)
        delete cur.receiver
        resObj.push(cur)
        return resObj
      }, []).map(msg => {
        console.log('msg', msg)
        client.send(JSON.stringify(msg))
        if (msg.method === 'receipt') {
          delMsg(client.did, [msg.messageId])
        }
      })
    }).catch(error => {
      client.send(createMessage('获取消息队列时出错', [], 'error'))
    })
  })
}
// 删除消息list中的指定下标的元素
let delMsgIndex = (key, index) => {
  return new Promise((resolve, reject) => {
    redisClient.lindex(key, index, (err, resObj) => {
      if (err) {
        reject(err)
      } else {
        redisClient.lrem(key, index, resObj, (err, resObj) => {
          err ? reject(err) : resolve(resObj)
        })
      }
    })
  })
}
// 删除key
// let delKey = (key) => {
//   return new Promise((resolve, reject) => {
//     redisClient.del(key, (err, resObj) => {
//       err ? reject(err) : resolve(resObj)
//     })
//   })
// }
// // 删除消息
// let delMsg = (key, msgIds) => {
//   msgIds = [...new Set(msgIds)]
//   // 根据messageId获取messageIndex
//   // let msgIndex = msgIds.reduce((res, item) => {
//   //   redisClient.
//   //   res.push()
//   //   return res
//   // }, [])
//   // redisClient.
//   getMsgList(key).
//   // console.log('删除消息', key, msgIds)
//   if (msgIds.length) {
//     let clients = [...wss.clients]
//     let pArr = msgIds.reduce((resObj, item) => {
//       resObj.push(delMsgIndex(key, item))
//       return resObj
//     }, [])
//     return Promise.all(pArr)
//     // .then((response) => {
//     //   console.log('response1',  response)
//     //   return getMsgList(key)
//     //   .then(response => {
//     //     console.log('response2', response)
//     //     if (!response.length) {
//     //       return delKey(key)
//     //     }
//     //   })
//     // })
//     // .catch(error => {
//     //   return error
//     // })
//   } else {
//     // 无操作
//   }
// }
// 删除消息
let delMsg = (key, msgIds) => {
  msgIds = [...new Set(msgIds)]
  // 根据messageId获取messageIndex
  // let msgIndex = msgIds.reduce((res, item) => {
  //   redisClient.
  //   res.push()
  //   return res
  // }, [])
  // redisClient.
  if (!msgIds.length) {
    return
  }
  // console.log('delMsg key', key)
  getMsgList(key).then(response => {
    // console.log('response', response)
    let list = response.reduce((res, cur) => {
      cur = JSON.parse(cur)
      res.push(cur)
      return res
    }, [])
    let msgIndexes = list.filter(item => msgIds.some(subItem => subItem === item.messageId)).reduce((res, cur) => {
      res.push(cur.messageId)
      return res
    }, [])
    return msgIndexes
  })
  .then(msgIndexes => {
    // console.log('msgIndexes', msgIndexes)
    let pArr = msgIndexes.reduce((res, cur) => {
      res.push(delMsgIndex(key, cur))
      return res
    }, [])
    return Promise.all(pArr)
  })
  // .catch(error => {
  //   console.log(error)
  //   return error
  // })
}

wss.on('connection', (ws, req) => {
  // 参数ws是一个websocket的实例
  // 得到did
  let index = req.url.indexOf('did:ttm:')
  let did = req.url.slice(index, index + 70)
  // 检查did是否正确
  if (did.length != 70) {
    // ws.send('did不正确')
    // ws.close()
    ws.close('4001', 'did不正确')
  }
  // 保持同一did只有一个client
  onlyOneOnline(did, wss, ws)
  // 发送消息队列
  // popUpMsg([ws.did])
  popUpMsgOneByOne([ws.did])
  ws.on('message', (message) => {
    let infoObj = JSON.parse(message)
    // let infoObj = message
    // console.log('infoObj', infoObj)
    switch (infoObj.method) {
      case 'confirm':
      case 'verification':
        if (!infoObj.receiver.length) {
          ws.send('receiver is empty')
        } else {
          // infoObj.sender = ws.did
          // 完善消息
          infoObj = completeMsg(infoObj, {sender: ws.did})
          // console.log('infoObj', infoObj)
          pressInMsg(infoObj.receiver, JSON.stringify(infoObj))
          // .then(response => {
          //   console.log('response', response)
          //   // ws.send(JSON.stringify(response))
          // }).catch(error => {
          //   console.log('error', error)
          //   // ws.send(error)
          // })
          .then(() => {
            // popUpMsg(infoObj.receiver)
            popUpMsgOneByOne(infoObj.receiver)
          })
        }
        break
      case 'ping':
        ws.send(createMessage('', [], 'pong'))
        break
      case 'receipt':
        let msgIds = infoObj.content.messageId
        if (!msgIds) {
          ws.send('content.messageId is empty')
        }
        msgIds = [msgIds]
        if (!infoObj.receiver.length) {
          ws.send('receiver is empty')
        } else {
          delMsg(ws.did, msgIds)
          infoObj = completeMsg(infoObj, {sender: ws.did})
          // console.log('infoObj', infoObj)
          pressInMsg(infoObj.receiver, JSON.stringify(infoObj)).then(() => {
            popUpMsgOneByOne(infoObj.receiver)
          })
        }
        break
      case 'unread':
        // 暂时无操作
        break
      case 'leave':
        break
      case 'system':
        ws.send(createMessage(''))
        break
      case 'close':
        ws.close('4001', 'client request close.')
        break
      case 'pong':
      default:
        ws.send('method is error.')
        break
    }
  })
})


// let websocket = new ws('ws://www.lixiaodan.org:9875')
// console.log('websocket', websocket)