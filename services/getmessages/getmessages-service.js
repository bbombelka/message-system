const Service = require('../../common/service');
const ServiceHelper = require('../service-helper');
const ServiceEmitter = require('../event-emitter');
const path = require('path');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class GetMessages extends Service {
  constructor(serviceEmitter, { prefix }) {
    super(serviceEmitter);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation(['checkParameters', 'checkRef', 'checkParameterLogic']);
  }

  checkParameters = () => {
    const { requestBody } = this.state;
    const numberOfMessagesToSend = requestBody.num;
    const numberOfMessagesToIgnore = requestBody.skip;
    const ref = requestBody.ref;

    if (typeof numberOfMessagesToSend !== 'string' || !numberOfMessagesToSend.length) {
      return this.finishProcessWithError('Num parameter is missing.', 400);
    }
    if (typeof numberOfMessagesToIgnore !== 'string' || !numberOfMessagesToIgnore.length) {
      return this.finishProcessWithError('Skip parameter is missing.', 400);
    }
    if (typeof ref !== 'string' || !ref.length) {
      return this.finishProcessWithError('Reference is missing.', 400);
    }

    this.setState({
      numberOfMessagesToIgnore,
      numberOfMessagesToSend,
      ref,
    });
  };

  checkRef = () => {
    const { ref } = this.state;

    if (ref.length !== 44) {
      return this.finishProcessWithError('Invalid reference format.', 400);
    }
    const messageDatabase = ServiceHelper.getDbData('messages');
    const parentThreadMessages = messageDatabase.filter(message => message.ref === ref);
    parentThreadMessages.length
      ? this.setState({
          requestedThreadMessages: parentThreadMessages[0]['msgs'],
          numberOfMessagesOnServer: parentThreadMessages[0]['msgs'].length,
        })
      : this.finishProcessWithError('Invalid reference.', 400);
  };

  checkParameterLogic = () => {
    const { numberOfMessagesToIgnore, numberOfMessagesOnServer } = this.state;
    if (numberOfMessagesToIgnore > numberOfMessagesOnServer) {
      this.finishProcessWithError(
        'Number of messages to skip is greater than total number of messages.',
        400,
      );
    }
  };

  processRequest = () => {
    this.getParamsForSelectingResponseBodyMessages();
    this.selectMessagesToSend();
    this.prepareResponse();
    this.emitEvent('processing-finished');
  };

  getParamsForSelectingResponseBodyMessages = () => {
    const { numberOfMessagesToSend, numberOfMessagesToIgnore } = this.state;
    const startIndex = parseInt(numberOfMessagesToIgnore, 10);
    const endIndex = startIndex + parseInt(numberOfMessagesToSend, 10);
    this.setState('selectParams', [startIndex, endIndex]);
  };

  selectMessagesToSend = () => {
    const { requestedThreadMessages, selectParams } = this.state;
    const messagesToSend = requestedThreadMessages.filter(
      (_, index) => index >= Math.min(...selectParams) && index < Math.max(...selectParams),
    );
    this.setState('requestedThreadMessages', messagesToSend);
  };

  prepareResponse = () => {
    const { requestedThreadMessages, numberOfMessagesOnServer } = this.state;
    this.setState('responseBody', {
      messages: requestedThreadMessages,
      total: numberOfMessagesOnServer,
    });
  };
}

module.exports = new GetMessages(ServiceEmitter, options);
