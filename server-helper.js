const threads = require('./threads');
const messages = require('./messages');
const fs = require('fs');
const path = require('path');

class ServerHelper {
  static setupDatabase() {
    fs.writeFile(path.join(__dirname, 'database', 'threads.json'), JSON.stringify(threads), err => {
      if (err) throw new Error(err);
    });
    fs.writeFile(
      path.join(__dirname, 'database', 'messages.json'),
      JSON.stringify(messages),
      err => {
        if (err) throw new Error(err);
      },
    );
  }
}

module.exports = ServerHelper;
