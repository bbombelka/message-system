const serviceEventEmitter = require('../event-emitter');
const ServiceHelper = require('../service-helper');

class RengetthrsmsgsHelper {
  static processRequest({ ref, numrec, skip }) {
    const parentThreadMessages = this.getMessagesFromParentThread(ref.trim());
    const numberOfMessagesOnServer = parentThreadMessages.length;
    const numberOfMessagesToSend = numrec;
    const numberOfMessagesToIgnore = skip;

    if (
      numberOfMessagesToSend > numberOfMessagesOnServer || // to moze przeniesc do glownego service helpera
      numberOfMessagesToIgnore > numberOfMessagesOnServer
    ) {
      return 'Parameter is not correct';
    }

    const selectParams = this.getParamsForSelectingPayload(
      numberOfMessagesToSend,
      numberOfMessagesToIgnore,
    );
    const messagesToSend = this.selectMessagesToSend(parentThreadMessages, selectParams);
    this.markAsRead(ref, this.getSelectedMessagesRefs(messagesToSend));
    return {
      messages: messagesToSend,
      total: numberOfMessagesOnServer,
    };
  }

  static getParamsForSelectingPayload(numberOfMessagesToSend, numberOfMessagesToIgnore) {
    const startIndex = parseInt(numberOfMessagesToIgnore, 10);
    const endIndex = startIndex + parseInt(numberOfMessagesToSend, 10);

    return [startIndex, endIndex];
  }

  static getMessagesFromParentThread(threadRef) {
    const messageDatabase = ServiceHelper.getDbData('messages');
    return messageDatabase.filter(message => message.ref === threadRef)[0]['msgs'];
  }

  static selectMessagesToSend(messages, range) {
    return messages.filter((_, idx) => idx >= Math.min(...range) && idx < Math.max(...range));
  }

  static getSelectedMessagesRefs(messages) {
    return messages.map(mess => mess.ref);
  }

  static markAsRead(threadRef, messagesRefs) {
    const messageDatabase = ServiceHelper.getDbData('messages');
    const messageObjectIndex = messageDatabase.findIndex(
      messObj => messObj.ref === threadRef.trim(),
    );
    messageDatabase[messageObjectIndex].msgs.forEach(mess =>
      messagesRefs.includes(mess.ref) ? (mess.read = 'T') : null,
    );

    const numberOfUnreadMessages = messageDatabase[messageObjectIndex].msgs.filter(
      messObj => messObj.read === 'N',
    ).length;

    serviceEventEmitter.emit(
      'unread:message:number:change',
      numberOfUnreadMessages,
      threadRef.trim(),
    );

    ServiceHelper.saveDbData(messageDatabase, 'messages');
  }
}

module.exports = RengetthrsmsgsHelper;
