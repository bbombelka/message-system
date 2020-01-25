const path = require('path');
const fs = require('fs');

module.exports = {
  log: function(request, response, next) {
    const date = getDate();
    const serviceName = request.url.slice(1);
    const folderPath = path.join(__dirname.replace('middleware', ''), 'logs', date.slice(0, 10));

    const writeLogDataToFile = () => {
      const { body, headers, method } = request;
      const { statusCode } = response;
      const fileData = `
      REQUEST:
      body: ${JSON.stringify(body)} user-agent: ${headers['user-agent']} method: ${method}
      RESPONSE: 
      status code:${statusCode}`;

      fs.appendFile(
        path.join(folderPath, serviceName + '.txt'),
        formatLog(fileData),
        err => new Error(err),
      );
    };

    fs.mkdir(folderPath, () => writeLogDataToFile(request, response));
    next();
  },
};

const formatLog = log => '\n' + '*'.repeat(30) + '\n\t' + getDate() + '\n' + log;

const getDate = () => formatDate(new Date());

const formatDate = date =>
  date
    .toISOString()
    .replace(/T|Z/g, ' ')
    .trim();
