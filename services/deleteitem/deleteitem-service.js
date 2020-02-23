const ServiceHelper = require('../service-helper');
const deleteItemHelper = require('./deleteitem-helper');

module.exports = {
  deleteItemService: (request, response) => {
    const { body } = request;
    const bodyHasContent = Object.keys(body).length > 0;
    let responseBody;

    if (bodyHasContent) {
      responseBody = deleteItemHelper.processRequest(body);
    } else response.status(500);

    if (typeof responseBody === 'string') {
      response.status(500).json(ServiceHelper.formatErrorResponse(responseBody));
    }

    responseBody = ServiceHelper.formatResponse(responseBody);

    response.json(responseBody);
  },
};
