const { readFileSync } = require('fs');
const config = require('../config');

class DatabaseConfig {
  constructor() {
    this.uri = this.getDbUri();
    this.database = 'messages';
  }

  getDbUri = () => {
    const data = JSON.parse(readFileSync(config.dbUriPath).toString());
    return data['MESSAGES_DB_URI'];
  };
}

module.exports = new DatabaseConfig();
