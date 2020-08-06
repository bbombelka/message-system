const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const ThreadModel = require('../../models/thread-model');
const redisClient = require('../redis');
const config = require('../../config');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class GetThreads extends Service {
  constructor(serviceEmitter, databaseController, redisCache, { prefix }) {
    super(serviceEmitter, databaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('prepareParameters');
    this.redisCache = redisCache;
  }

  processRequest = async () => {
    try {
      if (!config.cacheIsDisabled) {
        this.getRedisKey();
        await this.checkCache();
        if (this.state.isCached) {
          return this.respondWithCachedData();
        }
      }
      await this.getTotalThreadsNumber();
      if (!this.state.error) {
        await this.selectThreadsToSend();
        !config.cacheIsDisabled && this.cacheResponse();
      }
      this.emitEvent('processing-finished');
    } catch (error) {
      this.finishProcessWithError('There has been a server error', 400);
    }
  };

  checkCache = () => {
    const { redisKey } = this.state;

    return new Promise(resolve => {
      this.redisCache.get(redisKey, (err, data) => {
        if (err || !data) return resolve(this.setState('isCached', false));
        this.setState({ isCached: true, cachedData: JSON.parse(data) });
        resolve();
      });
    });
  };

  getRedisKey = () => {
    const { login } = this.state.response.locals.tokenData;
    const { originalUrl } = this.state.request;
    const { numberOfThreadsToIgnore, numberOfThreadsToSend } = this.state;
    const redisKey =
      login + originalUrl + '/' + numberOfThreadsToSend + '/' + numberOfThreadsToIgnore;
    this.setState({ redisKey });
  };

  respondWithCachedData = () => {
    this.setState('responseBody', this.state.cachedData);
    this.emitEvent('processing-finished');
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
    const user_id = this.state.response.locals.tokenData._id;
    const numberOfThreadsOnServer = await this.databaseController.getThreadNumber(user_id);
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
    const { numberOfThreadsToSend, numberOfThreadsToIgnore } = this.state;
    const user_id = this.state.response.locals.tokenData._id;
    const threads = await this.databaseController.getThreads(
      user_id,
      parseInt(numberOfThreadsToSend),
      parseInt(numberOfThreadsToIgnore),
    );

    this.encryptThreadId(threads);
  };

  encryptThreadId = threads => {
    const { numberOfThreadsOnServer } = this.state;
    const encryptedIdThreads = threads.map(thread => {
      return {
        ...ThreadModel.parse(thread),
        ref: CipheringHandler.encryptData({ id: thread._id.toString(), type: 'T' }),
      };
    });

    this.setState('responseBody', { threads: encryptedIdThreads, total: numberOfThreadsOnServer });
  };

  cacheResponse = () => {
    const { responseBody, redisKey } = this.state;

    this.redisCache.setex(redisKey, config.cacheExpiration, JSON.stringify(responseBody));
  };
}

module.exports = new GetThreads(ServiceEmitter, DatabaseController, redisClient, options);
