const express = require('express'),
  server = express(),
  PORT = 8000,
  rengetthrs = require('./services/rengetthrs/rengetthrs-service'),
  rengetthrsmsgs = require('./services/rengetthrsmsgs/rengetthrsmsgs-service'),
  logger = require('./middleware/logger'),
  helper = require('./server-helper');

server.use(express.urlencoded());
server.use(express.json());
server.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', ['*']);
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
server.use(logger.log);
server.post('/rengetthrs', rengetthrs.rengetthrsService);
server.post('/rengetthrsmsgs', rengetthrsmsgs.service);

server.listen(PORT, () => {
  helper.setupDatabase();

  console.log(`Server is running on port ${PORT}!`);
});
