const Service = require('../../common/service');
const SendInEmailHelper = require('./sendinemail-helper');
const ServiceHelper = require('../service-helper');
const ServiceEmitter = require('../event-emitter');
const nodemailer = require('nodemailer');
const path = require('path');

class NewSendInEmail extends Service {
  constructor(serviceEmitter, { prefix }) {
    super(serviceEmitter);
    this.setState('options', { ...this.state.options, prefix });
    this.attachListeners();
  }

  processRequest = () => {
    this.checkRef();
    const { refIsValid } = this.state;

    if (refIsValid) {
      const content = this.getEmailContent();
      this.sendEmail(content);
    } else {
      this.finishProcessWithError('Invalid reference.');
    }
  };

  checkRef = () => {
    const { ref } = this.state.requestBody;
    const messagesDb = ServiceHelper.getDbData('messages');
    const filteredMessageObj = messagesDb.filter(messObj => messObj.ref === ref);
    filteredMessageObj.length > 0
      ? this.setState({ refIsValid: true, filteredMessageObj })
      : this.setState('refIsValid', false);
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
          user: 'hollis8@ethereal.email',
          pass: 'qqkPyKVV8VhbS5n94V',
        },
      });
      const emailOptions = await transporter.sendMail({
        from: 'hollis8@ethereal.email',
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
    this.setState('responseBody', { url });
    this.emitEvent('processing-finished');
  };
}

const options = {
  prefix: path.basename(__filename, '.js'),
};

module.exports = new NewSendInEmail(ServiceEmitter, options);
