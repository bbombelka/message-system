const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database-controller');
const MessageModel = require('../../models/message-model');
const CipheringHandler = require('../../common/ciphering-handler');
const options = {
  prefix: path.basename(__filename, '.js'),
};

class GetMessages extends Service {
  constructor(serviceEmitter, DatabaseController, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkParameters');
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
    if (ref.length !== 64) {
      return this.finishProcessWithError('Invalid reference format.', 400);
    }

    this.setState({
      numberOfMessagesToIgnore,
      numberOfMessagesToSend,
      ref,
    });
  };

  processRequest = async () => {
    try {
      this.getParamsForSelectingResponseBodyMessages();
      await this.selectMessagesToSend();
      this.emitEvent('processing-finished');
    } catch (error) {
      const errorBody =
        error.type === 'db'
          ? [error.message, error.statusCode]
          : ['There has been a server error', 400];

      this.finishProcessWithError(...errorBody);
    }
  };

  getParamsForSelectingResponseBodyMessages = () => {
    const { numberOfMessagesToSend, numberOfMessagesToIgnore } = this.state;
    this.setState({
      limit: parseInt(numberOfMessagesToSend),
      skip: parseInt(numberOfMessagesToIgnore),
    });
  };

  selectMessagesToSend = async () => {
    const { limit, skip, ref } = this.state;
    const { id } = CipheringHandler.decryptData(ref);
    const messages = await this.databaseController.getMessages({ id, limit, skip });

    this.prepareResponse(messages);
  };

  prepareResponse = ({ messages, total }) => {
    const encryptedIdMessages = messages.map(message => {
      return {
        ...MessageModel.parse(message),
        ref: CipheringHandler.encryptData({ id: message._id.toString(), type: 'M' }),
      };
    });

    this.setState('responseBody', {
      messages: encryptedIdMessages,
      total,
    });
  };
}

module.exports = new GetMessages(ServiceEmitter, DatabaseController, options);
