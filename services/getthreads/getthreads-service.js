const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database-controller');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class GetThreads extends Service {
  constructor(serviceEmitter, databaseController, { prefix }) {
    super(serviceEmitter, databaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('prepareParameters');
  }

  processRequest = async () => {
    try {
      await this.getTotalThreadsNumber();
      if (!this.state.error) {
        await this.selectThreadsToSend();
      }
      this.emitEvent('processing-finished');
    } catch (error) {
      this.finishProcessWithError('There has been a server error', 400);
    }
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

  getTotalThreadsNumber = async () => {
    const numberOfThreadsOnServer = await this.databaseController.getThreadNumber();
    const { numberOfThreadsToIgnore } = this.state;

    if (numberOfThreadsToIgnore > numberOfThreadsOnServer) {
      return this.finishProcessWithError(
        'Number of threads to skip is greater than total number of threads.',
        400,
      );
    }

    this.setState({ numberOfThreadsOnServer });
  };

  selectThreadsToSend = async () => {
    const { numberOfThreadsToSend, numberOfThreadsToIgnore, numberOfThreadsOnServer } = this.state;

    const threads = await this.databaseController.getThreads(
      parseInt(numberOfThreadsToSend),
      parseInt(numberOfThreadsToIgnore),
    );
    this.setState('responseBody', { threads, total: numberOfThreadsOnServer });
  };
}

module.exports = new GetThreads(ServiceEmitter, DatabaseController, options);
