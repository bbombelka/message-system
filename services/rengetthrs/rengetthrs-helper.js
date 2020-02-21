const threadsDatabase = require('../../threads');
const fs = require('fs');
const path = require('path');
const serviceEventEmitter = require('../event-emitter');

serviceEventEmitter.on('unread:message:number:change', (num, threadRef) => {
  RengetthrsHelper.adjustUnreadMessagesNumberInThread(num, threadRef);
});
class RengetthrsHelper {
  static processRequest(params) {
    const dbData = this.getDbData();
    const numberOfThreadsOnServer = threadsDatabase.length;
    const numberOfThreadsToSend = params.numrec;
    const numberOfThreadsToIgnore = params.skip;
    if (
      numberOfThreadsToSend > numberOfThreadsOnServer ||
      numberOfThreadsToIgnore > numberOfThreadsOnServer
    ) {
      return 'Parameter is not correct';
    }
    const threadsPayload = this.selectPayload({
      numberOfThreadsToSend,
      numberOfThreadsToIgnore,
      threadDb: dbData,
    });
    return { threads: threadsPayload, total: numberOfThreadsOnServer };
  }

  static selectPayload({ numberOfThreadsToSend, numberOfThreadsToIgnore, threadDb }) {
    const startIndex = parseInt(numberOfThreadsToIgnore);
    const endIndex = startIndex + parseInt(numberOfThreadsToSend);

    return threadDb.slice(startIndex, endIndex);
  }

  static getDbData() {
    return JSON.parse(fs.readFileSync(this.getDbFilePath(), { encoding: 'utf8', flag: 'r' }));
  }

  static saveDbData(data) {
    fs.writeFile(this.getDbFilePath(), JSON.stringify(data), err => {
      if (err) throw err;
    });
  }

  static getDbFilePath() {
    return path.join(__dirname, '..', '..', 'database', 'threads.json');
  }

  static adjustUnreadMessagesNumberInThread(unreadMessagesNumber, threadRef) {
    const threadsDatabase = this.getDbData();
    const selectedThread = threadsDatabase.filter(thread => thread.ref === threadRef)[0];
    selectedThread.unreadmess = unreadMessagesNumber;

    if (!unreadMessagesNumber) {
      selectedThread.read = 'T';
    }
    this.saveDbData(threadsDatabase);
  }
}

module.exports = RengetthrsHelper;
