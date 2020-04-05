const Service = require('../../common/service');
const ServiceHelper = require('../service-helper');
const ServiceEmitter = require('../event-emitter');
const path = require('path');

class UploadAttachment extends Service {
  constructor(serviceEmitter, { prefix }) {
    super(serviceEmitter);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
  }

  service = (request, response) => {
    this.resetState();
    this.setState({ request, response });
    request.files
      ? this.validateRequestHasBody()
      : this.finishProcessWithError('No file attached to the request.', 400);

    if (!this.state.error) {
      this.validateMessageRef();
      this.checkValidationStatus();
    }
  };

  validateMessageRef = () => {
    const { ref } = this.state.requestBody;

    if (ref.length !== 64) {
      return this.finishProcessWithError('Invalid reference.');
    }

    const messageDb = ServiceHelper.getDbData('messages');
    const messObj = messageDb.filter(messObj => messObj.msgs.find(msg => msg.ref === ref))[0];

    if (messObj) {
      this.setState({ messObj, messageDb });
    } else {
      this.finishProcessWithError('Invalid reference.');
    }
  };

  processRequest = async () => {
    const { files } = this.state.request.files;
    await this.writeFilesToDisk(files);
    this.updateAttachmentDatabase();
    this.updateMessageDatabase();
    this.prepareResponseMessage();
    this.emitEvent('processing-finished');
  };

  writeFilesToDisk = async files => {
    const responseInfo = [];

    for (const file of files) {
      const ref = ServiceHelper.hashRef(84);
      try {
        await file.mv(`./database/upload/${ref}`);
        responseInfo.push({
          status: 'OK',
          ref,
          info: file.name,
        });
        this.prepareDatabaseFileDetails(file, ref);
      } catch (error) {
        responseInfo.push({
          status: 'ERROR',
          ref,
          info: file.name,
        });
      }
    }
    this.setState({ responseInfo });
  };

  prepareDatabaseFileDetails = (uploadedFile, fileRef) => {
    if (!this.state.attachments) {
      this.setState('attachments', []);
    }
    const { attachments } = this.state;
    const { mimetype, name, size } = uploadedFile;
    const uploadedFileObj = {
      ref: fileRef,
      mimetype,
      name,
      size,
    };
    attachments.push(uploadedFileObj);
  };

  updateAttachmentDatabase = () => {
    const { attachments } = this.state;
    const attachmentsDb = ServiceHelper.getDbData('attachments');
    attachments.forEach(attachment => attachmentsDb.push(attachment));
    ServiceHelper.saveDbData(attachmentsDb, 'attachments');
  };

  updateMessageDatabase = () => {
    const { attachments, messObj, messageDb } = this.state;
    const { ref } = this.state.requestBody;
    const message = messObj.msgs.find(msg => msg.ref === ref);

    attachments.forEach(attachment => {
      const { ref } = attachment;
      message.attachments.push(ref);
    });
    ServiceHelper.saveDbData(messageDb, 'messages');
  };

  prepareResponseMessage = () => {
    const { responseInfo } = this.state;
    const responseBody = responseInfo;
    this.setState({ responseBody });
  };
}

const options = {
  prefix: path.basename(__filename, '.js'),
};

module.exports = new UploadAttachment(ServiceEmitter, options);
