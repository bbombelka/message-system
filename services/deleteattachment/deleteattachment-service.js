const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const ServiceHelper = require('../service-helper');
const { PROCESSING_FINISHED, MESSAGE_MODIFIED } = require('../../enums/events.enum');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class DeleteAttachment extends Service {
  constructor(serviceEmitter, databaseController, { prefix }) {
    super(serviceEmitter, databaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkRef');
  }

  checkRef = () => {
    const { ref } = this.state.requestBody;

    if (typeof ref !== 'string' || !ref.length) {
      return this.finishProcessWithError('Reference is missing.', 400);
    }
    if (ref.length !== 64) {
      return this.finishProcessWithError('Invalid reference format.', 400);
    }

    this.setState({ ref });
  };

  processRequest = async () => {
    this.decodeRef();
    try {
      await this.deleteAttachmentFromDatabase();
      this.prepareResponse();
      this.emitEvent('processing-finished');
      this.adjustCache();
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.finishProcessWithError(...errorMessage);
    }
  };

  getErrorMessage = (error) => {
    return ServiceHelper.isDatabaseError(error)
      ? [error.message, error.statusCode]
      : ['There were problems with deleting the file.', 400];
  };

  decodeRef = () => {
    const { ref } = this.state;
    const { id, type } = CipheringHandler.decryptData(ref);
    if (type !== 'A') {
      throw new Error('Invalid reference.');
    } else {
      this.setState({ id });
    }
  };

  deleteAttachmentFromDatabase = async () => {
    const { id, ref } = this.state;
    const { message_id } = await this.databaseController.deleteAttachmentBinary(id);
    await this.databaseController.deleteAttachmentDetails(message_id, ref);
    this.setState({ message_id });
  };

  prepareResponse = () => {
    this.setState('responseBody', { ref: this.state.ref });
  };

  adjustCache = async () => {
    const { message_id } = this.state;
    const user_id = this.state.response.locals.tokenData._id;
    const thread_id = await this.databaseController.getThreadId(message_id);
    const threadRef = CipheringHandler.encryptData({ id: thread_id, type: 'T' });

    this.databaseController.emit(MESSAGE_MODIFIED, { ref: threadRef, user_id });
  };
}

module.exports = new DeleteAttachment(ServiceEmitter, DatabaseController, options);
