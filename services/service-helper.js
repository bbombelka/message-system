const fs = require('fs');
const path = require('path');
class ServiceHelper {
  static formatResponse(data) {
    return { status: 'OK', data };
  }

  static formatErrorResponse(msg) {
    return { status: 'ERROR', msg };
  }

  static getDbFilePath(dbType) {
    return path.join(__dirname, '..', 'database', `${dbType}.json`);
  }

  static getDbData(dbType) {
    return JSON.parse(fs.readFileSync(this.getDbFilePath(dbType), { encoding: 'utf8', flag: 'r' }));
  }

  static saveDbData(data, dbType) {
    fs.writeFile(this.getDbFilePath(dbType), JSON.stringify(data), err => {
      if (err) throw err;
    });
  }
}

module.exports = ServiceHelper;
