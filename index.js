const express = require('express');
const server = express();
const services = require('./routes/services');
const PORT = 8001;
const logger = require('./middleware/logger');
const conditional = require('express-conditional-middleware');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');

server.use(cors());
server.use(
  fileUpload({
    createParentPath: true,
    debug: false,
  })
);
server.use(express.urlencoded());
server.use(express.json());
server.use(conditional(process.argv.includes('logger'), logger.log, null));
server.use(express.static(path.join(__dirname, 'build')));
server.use('/', services);

server.listen(PORT, () => {
  console.log('SERVER STARTED on PORT ' + PORT);
});
