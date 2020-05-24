const Service = require('../../common/service');
const ServiceHelper = require('../service-helper');
const Helper = require('./uploaddattachment-helper');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const uploadEnum = require('../../enums/upload');
const DatabaseController = require('../../database/database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const attachmentModel = require('../../models/attachment-model');
const { ObjectId, Binary } = require('mongodb');

const options = {
  prefix: path.basename(__filename, '.js'),
};
class UploadAttachment extends Service {
  constructor(serviceEmitter, databaseController, { prefix }) {
    super(serviceEmitter, databaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation([
      'validateRequestHasFiles',
      'validateMessageRef',
      'validateRequestFileContent',
    ]);
  }

  validateRequestHasFiles = () => {
    const { request } = this.state;
    if (!request.files) {
      this.finishProcessWithError('No file attached to the request.', 400);
    }
  };

  validateMessageRef = () => {
    const { ref = undefined } = this.state.requestBody;

    if (!ref) {
      return this.finishProcessWithError('Reference is missing.', 400);
    }

    if (ref.length !== 64) {
      return this.finishProcessWithError('Invalid reference format.');
    }

    this.setState({ ref });
  };

  validateRequestFileContent = () => {
    const responseInfo = [];
    const filesToRemoveIndexes = [];
    const files = this.#getUploadedFiles();

    if (files.length > uploadEnum.MAXIMUM_FILE_NUMBER) {
      const error = `Too many files. The maximum is ${uploadEnum.MAXIMUM_FILE_NUMBER} per message.`;
      return this.finishProcessWithError(error, 413);
    }

    files.forEach((file, index) => {
      const { name, mimetype, size, md5 } = file;
      const responseObject = Helper.createResponseObject(md5, name);

      if (size > uploadEnum.MAXIMUM_FILE_SIZE) {
        const error = `${name} is too big. Maximum size is ${uploadEnum.MAXIMUM_FILE_SIZE} bytes per file.`;
        filesToRemoveIndexes.push(index);
        const options = { status: uploadEnum.ERROR_RESPONSE, msg: error };
        Helper.updateResponseObject(responseObject, options);
      }

      if (!uploadEnum.ACCEPTED_FILE_TYPES.includes(mimetype)) {
        const error = `${name} has unsupported extension.`;
        filesToRemoveIndexes.push(index);
        const options = { status: uploadEnum.ERROR_RESPONSE, msg: error };
        Helper.updateResponseObject(responseObject, options);
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

  #getUploadedFiles = () => {
    const { attachment } = this.state.request.files;
    return Array.isArray(attachment) ? attachment : [attachment];
  };

  processRequest = async () => {
    this.decodeMessageRef();
    await this.persistToDatabase();
    this.prepareResponseMessage();
    this.verifyErrorState();
    this.emitEvent('processing-finished');
  };

  decodeMessageRef = () => {
    const { ref } = this.state;
    const { id } = CipheringHandler.decryptData(ref);
    this.setState({ id });
  };

  persistToDatabase = async () => {
    const { id, requestFiles, responseInfo } = this.state;
    for (const file of requestFiles) {
      const attachmentId = new ObjectId();
      const attachmentDocument = this.createAttachmentDocument(attachmentId, file.data);
      const attachmentSubdocument = this.createAttachmentSubdocument(attachmentId, file);
      try {
        await this.databaseController.appendAttachmentToMessage(attachmentSubdocument, id);
        await this.databaseController.addAttachmentBinary(attachmentDocument);
      } catch (error) {
        const errorMessage = this.getErrorMessage(error);
        const responseObject = responseInfo.find(response => response.md5 === file.md5);
        const options = { status: uploadEnum.ERROR_RESPONSE, msg: errorMessage };
        Helper.updateResponseObject(responseObject, options);
      }
    }
    this.setState({ responseInfo });
  };

  getErrorMessage = error => {
    return ServiceHelper.isDatabaseError(error)
      ? error.message
      : 'There were problems with saving the file.';
  };

  createAttachmentDocument = (_id, fileContentBuffer) => {
    const data = {
      _id,
      message_id: this.state.id,
      bin: new Binary(fileContentBuffer),
    };
    return attachmentModel.databaseDocument(data);
  };

  createAttachmentSubdocument = (id, file) => {
    const { mimetype, name, size } = file;
    const ref = CipheringHandler.encryptData({ id: id.toString(), type: 'A' });
    return attachmentModel.databaseSubdocument({ mimetype, name, size, ref });
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

module.exports = new UploadAttachment(ServiceEmitter, DatabaseController, options);
