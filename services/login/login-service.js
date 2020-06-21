const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const tokenHandler = require('../../middleware/token-handler');
const cipheringHandler = require('../../common/ciphering-handler');
const redisClient = require('../redis');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class Login extends Service {
  constructor(serviceEmitter, DatabaseController, redisCache, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkParameters');
    this.redisCache = redisCache;
  }

  checkParameters = () => {
    const { login = undefined, pass = undefined } = this.state.requestBody;

    if (!login) {
      return this.finishProcessWithError('Login missing.', 422);
    }
    if (!pass) {
      return this.finishProcessWithError('Password missing.', 422);
    }

    this.setState({ login, userProvidedPassword: pass });
  };

  processRequest = async () => {
    try {
      await this.verifyUser();
      await this.checkLoginCacheStatus();
      await this.prepareAccessToken();
      await this.prepareRefreshToken();
      await this.cacheRefreshToken();
      this.prepareResponse();
      this.emitEvent('processing-finished');
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.finishProcessWithError(...errorMessage);
    }
  };

  checkLoginCacheStatus = () => {
    const { login } = this.state;

    return new Promise((resolve, reject) => {
      this.redisCache.get(login, (err, reply) => {
        if (err) reject();
        if (reply) reject(new Error(login + ' is already logged in.'));
        resolve();
      });
    });
  };

  verifyUser = async () => {
    const { login, userProvidedPassword } = this.state;
    const user = await this.databaseController.getUser(login);
    const password = await cipheringHandler.hashPassword(userProvidedPassword, user.salt);

    if (user.password !== password) {
      this.throwError('Incorrect password.');
    }

    if (user.status === 'I') {
      this.throwError('User account is inactive.');
    }

    this.setState({ user });
  };

  prepareAccessToken = async () => {
    const { _id, login } = this.state.user;
    const token = await tokenHandler.signToken({ _id, login });
    this.setState('accessToken', token);
  };

  prepareRefreshToken = async () => {
    const { _id, login } = this.state.user;
    const token = await tokenHandler.signToken({ _id, login }, 'refresh');
    this.setState('refreshToken', token);
  };

  prepareResponse = () => {
    const { accessToken, refreshToken } = this.state;
    this.setState('responseBody', { accessToken, refreshToken });
  };

  cacheRefreshToken = () => {
    const { login } = this.state.user;
    const { refreshToken } = this.state;
    return new Promise((resolve, reject) => {
      this.redisCache.setex(login, 1800, refreshToken, (err, reply) => {
        if (err) reject();
        resolve();
      });
    });
  };

  getErrorMessage = error => {
    return error.code ? ['An error occured while logging out.', 500] : [error.message, 405];
  };
}

module.exports = new Login(ServiceEmitter, DatabaseController, redisClient, options);
