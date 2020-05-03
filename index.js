const express = require('express');
const server = express();
const services = require('./routes/services');
const PORT = 8000;
const logger = require('./middleware/logger');
const conditional = require('express-conditional-middleware');
const fileUpload = require('express-fileupload');

server.use(
  fileUpload({
    createParentPath: true,
    debug: false,
  }),
);
server.use(express.urlencoded());
server.use(express.json());
server.use(conditional(process.argv.includes('logger'), logger.log, null));
server.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', ['*']);
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
server.use('/', services);

server.listen(PORT, () => {
  console.log('SERVER STARTED :-)');
});
