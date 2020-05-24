const Service = require('../../common/service');
const ServiceEmitter = require('../event-emitter');
const path = require('path');
const DatabaseController = require('../../database/database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const fs = require('fs');
const stream = require('stream');
const config = require('../../config');

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
    const { response } = this.state;
    try {
      this.decodeRef();
      await this.prepareFile();
      if (config.cacheIsDisabled) {
        return this.streamFile();
      }
      await this.saveFileToCache();
      this.sendFile();
    } catch (error) {
      this.finishProcessWithError('There were problems with downloading the file.', 404);
    }
  };

  decodeRef = () => {
    const { ref } = this.state;
    const { id, type } = CipheringHandler.decryptData(ref);
    if (type !== 'A') {
      throw new Error('Invalid reference.');
    } else {
      this.setState({ id });
    }
  };

  prepareFile = async () => {
    const { id, ref } = this.state;
    const { bin, message_id } = await this.databaseController.getAttachment(id);
    const attachmentDetails = await this.databaseController.getAttachmentDetails(message_id, ref);
    this.setState({ attachmentDetails, binaryBuffer: bin.buffer });
  };

  saveFileToCache = async () => {
    const { name } = this.state.attachmentDetails;
    const login = 'barty-boy'; // :-)
    const dirPath = path.join('file-cache', login);
    const filePath = path.join(dirPath, name);
    try {
      await this.prepareDirectory(dirPath);
      await this.saveToFile(filePath);
    } catch (error) {
      throw new Error('There were problems with downloading the file.');
    }
  };

  saveToFile = filePath => {
    const { binaryBuffer } = this.state;
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, binaryBuffer, err => {
        if (err) reject();
        this.setState('downloadPath', filePath);
        resolve();
      });
    });
  };

  prepareDirectory = async dirPath => {
    const dirExists = await this.checkDirExistence(dirPath);
    if (!dirExists) {
      await fs.promises.mkdir(dirPath);
    }
  };

  checkDirExistence = async dirPath => {
    try {
      const lstat = await fs.promises.lstat(dirPath);
      return lstat.isDirectory();
    } catch {
      return false;
    }
  };

  sendFile = () => {
    const { response, downloadPath } = this.state;

    response.download(downloadPath, err => {
      if (err) throw new Error('There were problems with downloading the file.');
    });
  };

  streamFile = () => {
    const { binaryBuffer, response } = this.state;
    const { name, mimetype } = this.state.attachmentDetails;
    const readStream = new stream.PassThrough();
    readStream.end(binaryBuffer);
    response.set('Content-disposition', 'attachment; filename=' + name);
    response.set('Content-type', mimetype);
    readStream.pipe(response);
  };
}

module.exports = new GetAttachment(ServiceEmitter, DatabaseController, options);
