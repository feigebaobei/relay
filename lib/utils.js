const fs = require('fs')
// const Base64 = require('js-base64').Base64
// const tokenSDKServer = require('token-sdk-server')
// const tokenSDKClient = require('token-sdk-client')
// var router = express.Router()
const axios = require('axios')

const BAIDUTOKENSDKAPIKEY = 'S3H8l6XLGM1UGp4dI9otPPMV'
const BAIDUTOKENSDKSECRETKEY = 'VEhY79uE6c7rpysNMmmFvGd3tUBDRbSu'
const BAIDUTEXTAPIKEY = 'tNjV6ls0DNRaVY2VTY4GIPAm'
const BAIDUTEXTSECRETKEY = '8Fq8GQGQtRmURdV03rbz8HD8WegBMAU6'

let {didttm, idpwd} = require('../tokenSDKData/privateConfig.js')//.didttm.did
let priStr = JSON.parse(tokenSDKServer.decryptDidttm(didttm, idpwd).data).prikey

let opArrByFn = (arr, fn) => {
  if (Array.isArray(arr)) {
    return arr.reduce((r, c) => {
      r.push(fn(c))
      return r
    }, [])
  } else {
    throw new Error('pramas arr is not Array')
  }
}

let range = (number, min, max) => {
  if (typeof(number) === 'number') {
    if (number < min) {
      number = min
    } else {
      if (number > max) {
        number = max
      }
      return number
    }
  } else {
    throw new Error('pramas arr is not Array')
  }
}

let propComposeArray = (arr, prop) => {
   if (Array.isArray(arr)) {
    return arr.reduce((r, c) => {
      if (c.toString() === '[object Object]') {
        r.push(c[prop])
      } else {
        throw new Error('element of arr is not Object')
      }
      return r
    }, [])
  } else {
    throw new Error('pramas arr is not Array')
  }
}

// 生成uuid
let getUuid = () => {
  let s = []
  let hexDigits = '1234567890abcdef'
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
  }
  s[14] = '4'
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1)
  s[8] = s[13] = s[18] = s[23] = '-'
  return s.join('')
}

let didttmToMt = (did, idpwd) => {
  let data = fs.readFileSync(`uploads/private/${did}.ttm`)
  data = data.toString()
  // let [name, , ct] = data.split(':')
  // ct = Base64.decode(ct)
  // console.log('name, ct ', name, ct)
  let mt = tokenSDKServer.decryptDidttm(data, idpwd)
  // let mt = tokenSDKClient.decryptDidttm(ct, idpwd)
  return mt
}

let replaceCont = (desc, data) => {
  for (let [key, value] of Object.entries(data)) {
    let reg = `\\$${key}\\$`
    desc.replace(reg, value)
  }
  return desc
}

let obtainDidttm = (did, idpwd) => {
  let didttm = fs.readFileSync(`uploads/private/${did}.ttm`)
  didttm = didttm.toString()
  didttm = tokenSDKServer.decryptDidttm(didttm, idpwd)
  // let {mt} = didttm
  // let {prikey: priStr} = JSON.parse(mt)
  return didttm
}

let obtainPvData = (did, idpwd) => {
  // let didttm = fs.readFileSync(`uploads/private/${did}.ttm`)
  // didttm = didttm.toString()
  // didttm = tokenSDKServer.decryptDidttm(didttm, idpwd)
  // let {mt} = didttm
  let {mt} = obtainDidttm(did, idpwd)
  let {prikey: priStr} = JSON.parse(mt)
  let pvdata = fs.readFileSync(`uploads/private/${did}pvdata.txt`)
  pvdata = pvdata.toString()
  pvdata = pvdata.substr(1, pvdata.length - 2).split(', ')
  pvdata = tokenSDKServer.decryptPvData(pvdata, priStr)
  return pvdata
}

let getBaiduKeys = () => {
  return {
    tokenSdkApiKey: BAIDUTOKENSDKAPIKEY,
    tokenSdkSecretKey: BAIDUTOKENSDKSECRETKEY,
    textApiKey: BAIDUTEXTAPIKEY,
    textSecretKey: BAIDUTEXTSECRETKEY
  }
}

// 得到百度的accesstoken
let getBaiduAccessToken = (client_id = getBaiduKeys().tokenSdkApiKey, client_secret = getBaiduKeys().tokenSdkSecretKey) => {
  return axios({
    // url: 'https://aip.baidubce.com/oauth/2.0/token',
    url : 'https://aip.baidubce.com/oauth/2.0/token', //?grant_type=client_credentials&client_id=${}&client_secret=${}'
    method: 'get',
    params: {
      grant_type: 'client_credentials',
      client_id: client_id,
      client_secret: client_secret
    }
  })
}

// pic => base64
let picToBase64 = (image, fidelity = 0.92) => {
  let base64 = ''
  let img = new Image()
  img.src = image
  return new Promise((resolve) => {
    img.onload = () => {
      let canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      let ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, img.width, img.height)
      base64 = canvas.toDataURL('image/png', fidelity)
      base64 = base64.slice(base64.indexOf(';base64,') + 8)
      // console.log(base64)
      resolve(base64)
    }
  })
  // .then(response => {
  //   console.log(response)
  // }).catch(error => {
  //   console.log(error)
  // })
}

// 调用百度的公安验证接口
let publicVerify = (accessToken, base64, id, name) => {
  // console.log('publicVerify')
  return axios({
    url: `https://aip.baidubce.com/rest/2.0/face/v3/person/verify?access_token=${accessToken}`,
    method: 'post',
    data: {
      image: base64,
      image_type: 'BASE64',
      id_card_number: id,
      name: name
    }
  })
}

// 在指定的文件，清空并写入新内容
let writeFileByUser = (path, data = '') => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
  fs.writeFileSync(path, data)
}

// 签名列表中是否有指定did的签名项
let signListHasDid = (list, did) => {
  // [
  //     {
  //         "name": "李庆雪",
  //         "did": "did:ttm:u011b80743b5fa85ade3a5696eef660b2bae1ba4ba2b84938f26f024cf3fcd",
  //         "explain": "允许注册",
  //         "expire": 1596199118381
  //     }
  // ]
  return list.some(item => item.did === did)
}
// 处理pvdata.pendingTask里的证书项是否被父did签名
let opPvdataPTPdidSign = (pendingTask) => {
  let {value: list} = Object.entries(pendingTask)
  return Promise.all(list.map(item => {
    // if (pendingTask[item.businessLicenseData.claim_sn])
    if (!item.isPdidCheck && item.isPersonCheck) {
      tokenSDKServer.getCertifyFingerPrint(item.businessLicenseData.claim_sn, true).then(response => {
        
      })
    }





    return tokenSDKServer.getCertifyFingerPrint(item.businessLicenseData.claim_sn, true).then(response => {
      return response.data.result
    })
  })).then(certifis => {
    pendingTask[certifis.claim_sn].isPdidCheck = signListHasDid(certifis.sign_list, pendingTask[certifis.claim_sn].businessLicenseData.applicantSuperDid)
    return pendingTask
  })
}




// 返回的结果是：是否需要更新pvdata、pdid的任务列表
let first = (item) => {
  console.log('item', item)
  // 检查阶段
  if (item.isPersonCheck && item.isPdidCheck) {
    return Promise.resolve({status: true, payload: item})
  } else {
    if (item.isPersonCheck && !item.isPdidCheck) {
      // adid是否已经签名
      // .then()
      return tokenSDKServer.getCertifyFingerPrint(item.businessLicenseData.claim_sn, true)
        // 处理父did是否签名
        .then(response => {
          if (response.data.result) {
            let list = response.data.result.sign_list
            let templateId = response.data.result.template_id
            let hash_cont = response.data.result.hash_cont
            let exist = signListHasDid(list, item.businessLicenseData.applicantSuperDid)
            item.isPdidCheck = exist
            // return {item: item, templateId: templateId, hash_cont: hash_cont} // 让下一个then处理签发
            return {status: true, payload: {item: item, templateId: templateId, hash_cont: hash_cont}} // 让下一个then处理签发
          } else {
            // return {status: false}
            return Promise.reject({status: false, payload: new Error('请求证书指纹时失败')})
          }
        })
        .then(opRes => {
          // console.log('opRes', opRes)
          // 更新didPendingTask
          let key = '0x' + tokenSDKServer.hashKeccak256(`${item.businessLicenseData.applicantSuperDid}go to check businessLicense`)
          // console.log('key', key)
          return tokenSDKServer.pullData(key, false).then(response => {
            // console.log('response.data', response.data)
            if (response.data.result) {
              let list = response.data.result.data
              list = JSON.parse(list)
              let index = list.findIndex((ele) => {
                return ele.content === opRes.payload.item.temporaryId
              })
              // console.log('index', index)
              if (index > -1) { // 若存在则删除后再备份
                list.splice(index, 1)
                list = JSON.stringify(list)
                let type = 'bigdata'
                // console.log('list', list)
                let signData = tokenSDKServer.sign({keys: priStr, msg: `update backup file${list}for${didttm.did}with${key}type${type}`})
                let signStr = `0x${signData.r.toString('hex')}${signData.s.toString('hex')}${String(signData.v).length >= 2 ? String(signData.v) : '0'+String(signData.v)}`
                // console.log('signStr', signStr)
                return tokenSDKServer.backupData(didttm.did, key, type, list, signStr).then(response => {
                  console.log('response.data', response.data)
                  if (response.data.result) {
                    return Promise.reject(opRes)
                  } else {
                    return Promise.reject({status: false, payload: new Error('备份父did任务列表失败')})
                  }
                })
              } else { // 若不存在则不备份，直接返回opRes
                return Promise.reject(opRes)
              }
            } else {
              return Promise.reject({status: false, payload: new Error('拉取父did任务列表失败')})
            }
          })
        })
        .catch(errorObj => {
          // console.log('errorObj', errorObj)
          if (errorObj.status) {
            return errorObj
          } else {
            // console.log(errorObj)
            return errorObj
          }
        })
    } else { // 人工审核没通过
      return Promise.resolve({status: false, payload: new Error('未通过人工审核')})
    }
  }
}

// // 备份didPendingTask
// // 方法太简单了，用不上。
// let pushDidPendingTask = (did, key, type, dataCt, signStr) => {
//   return tokenSDKServer.backupData(did, key, type, dataCt, signStr).then(response => {
//     if (response.data.result) {
//       return true
//     } else {
//       return Promise.reject(new Error('备份父did任务列表失败'))
//     }
//   })
// }

let opPendingTask = (item) => {

  return first(item)
  // .then(({status, payload, templateId, hash_cont}) => {
  .then(({status, payload}) => {
    // console.log('签名阶段', status, payload)
    // return
    if (status) {
      // return Promise.reject({status: false, payload: payload})
      let item = payload.item
      if (item.isPersonCheck && item.isPdidCheck) {
        // explain, expire, signStr
        let explain = '给odid的身份证明类证书签名的固定字段'
        let expire = new Date().setFullYear(2120)
        let signObj = `claim_sn=${item.businessLicenseData.claim_sn},templateId=${payload.templateId},hashCont=${payload.hash_cont},did=${didttm.did},name=${didttm.nickname},explain=${explain},expire=${expire}`
        let signData = tokenSDKServer.sign({keys: priStr, msg: signObj})
        let signStr = `0x${signData.r.toString('hex')}${signData.s.toString('hex')}${String(signData.v).length >= 2 ? String(signData.v) : '0'+String(signData.v)}`
        return signStr
        return tokenSDKServer.signCertify(didttm.did, item.businessLicenseData.claim_sn, didttm.nickname, payload.templateId, payload.hash_cont, explain, expire, signStr).then(response => {
          // console.log('adid签名结果', response.data) // { jsonrpc: '2.0', id: 1, result: true }
          if (response.data.result) {
            return {status: true, payload: item}
          } else {
            return Promise.reject({status: false, payload: new Error('adid签名失败')})
          }
        })
      } else {
        // return {status: false}
        return Promise.reject({status: false, payload: new Error('父did没有签名')})
      }
    } else {
      // return Promise.reject({status: false, payload: new Error('父did没有签名')})
      return Promise.reject({status: false, payload: payload})
    }
  })
  .then((opRes) => {
    console.log('更新阶段 opRes', opRes)

        let key = '0x' + tokenSDKServer.hashKeccak256(`${opRes.payload.businessLicenseData.applicantSuperDid}go to check businessLicense`)
        console.log('key', key)
    // return
  // first(item).then(({status, item}) => {
    // console.log('first then', opRes)
    if (opRes.status) {
      // console.log('更新pvdata')
      // console.log('更新pdid pendingTaska')
      // 更新pvdata
      return tokenSDKServer.getPvData(didttm.did).then(response => {
        // console.log(response.data)
        if (response.data.result) {
          let pvdataCt = response.data.result.data
          let pvdata = tokenSDKServer.decryptPvData(pvdataCt, priStr)
          pvdata = JSON.parse(pvdata)
          let pendingTask = pvdata.pendingTask
          // console.log('前', pvdata.pendingTask)
          delete pendingTask[opRes.payload.businessLicenseData.claim_sn]
          // console.log('后', pvdata.pendingTask)
          pvdataCt = tokenSDKServer.encryptPvData(pvdata, priStr)
          let key = '0x' + tokenSDKServer.hashKeccak256(didttm.did)
          let type = 'pvdata'
          let signObj = `update backup file${pvdataCt}for${didttm.did}with${key}type${type}`
          let signData = tokenSDKServer.sign({keys: priStr, msg: signObj})
          let signStr = `0x${signData.r.toString('hex')}${signData.s.toString('hex')}${String(signData.v).length >= 2 ? String(signData.v) : '0'+String(signData.v)}`
          // return true
          return tokenSDKServer.backupData(didttm.did, key, type, pvdataCt, signStr).then(response => {
            // console.log(response.data) // { jsonrpc: '2.0', id: 1, result: true }
            if (response.data.result) {
              return response.data.result
            } else {
              return Promise.reject({status: false, payload: new Error('备份pvdata失败')})
            }
          })
        }
      })
      .then(bool => {
        // 更新pdid pendingTask
        // console.log('更新pdid pendingTask', bool)
        let key = '0x' + tokenSDKServer.hashKeccak256(`${opRes.payload.businessLicenseData.applicantSuperDid}go to check businessLicense`)
        // console.log('key', key)
        return tokenSDKServer.pullData(key, false).then(response => {
          // console.log(response.data)
          if (response.data.result) {
            let list = response.data.result.data
            list = JSON.parse(list)
            let index = list.findIndex((ele) => {
              return ele.content === opRes.payload.temporaryId
            })
            // console.log('index', index)
            if (index > -1) {
              list.splice(index, 1)
              // console.log('list', list)
              let type = 'bigdata'
              list = JSON.stringify(list)
              let signData = tokenSDKServer.sign({keys: priStr, msg: `update backup file${list}for${didttm.did}with${key}type${type}`})
              let signStr = `0x${signData.r.toString('hex')}${signData.s.toString('hex')}${String(signData.v).length >= 2 ? String(signData.v) : '0'+String(signData.v)}`
              // return false
              return tokenSDKServer.backupData(didttm.did, key, type, list, signStr).then(response => {
                if (response.data.result) {
                  // return response.data.result
                  // return {status: true} // status: true 表示处理成功
                  return Promise.reject({status: true})
                } else {
                  return Promise.reject({status: false, payload: new Error('备份父did任务列表失败')})
                }
              })
            } else {
              return Promise.reject({status: true})
            }
          } else {
            return Promise.reject({status: false, payload: new Error('拉取父did任务列表失败')})
          }
        })
      })
      // .catch(errorObj => {
      //   if (errorObj.status) {
      //     //
      //     return errorObj
      //   } else {
      //     //
      //     return errorObj
      //   }
      // })
    } else {
      // console.log('不更新')
      // 需要return promise
      return Promise.reject(opRes)
    }
  }).catch(errorObj => {
    // return errorObj
    // console.log('抛出阶段', errorObj)
    if (errorObj.status) {
      return errorObj
    } else {
      return errorObj
    }
  })
}






module.exports = {
  opArrByFn: opArrByFn,
  range: range,
  propComposeArray: propComposeArray,
  getUuid,
  didttmToMt,
  replaceCont,
  obtainDidttm,
  obtainPvData,
  getBaiduKeys,
  getBaiduAccessToken,
  picToBase64,
  publicVerify,
  writeFileByUser,
  signListHasDid,
  opPendingTask
}
