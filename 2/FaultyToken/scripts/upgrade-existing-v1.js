const { ethers, upgrades } = require("hardhat");
const { erc1967 } = upgrades;
const { ftx, fmtFtx, ack, DEFAULT_ADMIN_ROLE, CFO_ROLE } = require("../lib/ftx");

const CodeChallengeProxy = '0x1EDC21c25B2b5ae396637f028f4fFea831F4eDd9';

async function main() {
  const [ code_challenge_account ] = await ethers.getSigners();

  const FaultyTokenV1 = await ethers.getContractFactory("FaultyToken");
  await upgrades.forceImport(CodeChallengeProxy, FaultyTokenV1);

  const FaultyTokenV2 = await ethers.getContractFactory("FaultyTokenV2");

  const upgraded = await upgrades.upgradeProxy(CodeChallengeProxy, FaultyTokenV2);
  await upgraded.deployed();
  console.log("Proxy upgraded!");
  console.log("Total supply: ", fmtFtx(await upgraded.totalSupply()));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
