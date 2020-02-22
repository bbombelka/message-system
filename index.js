const express = require('express');
const server = express();
const PORT = 8000;
const rengetthrs = require('./services/rengetthrs/rengetthrs-service');
const rengetthrsmsgs = require('./services/rengetthrsmsgs/rengetthrsmsgs-service');
const deleteitem = require('./services/deleteitem/deleteitem-service');
const logger = require('./middleware/logger');
const helper = require('./server-helper');
const conditional = require('express-conditional-middleware');

server.use(express.urlencoded());
server.use(express.json());
server.use(conditional(process.argv.includes('logger'), logger.log, null));
server.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', ['*']);
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
server.post('/rengetthrs', rengetthrs.rengetthrsService);
server.post('/rengetthrsmsgs', rengetthrsmsgs.service);
server.post('/deleteitem', deleteitem.deleteItemService);

server.listen(PORT, () => {
  helper.onServerStart();
});
