class DateHelper {
  static getDate() {
    return this.formatDate(new Date());
  }
  static formatDate(date) {
    return date
      .toISOString()
      .replace(/T|Z/g, ' ')
      .trim();
  }

  static getDateForMessage() {
    return this.getDate().slice(0, 19);
  }
}

module.exports = DateHelper;
