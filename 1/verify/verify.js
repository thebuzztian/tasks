const { verify } = require('./cryptoUtil');
const { computeBlockHash, computeDataHash } = require('./blockUtil.js');
const fs = require('fs');
const axios = require('axios');
const url = require('url');
const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");

const UOBTrusteeId = 'trustee_cf9dbd0b7df4a898'
const UOBVerificationKey = fs.readFileSync('./uob-verification-key.pub');
const VerificationDepth = 10;


require('dotenv').config()   // load credentials from environment variables


// check the signature of an attestation
function verifyRecord(r){
  const trusteeId = r.trusteeId.S;
  const signature = r.signature.M;
  const meta = signature.signerMetadata.M;
  const metaId = meta.id.S;
  const metaRole = meta.role.S;
  const signedDigest = signature.payload.S;
  const digest = r.ledgerDigest.S;

  if(metaRole !== 'Trustee'){
    throw new Error(`Unexpected role "${metaRole}!"`);
  }

  if(trusteeId !== metaId){
    throw new Error('Trustee Ids differ!');
  }

  if (!verify(digest, UOBVerificationKey, signedDigest)) {
    throw new Error(`Invalid signature for digest "${digest}"!`);
  }

  console.log(`Signature for digest "${digest}" is valid.`)

  console.log('Checking block consistency...');
  const digestObj = JSON.parse(digest);
  verifyBlockConsistency(VerificationDepth, digestObj.currentHash, digestObj.height, digestObj.ledgerId);
}


// fetch block information through the PAD API
function fetchBlocks(padInstance, startBlockHeight) {
  const params = new url.URLSearchParams({ oldBlockHeight: startBlockHeight, padInstance: padInstance });

  return axios({
    method: 'get',
    url: `https://places.padprotocol.org/v0/data-requests/?${params}`,
    headers: { 'x-api-key': process.env.X_API_KEY },
  });
}


// verify that the block information is consistent
function verifyBlockConsistency(depth, hash, height, padInstance){
  fetchBlocks(padInstance, height - depth).then((res) => {
    const blocks = res.data.blocks;
    for (let i = 0; i < depth; i++){
      const previousHeight = height - i - 1;
      if(previousHeight < 0){
        break;
      }
      const previousBlock = blocks[previousHeight];
      const previousHeader = previousBlock.header;
      if(Object.hasOwn(previousBlock, 'data')){
        console.log(`Checking data hashes for block ${previousHeight} ...`);
        const computedDataHash = computeDataHash(previousBlock.data.data).toString('hex');
        const previousDataHash = previousHeader.dataHash;
        if(computedDataHash !== previousDataHash){
          throw new Error("Data hashes differ!");
        }
      }
      const previousBlockHash = computeBlockHash(previousHeader).toString('hex');
      console.log(`Checking block hash for block ${previousHeight} ...`);
      if(hash !== previousBlockHash){
        throw new Error("Block hashes differ!");
      }
      hash = previousHeader.previousHash;
    }
    console.log(`Blocks consistent up to depth ${depth}.`);
  });
}


// connect to DynamoDB and check UOB's records
const ddb = new DynamoDBClient({ region: 'eu-central-1' });

const queryParams = {
  KeyConditionExpression: "trusteeId = :s",
  ExpressionAttributeValues: {
    ":s": { S: UOBTrusteeId },
  },
  ProjectionExpression: "trusteeId, signature, ledgerDigest",
  TableName: "pad-places_attestations",
};

ddb.send(new QueryCommand(queryParams)).then(
  (data) => {
    data.Items.forEach(verifyRecord);
  },
  (error) => {
    throw new Error(`Failed to fetch data: "${error.__type}"!`);
  }
);
