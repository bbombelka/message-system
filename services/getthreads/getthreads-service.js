const Service = require('../../common/service');
const ServiceHelper = require('../service-helper');
const ServiceEmitter = require('../event-emitter');
const path = require('path');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class GetThreads extends Service {
  constructor(serviceEmitter, { prefix }) {
    super(serviceEmitter);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation(['prepareParameters', 'setDatabase', 'checkParameters']);
  }

  processRequest = () => {
    this.selectThreadsToSend();
    this.emitEvent('processing-finished');
  };

  prepareParameters = () => {
    const { requestBody } = this.state;
    const numberOfThreadsToSend = requestBody.num;
    const numberOfThreadsToIgnore = requestBody.skip;

    if (typeof numberOfThreadsToSend !== 'string' || !numberOfThreadsToSend.length) {
      return this.finishProcessWithError('Num parameter is missing.', 400);
    }
    if (typeof numberOfThreadsToIgnore !== 'string' || !numberOfThreadsToIgnore.length) {
      return this.finishProcessWithError('Skip parameter is missing.', 400);
    }

    this.setState({
      numberOfThreadsToIgnore,
      numberOfThreadsToSend,
    });
  };

  checkParameters = () => {
    const { numberOfThreadsToIgnore, numberOfThreadsOnServer } = this.state;
    if (numberOfThreadsToIgnore > numberOfThreadsOnServer) {
      this.finishProcessWithError(
        'Number of threads to skip is greater than total number of threads.',
        400,
      );
    }
  };

  selectThreadsToSend = () => {
    const { numberOfThreadsToIgnore, numberOfThreadsToSend, threadDb } = this.state;
    const startIndex = parseInt(numberOfThreadsToIgnore);
    const endIndex = startIndex + parseInt(numberOfThreadsToSend);
    const threadsToSend = threadDb.slice(startIndex, endIndex);
    this.setState('responseBody', { threads: threadsToSend, total: threadDb.length });
  };

  setDatabase = () => {
    const threadDb = ServiceHelper.getDbData('threads');
    const numberOfThreadsOnServer = threadDb.length;
    this.setState({ threadDb, numberOfThreadsOnServer });
  };
}

module.exports = new GetThreads(ServiceEmitter, options);
