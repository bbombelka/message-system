const uploadEnum = require('../../enums/upload');

class UploadattachmentHelper {
  static createResponseObject(file) {
    const { md5, mimetype, name, size } = file;
    return { md5, mimetype, msg: [], name, size, status: uploadEnum.SUCCESSFUL_RESPONSE };
  }

  static updateResponseObject(responseObj, { status, msg }) {
    responseObj.status = status;
    responseObj.msg.push(msg);
  }
}

module.exports = UploadattachmentHelper;
