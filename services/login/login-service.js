const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const tokenHandler = require('../../middleware/token-handler');
const cipheringHandler = require('../../common/ciphering-handler');
const redisClient = require('../redis');
const config = require('../../config');
const { PROCESSING_FINISHED } = require('../../enums/events.enum');

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
      if (!this.state.refreshToken) {
        await this.prepareRefreshToken();
        this.cacheRefreshToken();
      }
      this.prepareResponse();
      this.emitEvent(PROCESSING_FINISHED);
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      if (this.state.exception) {
        return this.prepareExceptionResponse();
      }

      this.finishProcessWithError(...errorMessage);
    }
  };

  checkLoginCacheStatus = () => {
    const { _id } = this.state.user;

    return new Promise((resolve, reject) => {
      this.redisCache.get(_id.toString(), (err, reply) => {
        if (err) reject(new Error('Error during checking cache.'));
        if (reply) resolve(this.setState('refreshToken', reply));
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
    const { _id, name } = this.state.user;
    const token = await tokenHandler.signToken({ _id, name });
    this.setState('accessToken', token);
  };

  prepareRefreshToken = async () => {
    const { _id, name } = this.state.user;
    const token = await tokenHandler.signToken({ _id, name }, 'refresh');
    this.setState('refreshToken', token);
  };

  prepareResponse = () => {
    const { accessToken, refreshToken } = this.state;
    this.setState('responseBody', { accessToken, refreshToken });
  };

  cacheRefreshToken = () => {
    const { _id } = this.state.user;
    const { refreshToken } = this.state;
    return new Promise((resolve, reject) => {
      this.redisCache.setex(_id.toString(), config.refreshTokenExpirationTime, refreshToken, (err) => {
        if (err) reject(new Error('Error during caching token.'));
        resolve();
      });
    });
  };

  getErrorMessage = (error) => {
    return error.code ? ['An error occured while logging out.', 500] : [error.message, 405];
  };
}

module.exports = new Login(ServiceEmitter, DatabaseController, redisClient, options);
