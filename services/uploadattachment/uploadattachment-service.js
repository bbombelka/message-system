const Service = require('../../common/service');
const ServiceHelper = require('../service-helper');
const UploadattachmentHelper = require('./uploaddattachment-helper');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const uploadEnum = require('../../enums/upload');

class UploadAttachment extends Service {
  constructor(serviceEmitter, { prefix }) {
    super(serviceEmitter);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
  }

  service = (request, response) => {
    this.resetState();
    this.setState({ request, response });
    this.performValidation();
    this.checkValidationStatus();
  };

  performValidation = () => {
    const validations = [
      'validateRequestHasBody',
      'validateRequestHasFiles',
      'validateMessageRef',
      'validateRequestFileContent',
    ];

    for (const validation of validations) {
      this[validation]();
      if (this.state.error) break;
    }
  };

  validateRequestHasFiles = () => {
    const { request } = this.state;
    request.files ? null : this.finishProcessWithError('No file attached to the request.', 400);
  };

  validateMessageRef = () => {
    const { ref } = this.state.requestBody;

    if (ref.length !== 64) {
      return this.finishProcessWithError('Invalid reference format.');
    }

    const messageDb = ServiceHelper.getDbData('messages');
    const messObj = messageDb.filter(messObj => messObj.msgs.find(msg => msg.ref === ref))[0];

    messObj
      ? this.setState({ messObj, messageDb })
      : this.finishProcessWithError('Invalid reference.');
  };

  validateRequestFileContent = () => {
    const responseInfo = [];
    const filesToRemoveIndexes = [];
    const { files } = this.state.request.files;

    if (files.length > uploadEnum.MAXIMUM_FILE_NUMBER) {
      const error = `Too many files. The maximum is ${uploadEnum.MAXIMUM_FILE_NUMBER} per message.`;
      return this.finishProcessWithError(error, 413);
    }

    files.forEach((file, index) => {
      const { name, mimetype, size, md5 } = file;
      const responseObject = UploadattachmentHelper.createResponseObject(md5, name);

      if (size > uploadEnum.MAXIMUM_FILE_SIZE) {
        const error = `${name} is too big. Maximum size is ${uploadEnum.MAXIMUM_FILE_SIZE} bytes per file.`;
        filesToRemoveIndexes.push(index);
        const options = { status: uploadEnum.ERROR_RESPONSE, msg: error };
        UploadattachmentHelper.updateResponseObject(responseObject, options);
      }

      if (!uploadEnum.ACCEPTED_FILE_TYPES.includes(mimetype)) {
        const error = `${name} has unsupported extension.`;
        filesToRemoveIndexes.push(index);
        const options = { status: uploadEnum.ERROR_RESPONSE, msg: error };
        UploadattachmentHelper.updateResponseObject(responseObject, options);
      }
      responseInfo.push(responseObject);
    });

    const acceptedFiles = files.filter((_, index) => !filesToRemoveIndexes.includes(index));

    this.setState({
      requestFiles: acceptedFiles,
      responseInfo,
    });

    if (acceptedFiles.length === 0) {
      this.setState({ statusCode: 415, error: true });
      this.prepareResponseMessage();
      this.emitEvent('processing-finished');
    }
  };

  processRequest = async () => {
    await this.writeFilesToDisk();
    if (this.state.attachments) {
      this.updateAttachmentDatabase();
      this.updateMessageDatabase();
    }
    this.prepareResponseMessage();
    this.verifyErrorState();
    this.emitEvent('processing-finished');
  };

  writeFilesToDisk = async () => {
    const { requestFiles, responseInfo } = this.state;

    for (const file of requestFiles) {
      const ref = ServiceHelper.hashRef(84);
      try {
        await file.mv(`./database/upload/${ref}`);
        this.prepareDatabaseFileDetails(file, ref);
      } catch (error) {
        const errorMessage = 'There were problems with saving the file.';
        const responseObject = responseInfo.find(response => response.md5 === file.md5);
        const options = { status: uploadEnum.ERROR_RESPONSE, msg: errorMessage };
        UploadattachmentHelper.updateResponseObject(responseObject, options);
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
    const responseBody = responseInfo.map(({ status, name, msg }) => {
      return {
        status,
        name,
        msg,
      };
    });

    this.setState({ responseBody });
  };

  verifyErrorState = () => {
    const { responseBody } = this.state;
    const allFilesAreErroneus = responseBody.every(
      responseInfo => responseInfo.status === uploadEnum.ERROR_RESPONSE,
    );
    if (allFilesAreErroneus) this.setState({ error: true, statusCode: 400 });
  };
}

const options = {
  prefix: path.basename(__filename, '.js'),
};

module.exports = new UploadAttachment(ServiceEmitter, options);
