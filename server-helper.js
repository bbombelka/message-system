const threads = require('./threads');
const messages = require('./messages');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class ServerHelper {
  static onServerStart() {
    ServerHelper.checkProcessArguments();
    config.shouldReloadDatabase && ServerHelper.setupDatabase();
  }

  static checkProcessArguments() {
    const shouldReload = !process.argv.includes('noreload');
    ServerHelper.setConfigProp('shouldReloadDatabase', shouldReload);
  }

  static setConfigProp(prop, value) {
    config[prop] = value;
  }

  static setupDatabase() {
    fs.writeFile(path.join(__dirname, 'database', 'threads.json'), JSON.stringify(threads), err => {
      if (err) throw err;
    });
    fs.writeFile(
      path.join(__dirname, 'database', 'messages.json'),
      JSON.stringify(messages),
      err => {
        if (err) throw err;
      },
    );
  }
}

module.exports = ServerHelper;
