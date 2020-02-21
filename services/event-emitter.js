const EventEmitter = require('events');
class ServiceEmitter extends EventEmitter {}
const serviceEmitter = new ServiceEmitter();

module.exports = serviceEmitter;
