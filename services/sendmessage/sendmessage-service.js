const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const { ObjectId } = require('mongodb');
const messageModel = require('../../models/message-model');
const Helper = require('../service-helper');
const threadModel = require('../../models/thread-model');
const bool = require('../../enums/boolean');
const { PROCESSING_FINISHED, MESSAGE_MODIFIED, THREAD_MODIFIED } = require('../../enums/events.enum');

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
    const { reply = undefined, ref = undefined, title = undefined, text = undefined } = this.state.requestBody;

    if (!reply) {
      return this.finishProcessWithError('Reply parameter is missing.', 400);
    }
    if (reply === bool.TRUE) {
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
    this.setState({ isReply: Helper.messageIsReply(this.state.reply) });
    try {
      if (this.state.isReply) {
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
      this.emitEvent(PROCESSING_FINISHED);
    }
  };

  addMessageToExistingThread = async ({ id, type }, insertedThread) => {
    if (!Helper.itemIsThread(type)) {
      return this.finishProcessWithError('Invalid reference.', 400);
    }
    const message = this.getMessageBody(id);
    const insertedMessage = await this.databaseController.addToCollection(message, 'messages');
    const insertedItems = [insertedThread, insertedMessage].filter((item) => item);

    this.prepareResponse(insertedItems);

    if (this.state.isReply) {
      this.databaseController.emit(MESSAGE_MODIFIED, {
        user_id: this.state.response.locals.tokenData._id,
        ref: this.state.ref,
      });
    }
  };

  getMessageBody = (threadId) => {
    const { text, title } = this.state;
    const user_id = this.state.response.locals.tokenData._id;
    const _id = new ObjectId();
    const messageParams = {
      _id,
      thread_id: threadId,
      text,
      title,
      type: 'O',
      user_id,
    };

    return messageModel.database(messageParams);
  };

  prepareResponse = (insertedItems) => {
    const response = insertedItems.map((item) => {
      const isMessage = Boolean(item.thread_id);

      return isMessage
        ? {
            messages: [
              messageModel.client({
                ...item,
                ref: CipheringHandler.encryptData({ id: item._id.toString(), type: 'M' }),
              }),
            ],
          }
        : {
            threads: [
              threadModel.parse({
                ...item,
                ref: CipheringHandler.encryptData({ id: item._id.toString(), type: 'T' }),
              }),
            ],
          };
    });

    const responseBody = response.length === 2 ? { ...response[0], ...response[1] } : { ...response[0] };

    this.setState({ responseBody });
  };

  startNewThread = async () => {
    const thread = this.getThreadBody();
    const insertedThread = await this.databaseController.addToCollection(thread, 'threads');
    this.databaseController.emit(THREAD_MODIFIED, this.state.response.locals.tokenData._id);
    await this.addMessageToExistingThread({ id: insertedThread._id.toString(), type: 'T' }, insertedThread);
  };

  getThreadBody = () => {
    const user_id = this.state.response.locals.tokenData._id;
    const { title } = this.state;
    const threadId = new ObjectId();
    const threadParams = {
      _id: threadId,
      title,
      user_id,
    };
    return threadModel.database(threadParams);
  };
}

module.exports = new DeleteItem(ServiceEmitter, DatabaseController, options);
