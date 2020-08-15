module.exports = {
  redis: {
    host: 'r-2ze9b3ba66282224pd.redis.rds.aliyuncs.com',
    port: '6379',
    pass: 'Token2Info4Redis2'
  },
  webSocket: {
    port: 9875,
    reConnectGap: 30 * 1000
  },
  errorMap: {
    msgIdEmpty: {
      code: '',
      message: 'content.messageId is empty'
    },
    receiverEmpty: {
      code: '',
      message: 'receiver is empty'
    },
    method: {
      code: '',
      message: 'method is invalid'
    },

  }
}