const threadsDatabase = require('../../threads');
const fs = require('fs');
const path = require('path');

class RengetthrsHelper {
  static processRequest(params) {
    const numberOfThreadsOnServer = threadsDatabase.length;
    const numberOfThreadsToSend = params.numrec;
    const numberOfThreadsToIgnore = params.skip;
    if (
      numberOfThreadsToSend > numberOfThreadsOnServer ||
      numberOfThreadsToIgnore > numberOfThreadsOnServer
    ) {
      return 'Parameter is not correct';
    }
    const threadsPayload = this.selectPayload(numberOfThreadsToSend, numberOfThreadsToIgnore);
    return { threads: threadsPayload, total: numberOfThreadsOnServer };
  }

  static selectPayload(numberOfThreadsToSend, numberOfThreadsToIgnore) {
    const startIndex = parseInt(numberOfThreadsToIgnore);
    const endIndex = startIndex + parseInt(numberOfThreadsToSend);
    const threadDb = RengetthrsHelper.getDbData();

    return threadDb.slice(startIndex, endIndex);
  }

  static getDbData() {
    const filePath = path.join(__dirname, '..', '..', 'database', 'threads.json');
    return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }));
  }
}

module.exports = RengetthrsHelper;
