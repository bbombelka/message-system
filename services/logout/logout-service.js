const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const redisClient = require('../redis');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class Logout extends Service {
  constructor(serviceEmitter, DatabaseController, redisCache, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkLoginParameter');
    this.redisCache = redisCache;
  }

  checkLoginParameter = () => {
    const { login = undefined } = this.state.requestBody;
    if (!login) {
      this.finishProcessWithError('Login parameter is missing.', 400);
    }
    this.setState({ login });
  };

  processRequest = async () => {
    try {
      await this.removeTokenFromCache();
      this.prepareResponse();
      this.emitEvent('processing-finished');
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.finishProcessWithError(...errorMessage);
    }
  };

  removeTokenFromCache = () => {
    const { login } = this.state;

    return new Promise((resolve, reject) => {
      this.redisCache.del(login, (err, reply) => {
        if (err) reject();
        if (reply === 0) reject(new Error(login + ' already logged out.'));
        resolve();
      });
    });
  };

  prepareResponse = () => {
    const { login } = this.state;
    this.setState({ responseBody: login + ' correctly logged out.' });
  };

  getErrorMessage = error => {
    return error.code ? ['An error occured while logging out.', 500] : [error.message, 405];
  };
}

module.exports = new Logout(ServiceEmitter, DatabaseController, redisClient, options);
