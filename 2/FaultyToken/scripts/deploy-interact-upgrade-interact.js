const { ethers, upgrades } = require("hardhat");
const { erc1967 } = upgrades;
const { ftx, fmtFtx, ack, DEFAULT_ADMIN_ROLE, CFO_ROLE } = require("../lib/ftx");

async function main() {
  const [ owner, cfo ] = await ethers.getSigners();

  // deploy
  console.log("Deploying FaultyToken v1 implementation, proxy and proxy admin...");
  const gas = await ethers.provider.getGasPrice();
  const FaultyTokenV1 = await ethers.getContractFactory("FaultyToken");
  const proxy = await upgrades.deployProxy(FaultyTokenV1, [], {
    gasPrice: gas, 
    initializer: "initialize",
  });
  await proxy.deployed();

  const implAddress = await erc1967.getImplementationAddress(proxy.address);
  console.log("Implementation at: ", implAddress);

  console.log("Proxy at:", proxy.address);

  const adminAddress = await erc1967.getAdminAddress(proxy.address);
  console.log("Proxy admin at: ", adminAddress); 
  console.log('---');

  // interact
  await proxy.grantRole(CFO_ROLE, cfo.address).then(ack);
  await proxy.connect(cfo).grantRole(DEFAULT_ADMIN_ROLE, owner.address).then(ack);  // possible due to lenient permissions
  await proxy.connect(cfo).mint(owner.address, ftx('10')).then(ack);
  console.log("Pausing...");
  await proxy.pause().then(ack);

  console.log("Paused: ", await proxy.paused());
  console.log("Total supply: ", fmtFtx(await proxy.totalSupply()));
  console.log('=== Balances ===');
  console.log('Owner: ', fmtFtx(await proxy.balanceOf(owner.address)));
  console.log('CFO: ', fmtFtx(await proxy.balanceOf(cfo.address)));
  console.log('---');

  // upgrade
  console.log("Upgrading...");
  const FaultyTokenV2 = await ethers.getContractFactory("FaultyTokenV2");
  //const FaultyTokenV2Other = await FaultyTokenV2.connect(owner);
  const upgraded = await upgrades.upgradeProxy(proxy.address, FaultyTokenV2);
  await upgraded.deployed();
  console.log("Proxy upgraded at: ", upgraded.address);

  if (upgraded.address !== proxy.address)
    throw new Exception("Upgraded proxy and original proxy have a different address!");
  console.log("New proxy admin at: ", await erc1967.getAdminAddress(upgraded.address)); 
  console.log("New implementation at: ", await erc1967.getImplementationAddress(upgraded.address));
  console.log('---');

  // interact
  console.log("Paused: ", await upgraded.paused());
  console.log("Total supply: ", fmtFtx(await upgraded.totalSupply()));
  console.log('=== Balances ===');
  console.log('Owner: ', fmtFtx(await upgraded.balanceOf(owner.address)));
  console.log('CFO: ', fmtFtx(await upgraded.balanceOf(cfo.address)));
  console.log('Unpausing...');
  await upgraded.unpause().then(ack);
  console.log('Paused: ', await upgraded.paused());
  console.log('Transferring...');
  await upgraded.transfer(cfo.address, ftx('10')).then(ack);
  console.log('Owner: ', fmtFtx(await upgraded.balanceOf(owner.address)));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
