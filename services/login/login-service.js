const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const tokenHandler = require('../../middleware/token-handler');
const cipheringHandler = require('../../common/ciphering-handler');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class Login extends Service {
  constructor(serviceEmitter, DatabaseController, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkParameters');
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
      await this.prepareToken();
      this.emitEvent('processing-finished');
    } catch (error) {
      this.finishProcessWithError(error.message, 500);
    }
  };

  verifyUser = async () => {
    const { login, userProvidedPassword } = this.state;
    const user = await this.databaseController.getUser(login);
    const password = await cipheringHandler.hashPassword(userProvidedPassword, user.salt);

    if (user.password !== password) {
      throw new Error('Incorrect password.');
    }

    if (user.status === 'I') {
      throw new Error('User account is inactive.');
    }

    this.setState({ user });
  };

  prepareToken = async () => {
    const { _id, login } = this.state.user;
    const token = await tokenHandler.signToken({ _id, login });
    this.setState('responseBody', { token });
  };
}

module.exports = new Login(ServiceEmitter, DatabaseController, options);
