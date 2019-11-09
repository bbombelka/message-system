const messageDatabase = require('../../messages');

class RengetthrsmsgsHelper {
  static processRequest(params) {
    const parentThreadMessages = this.getMessagesFromParentThread(params.ref);
    const numberOfMessagesOnServer = parentThreadMessages.length;
    const numberOfMessagesToSend = params.numrec;
    const numberOfMessagesToIgnore = params.skip;

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

    return {
      messages: parentThreadMessages.slice(...selectParams),
      total: numberOfMessagesOnServer,
    };
  }

  static getParamsForSelectingPayload(numberOfMessagesToSend, numberOfMessagesToIgnore) {
    const startIndex = parseInt(numberOfMessagesToIgnore, 10);
    const endIndex = startIndex + parseInt(numberOfMessagesToSend, 10);

    return [startIndex, endIndex];
  }

  static getMessagesFromParentThread(threadRef) {
    return messageDatabase.filter(message => message.ref === threadRef)[0]['msgs'];
  }
}

module.exports = RengetthrsmsgsHelper;
