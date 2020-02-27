const DateEnum = require('../enums/date');
const config = require('../config');
const DateHelper = require('../helpers/date-helper');
class LoggerHelper {
  static formatLog(log) {
    return '\n' + '*'.repeat(30) + '\n\t' + DateHelper.getDate() + '\n' + log;
  }

  static getLogFileData({ body, headers, method }, { statusCode }) {
    return `
    REQUEST:
    body: ${JSON.stringify(body)} user-agent: ${headers['user-agent']} method: ${method}
    RESPONSE: 
    status code:${statusCode}`;
  }
  static getLogDeletionLimit() {
    const currentDayStart = Date.parse(new Date().toDateString());
    return currentDayStart - config.logStorageTimeInDays * DateEnum.DAY;
  }

  static logIsBeyondStorageTime(birthTime) {
    return this.getLogDeletionLimit() > birthTime;
  }
}

module.exports = LoggerHelper;
