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
}

module.exports = LoggerHelper;
