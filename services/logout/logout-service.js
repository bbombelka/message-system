const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const redisClient = require('../redis');
const { PROCESSING_FINISHED } = require('../../enums/events.enum');

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
      await this.getUser();
      await this.removeTokenFromCache();
      this.removeCachedUserData();
      this.setState({ responseBody: 'User correctly logged out.' });
      this.emitEvent(PROCESSING_FINISHED);
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.finishProcessWithError(...errorMessage);
    }
  };

  getUser = async () => {
    const user = await this.databaseController.getUser(this.state.login);
    this.setState({ user });
  };

  removeTokenFromCache = () => {
    const { _id } = this.state.user;

    return new Promise((resolve, reject) => {
      this.redisCache.del(_id.toString(), (err, reply) => {
        if (err) reject();
        if (reply === 0) reject(new Error('User already logged out.'));
        resolve();
      });
    });
  };

  removeCachedUserData = () => {
    const { _id } = this.state.user;

    redisClient.scan('0', 'MATCH', _id + '*', 'COUNT', '100', (err, [_, keys]) => {
      keys.forEach((key) => redisClient.del(key, (err, number) => console.log(err, key)));
    });
  };

  getErrorMessage = (error) => {
    return error.code ? ['An error occured while logging out.', 500] : [error.message, 405];
  };
}

module.exports = new Logout(ServiceEmitter, DatabaseController, redisClient, options);
