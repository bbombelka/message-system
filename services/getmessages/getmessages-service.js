const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const MessageModel = require('../../models/message-model');
const CipheringHandler = require('../../common/ciphering-handler');
const Helper = require('./getmessages-helper');
const redisClient = require('../redis');
const config = require('../../config');
const { MESSAGES_SENT, PROCESSING_FINISHED } = require('../../enums/events.enum');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class GetMessages extends Service {
  constructor(serviceEmitter, DatabaseController, redisCache, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkParameters');
    this.redisCache = redisCache;
  }

  checkParameters = () => {
    const { requestBody } = this.state;
    const numberOfMessagesToSend = requestBody.num;
    const numberOfMessagesToIgnore = requestBody.skip;
    const ref = requestBody.ref;

    if (!numberOfMessagesToSend) {
      return this.finishProcessWithError('Num parameter is missing.', 400);
    }
    if (!numberOfMessagesToIgnore && numberOfMessagesToIgnore !== 0) {
      return this.finishProcessWithError('Skip parameter is missing.', 400);
    }
    if (!ref) {
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
      if (!config.cacheIsDisabled) {
        this.getRedisKey();
        await this.checkCache();
        if (this.state.isCached) {
          return this.respondWithCachedData();
        }
      }
      this.getParamsForSelectingResponseBodyMessages();
      await this.selectMessagesToSend();
    } catch (error) {
      const errorBody =
        error.type === 'db' ? [error.message, error.statusCode] : ['There has been a server error', 400];

      return this.finishProcessWithError(...errorBody);
    }
    !config.cacheIsDisabled && this.cacheResponse();
    this.emitEvent(PROCESSING_FINISHED);
    if (Helper.payloadHasUnreadMessages(this.state.messages)) {
      this.databaseController.emit(MESSAGES_SENT, this.getSentMessagesDetails());
    }
  };

  getRedisKey = () => {
    const { numberOfMessagesToIgnore, numberOfMessagesToSend } = this.state;
    const keyParts = [
      this.state.response.locals.tokenData._id,
      this.state.request.originalUrl.slice(1),
      this.state.requestBody.ref,
      numberOfMessagesToSend,
      numberOfMessagesToIgnore,
    ];
    const redisKey = this.generateRedisKey(keyParts);
    this.setState({ redisKey });
  };

  checkCache = () => {
    const { redisKey } = this.state;

    return new Promise((resolve) => {
      this.redisCache.get(redisKey, (err, data) => {
        if (err || !data) return resolve(this.setState('isCached', false));
        this.setState({ isCached: true, cachedData: JSON.parse(data) });
        resolve();
      });
    });
  };

  respondWithCachedData = () => {
    this.setState('responseBody', this.state.cachedData);
    this.emitEvent(PROCESSING_FINISHED);
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
    const { messages, total } = await this.databaseController.getMessages({
      threadIds: [id],
      limit,
      skip,
    });
    this.setState({ messages, total });
    this.prepareResponse();
  };

  prepareResponse = () => {
    const { messages, total } = this.state;
    const encryptedIdMessages = messages.map((message) => {
      return {
        ...MessageModel.client(message),
        ref: CipheringHandler.encryptData({
          id: message._id.toString(),
          type: 'M',
        }),
      };
    });

    this.setState('responseBody', {
      messages: encryptedIdMessages,
      total,
    });
  };

  getSentMessagesDetails = () => {
    const { messages, total } = this.state;
    return {
      messagesIds: messages.map((message) => message._id),
      threadId: messages[0].thread_id,
      totalMessageNumber: total,
    };
  };

  cacheResponse = () => {
    const { responseBody, redisKey } = this.state;

    this.redisCache.setex(redisKey, config.cacheExpiration, JSON.stringify(responseBody));
  };
}

module.exports = new GetMessages(ServiceEmitter, DatabaseController, redisClient, options);
