const CipheringHandler = require('../../common/ciphering-handler');
const DatabaseController = require('../../database/database-controller');
const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const ServiceHelper = require('../service-helper');
const path = require('path');
const fs = require('fs');
const { PassThrough } = require('stream');
const config = require('../../config');
const archiver = require('archiver');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class GetAttachment extends Service {
  constructor(serviceEmitter, databaseController, { prefix }) {
    super(serviceEmitter, databaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkRef');
  }

  checkRef = () => {
    const { ref } = this.state.requestBody;

    if (typeof ref !== 'string' || !ref.length) {
      return this.finishProcessWithError('Reference is missing.', 400);
    }
    if (ref.length !== 64) {
      return this.finishProcessWithError('Invalid reference format.', 400);
    }

    this.setState({ ref });
  };

  processRequest = async () => {
    try {
      this.decodeRef();
      this.state.getAllAttachments
        ? await this.processAllAttachments()
        : await this.processSingleAttachment();
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.finishProcessWithError(...errorMessage);
    }
  };

  getErrorMessage = (error) => {
    return ServiceHelper.isDatabaseError(error)
      ? [error.message, error.statusCode]
      : ['There were problems with downloading the file.', 400];
  };

  decodeRef = () => {
    const { ref } = this.state;
    const { id, type } = CipheringHandler.decryptData(ref);
    if (type !== 'A' && type !== 'M') {
      throw new Error('Invalid reference.');
    }

    if (type === 'M') {
      this.setState('getAllAttachments', true);
    }

    this.setState({ id });
  };

  processAllAttachments = async () => {
    const { id } = this.state;

    const attachmentsDetails = await this.databaseController.getAllAttachments(id);
    const attachmentsBinaries = await this.databaseController.getAllAttachmentsBinaries(id);
    this.getDecipheredAttachmentsDetails(attachmentsDetails);
    this.mergeDetails(attachmentsBinaries);
    await this.prepareUserCacheDirectory(this.getCacheDirPath());
    await this.zipAttachments();
    this.sendFile();
  };

  getDecipheredAttachmentsDetails = (attachmentsDetails) => {
    const deciphered = attachmentsDetails.map((attachmentDetails) => {
      return { ...attachmentDetails, id: CipheringHandler.decryptData(attachmentDetails.ref).id };
    });

    this.setState('decipheredAttachmentDetails', deciphered);
  };

  mergeDetails = (attachmentsBinaries) => {
    const { decipheredAttachmentDetails } = this.state;
    const ids = decipheredAttachmentDetails.map((detail) => detail.id);
    const checkedBinaryAttachments = attachmentsBinaries.filter(({ _id }) =>
      ids.includes(_id.toString())
    );
    [checkedBinaryAttachments, decipheredAttachmentDetails].forEach((details) =>
      details.sort((a, b) => Number(a.id) - Number(b.id))
    );
    const completeAttachmentDetails = decipheredAttachmentDetails.map(({ name }, index) => {
      return {
        ...{ name },
        buffer: checkedBinaryAttachments[index].bin.buffer,
      };
    });
    this.setState({ completeAttachmentDetails });
  };

  saveAllAttachmentsToCache = async () => {
    const cacheDirPath = this.getCacheDirPath();
    const attachmentsDirPath = path.join(cacheDirPath, 'allAttachments');
    this.prepareUserCacheDirectory(cacheDirPath);
    if (!(await this.checkDirExistence(attachmentsDirPath))) {
      this.createDir(attachmentsDirPath);
    }

    this.setState({ attachmentsDirPath });
  };

  createDir = async (dirPath) => {
    await fs.promises.mkdir(dirPath);
  };

  zipAttachments = async () => {
    const { dirPath } = this.state;
    const archivePath = path.join(dirPath, 'attachments.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(archivePath);

    await new Promise((resolve, reject) => {
      this.appendFilesBufferToArchive(archive);
      archive.on('error', (err) => reject(err)).pipe(output);
      output.on('close', () => resolve());
      archive.finalize();
    });

    this.setState('downloadPath', archivePath);
  };

  appendFilesBufferToArchive = (archive) => {
    const { completeAttachmentDetails } = this.state;
    completeAttachmentDetails.forEach(({ buffer, name }) => {
      archive.append(buffer, { name });
    });
  };

  processSingleAttachment = async () => {
    await this.prepareFile();
    if (config.cacheIsDisabled) {
      return this.streamFile();
    }
    await this.saveFileToCache();
    this.sendFile();
  };

  prepareFile = async () => {
    const { id, ref } = this.state;
    const { bin, message_id } = await this.databaseController.getAttachment(id);
    const attachmentDetails = await this.databaseController.getAttachmentDetails(message_id, ref);
    this.setState({ attachmentDetails, binaryBuffer: bin.buffer });
  };

  saveFileToCache = async () => {
    const { name, binaryBuffer } = this.state.attachmentDetails;
    const dirPath = this.getCacheDirPath();
    const filePath = path.join(dirPath, name);
    try {
      await this.prepareUserCacheDirectory(dirPath);
      await this.saveToFile(filePath, binaryBuffer);
    } catch (error) {
      throw new Error('There were problems with downloading the file.');
    }
  };

  getCacheDirPath = () => {
    const login = 'barty-boy'; // :-) need to get back to this !
    return path.join('file-cache', login);
  };

  saveToFile = (filePath, binaryBuffer) => {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, binaryBuffer, (err) => {
        if (err) reject();
        this.setState('downloadPath', filePath);
        resolve();
      });
    });
  };

  prepareUserCacheDirectory = async (dirPath) => {
    const dirExists = await this.checkDirExistence(dirPath);
    if (!dirExists) {
      await this.createDir(dirPath);
    }
    this.setState({ dirPath });
  };

  checkDirExistence = async (dirPath) => {
    try {
      const lstat = await fs.promises.lstat(dirPath);
      return lstat.isDirectory();
    } catch {
      return false;
    }
  };

  sendFile = () => {
    const { response, downloadPath } = this.state;

    response.download(downloadPath, (err) => {
      if (err) throw new Error('There were problems with downloading the file.');
    });
  };

  streamFile = () => {
    const { binaryBuffer, response } = this.state;
    const { name, mimetype } = this.state.attachmentDetails;
    const readStream = new PassThrough();
    readStream.end(binaryBuffer);
    response.set('Content-disposition', 'attachment; filename=' + name);
    response.set('Content-type', mimetype);
    readStream.pipe(response);
  };
}

module.exports = new GetAttachment(ServiceEmitter, DatabaseController, options);
