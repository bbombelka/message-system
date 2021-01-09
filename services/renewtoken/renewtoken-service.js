const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const tokenHandler = require('../../middleware/token-handler');
const redisClient = require('../redis');
const { PROCESSING_FINISHED } = require('../../enums/events.enum');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class RenewToken extends Service {
  constructor(serviceEmitter, DatabaseController, redisCache, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkParameters');
    this.redisCache = redisCache;
  }

  checkParameters = () => {
    const { token = undefined } = this.state.requestBody;

    if (!token) {
      return this.finishProcessWithError('Missing token', 400);
    }
    this.setState({ token });
  };

  processRequest = async () => {
    try {
      await this.verifyToken();
      await this.checkCacheLoginStatus();
      await this.prepareAccessToken();
      this.emitEvent(PROCESSING_FINISHED);
    } catch (error) {
      this.handleError(error);
    }
  };

  verifyToken = async () => {
    const { token } = this.state;
    const { _id, name } = await tokenHandler.performVerification(token, 'refresh');
    this.setState({ _id, name });
  };

  checkCacheLoginStatus = () => {
    const { _id } = this.state;

    return new Promise((resolve, reject) => {
      this.redisCache.get(_id, (err, reply) => {
        if (err) reject(new Error('Error during checking cache.'));
        if (!reply) reject(new Error('User is logged out.'));
        resolve(true);
      });
    });
  };

  prepareAccessToken = async () => {
    const { _id, name } = this.state;
    const token = await tokenHandler.signToken({ _id, name });
    this.setState('responseBody', { accessToken: token });
  };

  handleError = (error) => {
    if (error.code) {
      return this.finishProcessWithError('An error occured while renewing the token', 500);
    }

    if (error.message === 'jwt expired') {
      return this.finishProcessWithError('Provided refresh token has expired.', 401, '015');
    }

    this.finishProcessWithError(error.message, 401);
  };
}

module.exports = new RenewToken(ServiceEmitter, DatabaseController, redisClient, options);
