const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const Helper = require('../service-helper');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class DeleteItem extends Service {
  constructor(serviceEmitter, DatabaseController, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkParameters');
  }

  checkParameters = () => {
    const { requestBody } = this.state;
    const { ref = undefined } = requestBody;
    if (!ref) {
      return this.finishProcessWithError('Reference parameter is missing.', 400);
    }
    if (ref.length !== 64) {
      return this.finishProcessWithError('Invalid reference format.', 400);
    }
    this.setState({ ref });
  };

  processRequest = async () => {
    try {
      const { ref } = this.state;
      const { id, type } = CipheringHandler.decryptData(ref);

      if (Helper.itemIsThread(type)) {
        await this.deleteThread(id);
      } else {
        await this.deleteMessage(id);
      }

      this.emitEvent('processing-finished');
    } catch (error) {
      const errorBody = Helper.isDatabaseError(error)
        ? [error.message, error.statusCode]
        : ['There has been a server error', 500];

      this.finishProcessWithError(...errorBody);
    }
  };

  deleteThread = async (id, options) => {
    await this.databaseController.deleteThread(id, options);
    const threadsLeft = await this.databaseController.getThreadNumber();
    this.prepareResponse(threadsLeft);
  };

  prepareResponse = total => {
    const { ref } = this.state;
    this.setState('responseBody', {
      ref,
      total,
    });
  };

  deleteMessage = async id => {
    const threadId = await this.databaseController.deleteMessage(id);
    const messagesLeft = await this.databaseController.getMessageNumber(threadId);
    if (messagesLeft === 0) {
      this.deleteThread(threadId, { lastMessageDeleted: true });
    }
    this.prepareResponse(messagesLeft);
  };
}

module.exports = new DeleteItem(ServiceEmitter, DatabaseController, options);
