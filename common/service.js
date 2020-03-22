class Service {
  constructor() {
    this.state = {};
  }

  setState = (prop, value) => {
    const setProp = Object.defineProperty({}, prop, { value });
    this.state = { ...this.state, ...setProp };
  };

  validateBodyHasContent = reqBody => reqBody.length > 0;

  validateBodyContent = validatingFunc => {
    validatingFunc ? this.onSuccessfulValidation() : this.onFailedValidation();
  };

  onSuccesfulValidation = requestProcess => requestProcess();
}

module.exports = Service;
