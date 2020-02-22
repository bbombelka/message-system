const ServiceHelper = require('../service-helper');
const serviceEventEmitter = require('../event-emitter');

serviceEventEmitter.on('unread:message:number:change', (num, threadRef) => {
  RengetthrsHelper.adjustUnreadMessagesNumberInThread(num, threadRef);
});

serviceEventEmitter.on('total:message:number:change', (num, threadRef) => {
  RengetthrsHelper.adjustTotalMessageNumberInThread(num, threadRef);
});
class RengetthrsHelper {
  static processRequest(params) {
    const dbData = ServiceHelper.getDbData('threads');
    const numberOfThreadsOnServer = dbData.length;
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

  static adjustUnreadMessagesNumberInThread(unreadMessagesNumber, threadRef) {
    const threadsDatabase = ServiceHelper.getDbData('threads');
    const thread = threadsDatabase.filter(thread => thread.ref === threadRef)[0];
    thread.unreadmess = unreadMessagesNumber;

    if (!unreadMessagesNumber) {
      thread.read = 'T';
    }
    ServiceHelper.saveDbData(threadsDatabase, 'threads');
  }

  static adjustTotalMessageNumberInThread(num, threadRef) {
    const threadsDatabase = ServiceHelper.getDbData('threads');
    const thread = threadsDatabase.filter(thread => thread.ref === threadRef)[0];
    thread.nummess = num;
    ServiceHelper.saveDbData(threadsDatabase, 'threads');
  }
}

module.exports = RengetthrsHelper;
