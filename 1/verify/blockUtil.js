const asn1 = require('asn1.js');
const cryptoUtil = require('./cryptoUtil');

/**
 * @typedef {Object} Header
 * @property {string|number} [number]
 * @property {string|Buffer} [previousHash]
 * @property {string|Buffer} dataHash
 */
/**
 * @param {Header} header
 * @return {Buffer}
 */
function computeBlockHash(header) {
  const body = function() {
    this.seq().obj(
      this.key('number').int(),
      this.key('previousHash').octstr(),
      this.key('dataHash').octstr(),
    );
  };
  const headerAsn1 = asn1.define('headerAsn1', body);
  let {number, previousHash, dataHash} = header;
  if (previousHash == null) {
    previousHash = '';
  }
  if (typeof(number) !== 'number') {
    number = parseInt(number);
  }
  if (!Buffer.isBuffer(previousHash)) {
    previousHash = Buffer.from(previousHash, 'hex');
  }
  if (!Buffer.isBuffer(dataHash)) {
    dataHash = Buffer.from(dataHash, 'hex');
  }
  const encoded = headerAsn1.encode({
    number,
    previousHash,
    dataHash,
  });
  const hash = cryptoUtil.hash(encoded);
  return hash;
}
exports.computeBlockHash = computeBlockHash;


/**
 * @param {string[]} data
 * @return {Buffer}
 */
function computeDataHash(data) {
  const dataArray = data.map((d) => {
    return Buffer.from(d, 'base64');
  });
  return cryptoUtil.hash(...dataArray);
}

exports.computeDataHash = computeDataHash;
