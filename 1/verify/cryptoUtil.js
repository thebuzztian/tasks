// cryptoUtil.js
const crypto = require('crypto');

const EPHEMERAL_KEY_SIZE = 16;

/**
 * @typedef {Object} SymCiphertext
 * @property {string} ciphertext
 * @property {string} iv
 */
/**
 * @typedef {Object} HybridCiphertext
 * @property {SymCiphertext} encryptedMessage
 * @property {string} encryptedEphemeralKey
 */

/**
 * @param {object} options
 * @param {Object.<string, crypto.KeyObject>}
 */
exports.generateSigningKeyPair = (options={type: 'ec', namedCurve:'prime256v1'}) => {
  return crypto.generateKeyPairSync(options.type, options);
}

/**
 * @param {Buffer} data
 * @param {Buffer} symKey
 * @param {string} algorithm
 * @return {SymCiphertext}
 */
function encryptSym(data, symKey, algorithm='aes-128-cbc') {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, symKey, iv);
  let ciphertext = cipher.update(data);
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
  };
}
exports.encryptSym = encryptSym;

/**
 * @param {SymCiphertext} ciphertext
 * @param {symKey} string
 * @param {string} algorithm
 * @return {Buffer}
 */
function decryptSym(ciphertext, symKey, algorithm) {
  const iv = Buffer.from(ciphertext.iv, 'base64');
  const decipher = crypto.createDecipheriv(algorithm, symKey, iv);
  let data = decipher.update(Buffer.from(ciphertext.ciphertext, 'base64'));
  data = Buffer.concat([data, decipher.final()]);
  return data;
}
exports.decryptSym = decryptSym;

/**
 * @param {Buffer} data
 * @param {crypto.KeyLike} encKey
 * @return {Buffer | HybridCiphertext} the ciphertext as a bytes string
 */
function encryptAsym(data, encKey) {
  try {
    return crypto.publicEncrypt(encKey, data);
  } catch (err) {
    if (err.code === 'ERR_OSSL_RSA_DATA_TOO_LARGE_FOR_KEY_SIZE') {
      // avoid infinite recursive calls
      if (data.length <= EPHEMERAL_KEY_SIZE) {
        throw new Error('Ephemeral key size is too large for the encryption key type');
      }
      return encryptHybrid(data, encKey);
    }
    throw err;
  }
}
exports.encryptAsym = encryptAsym;

/**
 * @param {Buffer | HybridCiphertext} ciphertext
 * @param {crypto.KeyLike} decKey
 * @return {Buffer}
 */
function decryptAsym(ciphertext, decKey) {
  if (Buffer.isBuffer(ciphertext)) {
    return crypto.privateDecrypt(decKey, ciphertext);
  }
  return decryptHybrid(ciphertext, decKey);
}
exports.decryptAsym = decryptAsym;

/**
 * @param {Buffer} data
 * @param {crypto.KeyLike} encKey
 * @return {HybridCiphertext}
 */
function encryptHybrid(data, encKey) {
  const ephemeralKey = crypto.randomBytes(EPHEMERAL_KEY_SIZE);
  const encryptedMessage = encryptSym(data, ephemeralKey);
  const encryptedEphemeralKey = encryptAsym(ephemeralKey, encKey).toString('base64');
  // encryptedEphemeralKey must be returned by crypto.publicEncrypt, i.e. a Buffer
  return { encryptedMessage, encryptedEphemeralKey };
}
exports.encryptHybrid = encryptHybrid;

/**
 * @param {HybridCiphertext} ciphertext
 * @param {crypto.KeyLike} decKey
 * @return {Buffer}
 */
function decryptHybrid(ciphertext, decKey) {
  const encryptedEphemeralKey = Buffer.from(ciphertext.encryptedEphemeralKey, 'base64');
  const ephemeralKey = decryptAsym(encryptedEphemeralKey, decKey);
  const {encryptedMessage} = ciphertext;
  const data = decryptSym(encryptedMessage, ephemeralKey);
  return data;
}
exports.decryptHybrid = decryptHybrid;

/**
 * @param {string | Buffer} data
 * @param {crypto.KeyLike} signingKey
 * @param {string} algorithm
 * @return {Buffer}
 */
function sign(data, signingKey, algorithm='SHA256') {
  const sign = crypto.createSign(algorithm);
  sign.update(data);
  sign.end();
  const signature = sign.sign(signingKey);
  return signature;
}
exports.sign = sign;

/**
 * @param {string | Buffer} data
 * @param {crypto.KeyLike} verificationKey 
 * @param {string | Buffer} signature
 * @param {string} algorithm
 * @return {boolean}
 */
function verify(data, verificationKey, signature, algorithm='SHA256') {
  if (typeof signature === 'string') {
    signature = Buffer.from(signature, 'base64');
  }
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  verify.end();
  const verification = verify.verify(verificationKey, signature);
  return verification;
};
exports.verify = verify;

/**
 * @param {...(string | Buffer)} data
 * @return {Buffer}
 */
function hash(...data) {
  const sha256 = crypto.createHash('sha256');
  for (const d of data) {
    sha256.update(d);
  }
  return sha256.digest();
}
exports.hash = hash;

/**
 * @param {Buffer} a
 * @param {Buffer} b
 * @return {Buffer}
 */
function xor(a, b) {
  assert(a.length === b.length);
  const result = a.map((byte, i) => byte ^ b[i]);
  return Buffer.from(result);
}
exports.xor = xor;
