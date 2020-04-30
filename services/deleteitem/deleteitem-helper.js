class DeleteItemHelper {
  static itemIsThread(type) {
    return type === 'T';
  }

  static isDatabaseError({ type }) {
    return type === 'db';
  }
}

module.exports = DeleteItemHelper;
