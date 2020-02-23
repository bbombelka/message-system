const Rengetthrsmsgs = require('./rengetthrsmsgs-helper');
const ServiceHelper = require('../service-helper');

module.exports = {
  service: (request, response) => {
    const { body } = request;
    const bodyHasContent = Object.keys(body).length > 0;
    let responseBody;

    if (bodyHasContent) {
      if (!body.ref) return response.status(400).json('Thread ref is not specified');
      responseBody = Rengetthrsmsgs.processRequest(body);
    } else response.status(500);

    if (typeof responseBody === 'string') {
      response.status(404).json(ServiceHelper.formatErrorResponse(responseBody));
    }

    responseBody = ServiceHelper.formatResponse(responseBody);

    response.json(responseBody);
  },
};
