const Rengetthrsmsgs = require('./rengetthrsmsgs-helper');
const ServiceHelper = require('../service-helper');

module.exports = {
  service: (request, response) => {
    const { body } = request;
    const bodyHasContent = Object.keys(body).length > 0;
    let responseBody;

    if (bodyHasContent) {
      responseBody = Rengetthrsmsgs.processRequest(body);
    } else response.status(500);

    if (typeof responseBody === 'string') {
      response.status(500).send(responseBody);
    }

    responseBody = ServiceHelper.formatResponse(responseBody);

    response.json(responseBody);

    // response.send('rengetthrsmsgs is working fine!');
    // response.end();
  },
};
