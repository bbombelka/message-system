const ServiceHelper = require('../service-helper');
const serviceEventEmitter = require('../event-emitter');

class DeleteItemHelper {
  static processRequest({ ref }) {
    switch (ref.length) {
      case 44:
        return this.deleteThread(ref);
      case 64:
        return this.deleteMessage(ref);
      default:
        return this.handleIncorrectRef();
    }
  }

  static deleteThread(ref, options) {
    const threadsDb = ServiceHelper.getDbData('threads');
    const threadIndex = threadsDb.findIndex(thread => thread.ref === ref);
    if (threadIndex === -1) return this.handleIncorrectRef();
    threadsDb.splice(threadIndex, 1);
    ServiceHelper.saveDbData(threadsDb, 'threads');
    if (!(options && options.messagesWereDeleted)) {
      this.deleteAllMessages(ref);
    }
    return { thrsTot: threadsDb.length, ref };
  }

  static deleteAllMessages(ref) {
    const messagesDb = ServiceHelper.getDbData('messages');
    const messageObjIndex = messagesDb.findIndex(messObj => messObj.ref === ref);
    if (messageObjIndex === -1) return this.handleIncorrectRef();
    messagesDb.splice(messageObjIndex, 1);
    ServiceHelper.saveDbData(messagesDb, 'messages');
  }

  static deleteMessage(ref) {
    const messageDb = ServiceHelper.getDbData('messages');
    const indexes = this.getThreadAndMessageIndexes(ref, messageDb);

    if (!Object.keys(indexes).length) {
      return this.handleIncorrectRef();
    }

    messageDb[indexes.thread].msgs.splice(indexes.message, 1);
    const numOfMess = messageDb[indexes.thread].msgs.length;

    if (!numOfMess) {
      return this.handleDeletionOfLastMessage(messageDb, indexes.thread);
    }

    messageDb[indexes.thread].tot = numOfMess;
    ServiceHelper.saveDbData(messageDb, 'messages');
    serviceEventEmitter.emit(
      'total:message:number:change',
      numOfMess,
      messageDb[indexes.thread].ref,
    );
    return { msgTot: numOfMess, ref };
  }

  static getThreadAndMessageIndexes(ref, messageDb) {
    const indexes = {};

    for (let i = 0; i < messageDb.length; i++) {
      const messageIndex = messageDb[i].msgs.findIndex(message => message.ref === ref);
      if (messageIndex !== -1) {
        indexes.message = messageIndex;
        indexes.thread = i;
        break;
      }
    }
    return indexes;
  }

  static handleDeletionOfLastMessage(messageDb, threadId) {
    const threadRef = messageDb[threadId].ref;
    messageDb.splice(threadId, 1);
    ServiceHelper.saveDbData(messageDb, 'messages');
    return this.deleteThread(threadRef, { messagesWereDeleted: true });
  }

  static handleIncorrectRef() {
    return 'Invalid ref';
  }
}

module.exports = DeleteItemHelper;