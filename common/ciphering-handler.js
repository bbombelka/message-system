const crypto = require('crypto');
const cipherEnum = require('../enums/cipher');

class CipheringHandler {
  #getCipheringParameters = () => {
    return {
      algorithm: cipherEnum.ALGORITHM.AES128,
      iv: Buffer.alloc(16, 0),
      password: cipherEnum.PASSWORD,
      salt: cipherEnum.SALT,
    };
  };

  #filterUnnecessaryKeys = dataToEnrycpt => {
    return Object.fromEntries(
      Object.entries(dataToEnrycpt).filter(([key]) => ['id', 'type'].includes(key)),
    );
  };

  #validateDataToEncrypt = data => {
    if (typeof data === 'string') {
      return data;
    }
    const dataToEncrypt = this.#filterUnnecessaryKeys(data);

    return JSON.stringify(dataToEncrypt);
  };

  #prepareDataToUse = data => {
    return JSON.parse(data);
  };

  encryptData = data => {
    const dataToEncrypt = this.#validateDataToEncrypt(data);
    const { algorithm, iv, password, salt } = this.#getCipheringParameters();
    const key = crypto.scryptSync(password, salt, 16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encryptedData = cipher.update(
      dataToEncrypt,
      cipherEnum.ENCODING.UTF8,
      cipherEnum.ENCODING.BASE64,
    );
    encryptedData += cipher.final(cipherEnum.ENCODING.BASE64);
    return encryptedData;
  };

  decryptData = encryptedData => {
    const { algorithm, iv, password, salt } = this.#getCipheringParameters();
    const key = crypto.scryptSync(password, salt, 16);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decryptedData = decipher.update(
      encryptedData,
      cipherEnum.ENCODING.BASE64,
      cipherEnum.ENCODING.UTF8,
    );
    decryptedData += decipher.final(cipherEnum.ENCODING.UTF8);
    return this.#prepareDataToUse(decryptedData);
  };

  hashPassword = (password, salt) => {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        cipherEnum.ITERATION_NUMBER,
        cipherEnum.KEY_LENGTH,
        cipherEnum.DIGEST_HASH,
        (err, derivedKeyBuffer) => {
          if (err) reject(new Error('There were problems with password hash.'));
          resolve(derivedKeyBuffer.toString(cipherEnum.ENCODING.HEX));
        },
      );
    });
  };
}

module.exports = new CipheringHandler();
