const path = require('path');
const fs = require('fs');
const helper = require('./logger-helper');
const ServiceHelper = require('../helpers/date-helper');

class Logger {
  constructor() {
    this.state = {
      availableServices: this.determineAvailableServices(),
    };
    this.checkForOutdatedLogs();
  }
  determineAvailableServices = () => {
    fs.readdir(path.join(__dirname, '..', 'services'), (err, dirContent) => {
      if (err) throw err;
      const actualAvailableServices = dirContent.filter(item => !/\./.test(item));
      this.state.availableServices = [...actualAvailableServices];
    });
  };
  log = (request, response, next) => {
    this.setState(request, response);
    const { folderPath, serviceName, availableServices } = this.state;

    fs.mkdir(folderPath, () => {
      if (availableServices.includes(serviceName)) {
        this.writeLogDataToFile(request, response);
      } // jako else mozna dodać robienie logow w innym miejscu
    });
    next();
  };
  setState = (request, response) => {
    const folderPath = path.join(__dirname, '..', 'logs', ServiceHelper.getDate().slice(0, 10));

    this.state = {
      ...this.state,
      request,
      response,
      folderPath,
      serviceName: request.url.slice(1),
    };
  };

  writeLogDataToFile = () => {
    const { request, response, folderPath, serviceName } = this.state;
    const logFileData = helper.getLogFileData(request, response);

    fs.appendFile(
      path.join(folderPath, serviceName + '.txt'),
      helper.formatLog(logFileData),
      err => new Error(err),
    );
  };

  checkForOutdatedLogs = () => {
    const logsPath = path.join(__dirname, '..', 'logs');
    const logsToRemove = [];

    fs.readdir(logsPath, (err, dirContent) => {
      if (err) throw err;
      dirContent.forEach((dir, index) => {
        const { birthtimeMs } = fs.lstatSync(path.join(logsPath, dir));
        helper.logIsBeyondStorageTime(birthtimeMs) && logsToRemove.push(dir);
        index === dirContent.length - 1 && logsToRemove.length && this.deleteLogs(logsToRemove);
      });
    });
  };
  deleteLogs = logs => {
    const logsPath = path.join(__dirname, '..', 'logs');

    logs.forEach(logFolder => {
      fs.rmdir(
        path.join(logsPath, logFolder),
        { maxRetries: this.state.availableServices.length, recursive: true },
        err => {
          if (err) throw err;
        },
      );
    });
  };
}

module.exports = new Logger(); //needs to be rearranged
