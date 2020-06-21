const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const tokenHandler = require('../../middleware/token-handler');
const redisClient = require('../redis');

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
      this.emitEvent('processing-finished');
    } catch (error) {
      this.handleError(error);
    }
  };

  verifyToken = async () => {
    const { token } = this.state;
    const { _id, login } = await tokenHandler.performVerification(token, 'refresh');
    this.setState({ _id, login });
  };

  checkCacheLoginStatus = () => {
    const { login } = this.state;

    return new Promise((resolve, reject) => {
      this.redisCache.get(login, (err, reply) => {
        if (err) reject();
        if (!reply) reject(new Error(login + ' is logged out.'));
        resolve(true);
      });
    });
  };

  prepareAccessToken = async () => {
    const { _id, login } = this.state;
    const token = await tokenHandler.signToken({ _id, login });
    this.setState('responseBody', { accessToken: token });
  };

  handleError = error => {
    if (error.code) {
      return this.finishProcessWithError('An error occured while renewing the token', 500);
    }

    if (error.message === 'jwt expired') {
      this.finishProcessWithError('Provided token has expired.', 401);
    }

    this.finishProcessWithError(error.message, 401);
  };
}

module.exports = new RenewToken(ServiceEmitter, DatabaseController, redisClient, options);
