const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const { ObjectId } = require('mongodb');
const messageModel = require('../../models/message-model');
const Helper = require('../service-helper');
const threadModel = require('../../models/thread-model');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class DeleteItem extends Service {
  constructor(serviceEmitter, DatabaseController, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkParameters', 'checkContent');
  }

  checkParameters = () => {
    const {
      reply = undefined,
      ref = undefined,
      title = undefined,
      text = undefined,
    } = this.state.requestBody;

    if (!reply) {
      return this.finishProcessWithError('Reply parameter is missing.', 400);
    }
    if (reply === 'T') {
      if (!ref) {
        return this.finishProcessWithError('Reference parameter is missing.', 400);
      }
      if (ref.length !== 64) {
        return this.finishProcessWithError('Invalid reference format.', 400);
      }
      this.setState({ ref });
    }

    if (!title) {
      return this.finishProcessWithError('Title parameter is missing.', 400);
    }

    if (!text) {
      return this.finishProcessWithError('Text parameter is missing.', 400);
    }
    this.setState({ reply, text, title });
  };

  checkContent = () => {
    const { text = '', title } = this.state;
    const errors = [];
    title.length > 50 ? errors.push('Title can have 50 characters at most.') : null;
    text.length > 5000 ? errors.push('Message text can have 5000 characters at most.') : null;

    if (errors.length) {
      this.finishProcessWithError(errors.join(' '), 400);
    }
  };

  processRequest = async () => {
    const { reply } = this.state;
    try {
      if (Helper.messageIsReply(reply)) {
        const { ref } = this.state;
        const { id, type } = CipheringHandler.decryptData(ref);
        await this.addMessageToExistingThread({ id, type });
      } else {
        await this.startNewThread();
      }
    } catch (error) {
      const errorBody = Helper.isDatabaseError(error)
        ? [error.message, error.statusCode]
        : ['There has been a server error', 500];

      this.finishProcessWithError(...errorBody);
    } finally {
      this.emitEvent('processing-finished');
    }
  };

  addMessageToExistingThread = async ({ id, type }) => {
    if (!Helper.itemIsThread(type)) {
      return this.finishProcessWithError('Invalid reference.', 400);
    }
    const message = this.getMessageBody(id);
    const newMessageId = await this.databaseController.addToCollection(message, 'messages');
    this.prepareResponse(newMessageId);
  };

  getMessageBody = threadId => {
    const { text, title } = this.state;
    const _id = new ObjectId();
    const messageParams = {
      _id,
      thread_id: threadId,
      text,
      title,
    };

    return messageModel.database(messageParams);
  };

  prepareResponse = id => {
    this.setState('responseBody', {
      ref: CipheringHandler.encryptData({ id: id.toString(), type: 'M' }),
    });
  };

  startNewThread = async () => {
    const thread = this.getThreadBody();
    const newThreadId = await this.databaseController.addToCollection(thread, 'threads');
    await this.addMessageToExistingThread({ id: newThreadId.toString(), type: 'T' });
  };

  getThreadBody = () => {
    const { title } = this.state;
    const threadId = new ObjectId();
    const threadParams = {
      _id: threadId,
      title,
    };
    return threadModel.database(threadParams);
  };
}

module.exports = new DeleteItem(ServiceEmitter, DatabaseController, options);
