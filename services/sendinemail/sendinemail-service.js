const Service = require('../../common/service');
const SendInEmailHelper = require('./sendinemail-helper');
const ServiceHelper = require('../service-helper');
const DatabaseController = require('../../database/database-controller');
const CipheringHandler = require('../../common/ciphering-handler');
const ServiceEmitter = require('../event-emitter');
const nodemailer = require('nodemailer');
const path = require('path');

const options = {
  prefix: path.basename(__filename, '.js'),
};

class NewSendInEmail extends Service {
  constructor(serviceEmitter, DatabaseController, { prefix }) {
    super(serviceEmitter, DatabaseController);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
    this.setValidation('checkRef');
  }

  checkRef = () => {
    const { ref = undefined } = this.state.requestBody;

    if (!ref) {
      return this.finishProcessWithError('Reference parameter is missing.', 400);
    }

    if (ref.length !== 64) {
      return this.finishProcessWithError('Invalid reference format.', 400);
    }

    this.setState('ref', ref);
  };

  processRequest = async () => {
    try {
      this.decodeRef();
      if (!ServiceHelper.itemIsThread(this.state.type)) {
        return this.finishProcessWithError('Invalid reference', 400);
      }
      await this.getThreadMessages();
      this.createEmailContent();
      this.sendEmail();
    } catch (error) {
      this.finishProcessWithError('There has been a server error.', 500);
    }
  };

  decodeRef = () => {
    const { ref } = this.state;
    const { id, type } = CipheringHandler.decryptData(ref);
    this.setState({ id, type });
  };

  getThreadMessages = async () => {
    const { id } = this.state;
    const { messages } = await this.databaseController.getMessages({ id });
    this.setState({ messages });
  };

  createEmailContent = () => {
    const { messages } = this.state;
    this.setState({
      emailContent: SendInEmailHelper.getEmailBody(messages),
    });
  };

  sendEmail = async () => {
    const { emailContent } = this.state;
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'hollis8@ethereal.email',
          pass: 'qqkPyKVV8VhbS5n94V',
        },
      });
      const emailOptions = await transporter.sendMail({
        from: 'hollis8@ethereal.email',
        to: 'bardelik@o2.pl',
        subject: 'Wiadomości z wątku',
        html: emailContent,
      });

      transporter.sendMail(emailOptions, async (error, info) => {
        if (error) throw error;
        const responseInfo = await info;
        this.prepareResponse(responseInfo);
      });
    } catch (error) {
      this.finishProcessWithError(error);
    }
  };

  prepareResponse = responseInfo => {
    const url = nodemailer.getTestMessageUrl(responseInfo);
    this.setState('responseBody', { url });
    this.emitEvent('processing-finished');
  };
}

module.exports = new NewSendInEmail(ServiceEmitter, DatabaseController, options);
