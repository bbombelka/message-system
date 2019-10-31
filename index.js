const express = require('express'),
  server = express(),
  user = require('./user'),
  PORT = 8000,
  threadsDatabase = require('./threads');

server.use(express.urlencoded());
server.use(express.json());

server.post('/rengetthrs', (request, response) => {
  const { body } = request;
  const bodyHasContent = Object.keys(body).length > 0;
  let responseBody;

  if (bodyHasContent) {
    responseBody = processRequest(body);
  } else response.status(500);

  if (typeof responseBody === 'string') {
    response.status(500).send(responseBody);
  }

  response.json(responseBody);
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}!`));

const processRequest = params => {
  const numberOfItemsOnServer = threadsDatabase.length;
  const numberOfItemsToSend = params.numrec;
  const numberOfItemsToIgnore = params.skip;

  if (
    numberOfItemsToSend > numberOfItemsOnServer ||
    numberOfItemsToIgnore > numberOfItemsOnServer
  ) {
    return 'Parameter is not correct';
  }

  const payload = selectPayload(numberOfItemsToSend, numberOfItemsToIgnore);

  return payload;
};

const selectPayload = (numberOfItemsToSend, numberOfItemsToIgnore) => {
  const startIndex = numberOfItemsToIgnore;
  const endIndex = startIndex + numberOfItemsToSend;

  return threadsDatabase.slice(startIndex, endIndex);
};
