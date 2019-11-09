const express = require('express'),
  server = express(),
  PORT = 8000,
  rengetthrs = require('./services/rengetthrs/rengetthrs-service'),
  rengetthrsmsgs = require('./services/rengetthrsmsgs/rengetthrsmsgs-service');

server.use(express.urlencoded());
server.use(express.json());

server.post('/rengetthrs', rengetthrs.rengetthrsService);
server.post('/rengetthrsmsgs', rengetthrsmsgs.service);

server.listen(PORT, () => console.log(`Server is running on port ${PORT}!`));
