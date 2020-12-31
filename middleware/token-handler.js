const jwt = require('jsonwebtoken');
const ServiceHelper = require('../services/service-helper');
const config = require('../config');
const protectedRoutes = require('../enums/protected-routes');
const fs = require('fs');

const errorsMapper = {
  GENERIC: ['An error occured relating web token.', '010'],
  INVALID_TOKEN: ['Provided token is invalid.', '013'],
  TOKEN_EXPIRED: ['Provided token has expired.', '011'],
  MISSING_HEADER: ['Missing authorization header.', '012'],
};

class TokenHandler {
  constructor() {
    this.#prepareTokenSecret();
  }

  #getSignTokenOptions = (type) => {
    return type === 'access'
      ? [this.accessTokenSecret, { expiresIn: config.accessTokenExpirationTime }]
      : [this.refreshTokenSecret, { expiresIn: config.refreshTokenExpirationTime }];
  };

  signToken = (user, type = 'access') => {
    const options = this.#getSignTokenOptions(type);

    return new Promise((resolve, reject) => {
      jwt.sign(user, ...options, (err, token) => {
        if (err) reject(err);
        resolve(token);
      });
    });
  };

  verifyToken = async (request, response, next) => {
    if (!this.#isProtectedRoute(request.originalUrl)) {
      return next();
    }

    try {
      const token = this.#getToken(request);
      const tokenData = await this.performVerification(token);
      response.locals.tokenData = tokenData;
      next();
    } catch (error) {
      this.#handleError(error, response);
    }
  };

  #isProtectedRoute = (url) => {
    return protectedRoutes.includes(url);
  };

  #getToken = (request) => {
    if (!request.headers['authorization']) {
      throw new Error('missing header');
    }
    const token = request.headers['authorization'].split(' ')[1];
    const rule = new RegExp('[^a-z0-9._-]', 'ig');
    const tokenIsValid = !rule.test(token.trim());

    if (tokenIsValid) {
      return token;
    }

    throw new Error('invalid token');
  };

  performVerification = (token, type = 'access') => {
    const tokenSecret = type === 'access' ? this.accessTokenSecret : this.refreshTokenSecret;

    return new Promise((resolve, reject) => {
      jwt.verify(token, tokenSecret, (err, tokenData) => {
        if (err) {
          reject(err);
        }
        resolve(tokenData);
      });
    });
  };

  #handleError = (error, response) => {
    const errorMessage = this.#getErrorMessage(error);
    response.status(403).json(ServiceHelper.formatErrorResponse(...errorMessage));
  };

  #getErrorMessage = ({ message }) => {
    switch (message) {
      case 'invalid token':
        return errorsMapper.INVALID_TOKEN;
      case 'jwt expired':
        return errorsMapper.TOKEN_EXPIRED;
      case 'missing header':
        return errorsMapper.MISSING_HEADER;
      default:
        return errorsMapper.GENERIC;
    }
  };

  #prepareTokenSecret = () => {
    fs.promises
      .readFile(config.tokenSecretPath)
      .then((fileContent) => {
        const data = JSON.parse(fileContent.toString());
        this.accessTokenSecret = data['ACCESS_TOKEN_SECRET'];
        this.refreshTokenSecret = data['REFRESH_TOKEN_SECRET'];
      })
      .catch((error) => console.log(error));
  };
}

module.exports = new TokenHandler();
