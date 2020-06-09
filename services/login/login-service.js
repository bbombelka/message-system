const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const tokenHandler = require('../../middleware/token-handler');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class Login extends Service {
  constructor(serviceEmitter, DatabaseController, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
  }

  processRequest = async () => {
    const user = {
      id: '1',
      login: 'barty-boy',
      role: 'C',
    };

    try {
      const token = await tokenHandler.signToken(user);
      this.setState('responseBody', { token });
      this.emitEvent('processing-finished');
    } catch (error) {
      this.finishProcessWithError('An error occured while fetching the token.', 500);
    }
  };
}

module.exports = new Login(ServiceEmitter, DatabaseController, options);
