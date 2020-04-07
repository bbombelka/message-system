const uploadEnum = require('../../enums/upload');

class UploadattachmentHelper {
  static createResponseObject(md5, name) {
    return { md5, status: uploadEnum.SUCCESSFUL_RESPONSE, name, msg: [] };
  }

  static updateResponseObject(responseObj, status, msg) {
    responseObj.status = status;
    responseObj.msg.push(msg);
  }
}

module.exports = UploadattachmentHelper;
