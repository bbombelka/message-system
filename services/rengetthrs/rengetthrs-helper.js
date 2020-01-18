const threadsDatabase = require('../../threads');

class RengetthrsHelper {
  static processRequest(params) {
    const numberOfThreadsOnServer = threadsDatabase.length;
    const numberOfThreadsToSend = params.numrec;
    const numberOfThreadsToIgnore = params.skip;
    console.log(params);
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
    const startIndex = numberOfThreadsToIgnore;
    const endIndex = startIndex + numberOfThreadsToSend;

    return threadsDatabase.slice(startIndex, endIndex);
  }
}

module.exports = RengetthrsHelper;
