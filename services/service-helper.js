const fs = require('fs');
const path = require('path');
const bool = require('../enums/boolean');
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

  static hashRef(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  static itemIsThread(type) {
    return type === 'T';
  }

  static isDatabaseError({ type }) {
    return type === 'db';
  }

  static messageIsReply(reply) {
    return reply === bool.TRUE;
  }
}

module.exports = ServiceHelper;
