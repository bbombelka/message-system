const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const Helper = require('../service-helper');
const redisClient = require('../redis');
const config = require('../../config');
const bool = require('../../enums/boolean');
const { MESSAGE_MODIFIED } = require('../../enums/events.enum');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class DeleteItem extends Service {
  constructor(serviceEmitter, DatabaseController, redisCache, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkParameters');
    this.redisCache = redisCache;
  }

  checkParameters = () => {
    const { ref = undefined } = this.state.requestBody;
    const bulk = bool.TRUE === this.state.requestBody.bulk;
    if (!ref) {
      return this.finishProcessWithError('Reference parameter is missing.', 400);
    }

    if (ref.length !== 64 && !bulk) {
      return this.finishProcessWithError('Invalid reference format.', 400);
    }

    this.setState('ref', bulk ? ref.split(',') : [ref]);
  };

  processRequest = async () => {
    try {
      this.decodeRef();
      this.checkRefContent();
      await Promise.all(this.getRequests());
      this.emitEvent('processing-finished');
    } catch (error) {
      const errorBody = Helper.isDatabaseError(error)
        ? [error.message, error.statusCode]
        : ['There has been a server error', 500];

      this.finishProcessWithError(...errorBody);
    }
  };

  decodeRef = () => {
    const { ref } = this.state;
    const decryptedItems = ref.map((ref) => CipheringHandler.decryptData(ref));
    this.setState({ decryptedItems });
  };

  checkRefContent = () => {
    const { decryptedItems } = this.state;
    const threadsToDelete = decryptedItems.filter(({ type }) => Helper.itemIsThread(type));
    const messagesToDelete = decryptedItems.filter(({ type }) => Helper.itemIsMessage(type));

    this.setState({
      threadsToDelete: threadsToDelete.length ? threadsToDelete.map(({ id }) => id) : null,
      messagesToDelete: messagesToDelete.length ? messagesToDelete.map(({ id }) => id) : null,
    });
  };

  getRequests = () => {
    const { threadsToDelete, messagesToDelete } = this.state;

    return [
      threadsToDelete ? this.deleteThread(threadsToDelete) : Promise.resolve(),
      messagesToDelete ? this.deleteMessage(messagesToDelete) : Promise.resolve(),
    ];
  };

  deleteThread = async (id, options) => {
    const user_id = this.state.response.locals.tokenData._id;
    const objectIds = Helper.convertToObjectId(id);
    await this.databaseController.deleteThread(objectIds, options, user_id);
    const threadsLeft = await this.databaseController.getThreadNumber(user_id);
    this.prepareResponse(threadsLeft);
  };

  prepareResponse = (total) => {
    const { ref } = this.state;

    this.setState('responseBody', {
      ref: ref.join(','),
      total,
    });
  };

  deleteMessage = async (id) => {
    const objectIds = Helper.convertToObjectId(id);
    const threadId = await this.databaseController.deleteMessage(objectIds);
    const messagesLeft = await this.databaseController.getMessageNumber(threadId);
    if (messagesLeft === 0) {
      this.deleteThread([threadId], { lastMessageDeleted: true });
    }
    this.prepareResponse(messagesLeft);
    this.databaseController.emit(MESSAGE_MODIFIED, {
      user_id: this.state.response.locals.tokenData._id,
      ref: CipheringHandler.encryptData({
        id: threadId,
        type: 'T',
      }),
    });
  };
}

module.exports = new DeleteItem(ServiceEmitter, DatabaseController, redisClient, options);
