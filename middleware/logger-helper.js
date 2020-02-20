const DateEnum = require('../enums/date');
const config = require('../config');
class LoggerHelper {
  static formatLog(log) {
    return '\n' + '*'.repeat(30) + '\n\t' + this.getDate() + '\n' + log;
  }
  static getDate() {
    return this.formatDate(new Date());
  }
  static formatDate(date) {
    return date
      .toISOString()
      .replace(/T|Z/g, ' ')
      .trim();
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
