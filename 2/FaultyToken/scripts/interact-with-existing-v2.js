const { ethers } = require("hardhat");
const { ftx, fmtFtx, DEFAULT_ADMIN_ROLE, CFO_ROLE, ack } = require("../lib/ftx");

const CodeChallengeProxy = '0x1EDC21c25B2b5ae396637f028f4fFea831F4eDd9';

async function main() {
  const [sebastian1, sebastian2] = await ethers.getSigners();
  const FaultyTokenV2 = await ethers.getContractFactory("FaultyTokenV2");
  console.log("Connecting to FaultyToken v2...");
  const proxy = await FaultyTokenV2.attach(CodeChallengeProxy);

  console.log('Total supply: ', fmtFtx(await proxy.totalSupply()));
  console.log("Is sebastian1 a CFO?: ", await proxy.hasRole(CFO_ROLE, sebastian1.address));
  console.log("Is sebastian2 a CFO?: ", await proxy.hasRole(CFO_ROLE, sebastian2.address));
  console.log("Is sebastian1 a DEFAULT_ADMIN?: ", await proxy.hasRole(DEFAULT_ADMIN_ROLE, sebastian1.address));
  console.log("Is sebastian2 a DEFAULT_ADMIN?: ", await proxy.hasRole(DEFAULT_ADMIN_ROLE, sebastian2.address));

  await proxy.connect(sebastian2).transfer(sebastian1.address, ftx("11000")).then(ack);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
