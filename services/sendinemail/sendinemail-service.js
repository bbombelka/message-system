const SendInEmailHelper = require('./sendinemail-helper');
const ServiceHelper = require('../service-helper');
const nodemailer = require('nodemailer');
const ServiceEmitter = require('../event-emitter');

class SendInEmail {
  constructor() {
    this.state = {
      error: false,
    };
  }
  service = (request, response) => {
    const { body } = request;
    const bodyHasContent = Object.keys(body).length > 0;
    this.state = {};
    this.state = { ...this.state, ...body, request, response };

    if (bodyHasContent) {
      this.processRequest();
    } else response.status(500);
  };

  processRequest = () => {
    this.checkRef();
    const { refIsValid } = this.state;

    if (refIsValid) {
      const content = this.getEmailContent();
      this.sendEmail(content);
    } else {
      this.state = { ...this.state, responseBody: 'Invalid reference', error: true };
      ServiceEmitter.emit('processing-finished');
    }
  };

  checkRef = () => {
    const { ref } = this.state;
    const messagesDb = ServiceHelper.getDbData('messages');
    const filteredMessageObj = messagesDb.filter(messObj => messObj.ref === ref);
    filteredMessageObj.length > 0
      ? (this.state = { ...this.state, refIsValid: true, filteredMessageObj })
      : (this.state = { ...this.state, refIsValid: false });
  };

  getEmailContent = () => {
    const { filteredMessageObj } = this.state;
    return SendInEmailHelper.getEmailBody(filteredMessageObj[0].msgs);
  };

  sendEmail = async content => {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'tomas.crist@ethereal.email',
          pass: 'vdW4j9ZafShmeNydJr',
        },
      });

      const emailOptions = await transporter.sendMail({
        from: 'tomas.crist@ethereal.email',
        to: 'bardelik@o2.pl',
        subject: 'Wiadomości z wątku',
        html: content,
      });

      transporter.sendMail(emailOptions, async (error, info) => {
        if (error) throw error;
        const responseInfo = await info;
        this.prepareResponse(responseInfo);
      });
    } catch (error) {
      throw error;
    }
  };

  prepareResponse = responseInfo => {
    const url = nodemailer.getTestMessageUrl(responseInfo);
    const responseBody = { url };
    this.state = { ...this.state, responseBody };
    ServiceEmitter.emit('processing-finished');
  };

  respond = () => {
    const { responseBody, response, error } = this.state;
    error
      ? response.status(404).json(ServiceHelper.formatErrorResponse(responseBody))
      : response.json(ServiceHelper.formatResponse(responseBody));
  };
}

const sendInEmailService = new SendInEmail();

module.exports = sendInEmailService;

ServiceEmitter.on('processing-finished', sendInEmailService.respond);
