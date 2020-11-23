const isNull = require('../utils/isNull');
const ServiceHelper = require('../services/service-helper');
const DatabaseError = require('../database/database-error');

class Service {
  constructor(serviceEmitter, databaseController) {
    this.serviceEmitter = serviceEmitter;
    this.databaseController = databaseController;
    this.setState({
      options: {
        prefix: 'service',
        eventListeners: [
          ['-processing-finished', () => this.sendResponse()],
          ['-processing-started', () => this.processRequest()],
        ],
        validationList: ['validateRequestHasBody'],
      },
    });
  }

  attachListeners = () => {
    const { prefix, eventListeners } = this.state.options;
    eventListeners.forEach(([event, handler]) => {
      this.serviceEmitter.on(prefix.concat(event), handler);
    });
  };

  service = (request, response, next) => {
    this.resetState();
    this.setState({ request, response, next });
    this.performValidation();
    this.checkValidationStatus();
  };

  performValidation = () => {
    const { validationList } = this.state.options;
    if (validationList.length) {
      for (const validation of validationList) {
        this[validation]();
        if (this.state.error) break;
      }
    }
  };

  setValidation = (validationList) => {
    const validations = Array.isArray(validationList) ? validationList : [validationList];
    this.state.options.validationList.push(...validations);
  };

  checkValidationStatus = () => {
    const { error } = this.state;
    !error && this.emitEvent('processing-started');
  };

  emitEvent = (eventName) => {
    const { prefix } = this.state.options;
    const event = `${prefix}-${eventName}`;
    this.serviceEmitter.emit(event);
  };

  processRequest = () => {
    const { response } = this.state;
    response.send('Service is mounted');
  };

  setState = (prop, value) => {
    if (value === undefined && typeof prop === 'object' && !isNull(prop) && !Array.isArray(prop)) {
      this.state = { ...this.state, ...prop };
    } else if (typeof prop === 'string' && value !== undefined) {
      const propToSet = Object.defineProperty({}, prop, {
        value,
        enumerable: true,
      });
      this.state = { ...this.state, ...propToSet };
    } else throw Error('Invalid argument(s). Use either key-value pair or provide an object.');
  };

  resetState = () => {
    const { options } = this.state;
    this.state = { options };
  };

  validateRequestHasBody = () => {
    const { body } = this.state.request;
    Object.keys(body).length === 0
      ? this.finishProcessWithError('No request data found.', 400)
      : this.setState('requestBody', body);
  };

  validateBodyContent = (validatingFunc) => {
    validatingFunc ? this.onSuccessfulValidation() : this.onFailedValidation();
  };
  onSuccesfulValidation = (requestProcess) => requestProcess();

  finishProcessWithError = (errorMessage, statusCode = 404) => {
    this.setState({
      statusCode,
      responseBody: errorMessage,
      error: true,
    });
    this.emitEvent('processing-finished');
  };

  sendResponse = () => {
    const { responseBody, response, error, statusCode } = this.state;
    error
      ? response.status(statusCode).json(ServiceHelper.formatErrorResponse(responseBody))
      : response.status(200).json(ServiceHelper.formatResponse(responseBody));
  };

  throwError = (errorMessage, statusCode) => {
    throw new DatabaseError(errorMessage, statusCode);
  };
}

module.exports = Service;
