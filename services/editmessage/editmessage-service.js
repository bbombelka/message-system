const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const ServiceHelper = require('../service-helper');
const messageModel = require('../../models/message-model');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class EditMessage extends Service {
  constructor(serviceEmitter, DatabaseController, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkParameters', 'checkContent');
  }

  checkParameters = () => {
    const { ref = undefined, text = undefined } = this.state.requestBody;

    if (!ref) {
      return this.finishProcessWithError('Reference parameter is missing.', 400);
    }

    if (ref.length !== 64) {
      return this.finishProcessWithError('Invalid reference format.', 400);
    }

    if (!text) {
      return this.finishProcessWithError('Text parameter is missing.', 400);
    }
    this.setState({ ref, text });
  };

  checkContent = () => {
    const { text = '' } = this.state;

    if (text.length > 5000) {
      this.finishProcessWithError('Message text can have 5000 characters at most.', 400);
    }
  };

  processRequest = async () => {
    try {
      this.decodeRef();
      await this.updateDatabase();
      this.prepareResponse();
      this.emitEvent('processing-finished');
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.finishProcessWithError(...errorMessage);
    }
  };

  decodeRef = () => {
    const { ref } = this.state;
    const { id, type } = CipheringHandler.decryptData(ref);

    if (!ServiceHelper.itemIsMessage(type)) {
      this.throwError('Invalid reference.', 400);
    }
    this.setState({ id });
  };

  updateDatabase = async () => {
    const { id, text } = this.state;
    const editedMessage = await this.databaseController.updateMessage(id, text);

    this.setState({ editedMessage });
  };

  getErrorMessage = (error) => {
    return ServiceHelper.isDatabaseError(error)
      ? [error.message, error.statusCode]
      : ['There were problems with updating the message.', 400];
  };

  prepareResponse = () => {
    const { editedMessage, ref } = this.state;

    this.setState('responseBody', { messages: [messageModel.client({ ...editedMessage, ref })] });
  };
}

module.exports = new EditMessage(ServiceEmitter, DatabaseController, options);
