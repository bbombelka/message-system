const fs = require('fs');
const path = require('path');

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
    this.markAsRead(this.selectMessagesToSend(parentThreadMessages, selectParams));
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
    const messageDatabase = this.getDbData();
    return messageDatabase.filter(message => message.ref === threadRef)[0]['msgs'];
  }

  static selectMessagesToSend(messages, range) {
    return messages.filter((_, idx) => idx >= Math.min(...range) && idx < Math.max(...range));
  }

  static markAsRead(messages) {
    messages.forEach((_, idx, arr) => (arr[idx].read = 'T'));
  }

  static getDbData() {
    const filePath = path.join(__dirname, '..', '..', 'database', 'messages.json');
    return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }));
  }
}

module.exports = RengetthrsmsgsHelper;
