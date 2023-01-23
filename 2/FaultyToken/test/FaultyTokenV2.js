const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ftx, fmtFtx, DEFAULT_ADMIN_ROLE, CFO_ROLE, ack } = require('../lib/ftx');

const NON_ADMIN_NON_CFO_ROLE = '0xa3096443b30f1eec162a8cf66862cf662a85fd0e4fd35a824b183bfeac968c31';

describe("FaultyTokenV2", function () {

  async function vanilla() {
    const [owner, acc1, acc2] = await ethers.getSigners();
    const FaultyTokenV2 = await ethers.getContractFactory("FaultyTokenV2");

    const ft = await upgrades.deployProxy(FaultyTokenV2, [], {
      initializer: "initialize",
    });

    await ft.deployed();

    return { ft, owner, acc1, acc2 };
  }

  describe("Deployment", function () {

    it("Should be properly initialized", async function () {
      const { ft, owner, acc1 } = await loadFixture(vanilla);

      expect(await ft.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
      expect(await ft.hasRole(CFO_ROLE, owner.address)).to.equal(false);
      expect(await ft.hasRole(DEFAULT_ADMIN_ROLE, acc1.address)).to.equal(false);
      expect(await ft.hasRole(CFO_ROLE, acc1.address)).to.equal(false);
      expect(await ft.decimals()).to.equal(18);
      expect(await ft.DEFAULT_ADMIN_ROLE()).to.equal(DEFAULT_ADMIN_ROLE);
      expect(await ft.CFO_ROLE()).to.equal(CFO_ROLE);
      expect(await ft.name()).to.equal("FaultyToken");
      expect(await ft.symbol()).to.equal("FTX");
      expect(await ft.totalSupply()).to.equal(0);
      expect(await ft.paused()).to.equal(false);
    });

    it("Should prevent double initialization", async function () {
      const { ft } = await loadFixture(vanilla);
      await expect(ft.initialize().then(ack)).to.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Should prevent non-admins from performing admin tasks", async function () {
      const { ft, owner, acc1, acc2 } = await loadFixture(vanilla);
      
      expect(await ft.hasRole(DEFAULT_ADMIN_ROLE, acc1.address)).to.equal(false);
      await expect(ft.connect(acc1).pause().then(ack)).to.be.revertedWith("Not authorised.");
      await expect(ft.connect(acc1).unpause().then(ack)).to.be.revertedWith("Not authorised.");
      await expect(ft.connect(acc1).grantRole(DEFAULT_ADMIN_ROLE, acc2.address).then(ack)).to.be.reverted;
      await expect(ft.connect(acc1).revokeRole(DEFAULT_ADMIN_ROLE, owner.address).then(ack)).to.be.reverted;
      await expect(ft.connect(acc1).renounceRole(DEFAULT_ADMIN_ROLE, owner.address).then(ack)).to.be.reverted;
    });

    it("Should prevent any roles other than admin and cfo from being granted", async function () {
      const { ft, owner, acc1 } = await loadFixture(vanilla);
      await expect(ft.grantRole(NON_ADMIN_NON_CFO_ROLE, acc1.address).then(ack)).to.be.revertedWith('Invalid role.');
    });

    it("Should allow admins to perform admin tasks", async function () {
      const { ft, owner, acc1 } = await loadFixture(vanilla);

      expect(await ft.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
      expect(await ft.hasRole(DEFAULT_ADMIN_ROLE, acc1.address)).to.equal(false);

      await expect(ft.grantRole(DEFAULT_ADMIN_ROLE, acc1.address).then(ack)).to.not.be.reverted;
      expect(await ft.hasRole(DEFAULT_ADMIN_ROLE, acc1.address)).to.equal(true);
      await expect(ft.revokeRole(DEFAULT_ADMIN_ROLE, acc1.address).then(ack)).to.not.be.reverted;
      expect(await ft.hasRole(DEFAULT_ADMIN_ROLE, acc1.address)).to.equal(false);
      await expect(ft.grantRole(DEFAULT_ADMIN_ROLE, acc1.address).then(ack)).to.not.be.reverted;
      expect(await ft.hasRole(DEFAULT_ADMIN_ROLE, acc1.address)).to.equal(true);

      await expect(ft.connect(acc1).revokeRole(DEFAULT_ADMIN_ROLE, owner.address).then(ack)).to.not.be.reverted;
      expect(await ft.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(false);
      await expect(ft.pause().then(ack)).to.be.revertedWith('Not authorised.');

      // enforce existence of at least one admin
      await expect(ft.connect(acc1).revokeRole(DEFAULT_ADMIN_ROLE, acc1.address).then(ack)).to.be.revertedWith('Admins are not allowed to renounce their own admin role.');
      await expect(ft.connect(acc1).renounceRole(DEFAULT_ADMIN_ROLE, acc1.address).then(ack)).to.be.revertedWith('Operation not permitted.');
    });

    it("Should prevent non-cfos from performing cfo tasks", async function () {
      const { ft, owner, acc1 } = await loadFixture(vanilla);

      expect(await ft.hasRole(CFO_ROLE, owner.address)).to.equal(false);
      await expect(ft.mint(acc1.address, 1).then(ack)).to.be.revertedWith('Not authorised.');
      await expect(ft.burn(acc1.address, 1).then(ack)).to.be.revertedWith('Not authorised.');
    });

    it("Should allow cfos to perform cfo tasks", async function () {
      const { ft, owner, acc1 } = await loadFixture(vanilla);

      expect(await ft.hasRole(CFO_ROLE, acc1.address)).to.equal(false);
      await expect(ft.grantRole(CFO_ROLE, acc1.address).then(ack)).to.not.be.reverted;
      expect(await ft.hasRole(CFO_ROLE, acc1.address)).to.equal(true);

      await expect(ft.connect(acc1).mint(owner.address, 1).then(ack)).to.not.be.reverted;
      expect(await ft.balanceOf(owner.address)).to.equal(1);
      expect(await ft.totalSupply()).to.equal(1);
      await expect(ft.connect(acc1).burn(owner.address, 1).then(ack)).to.not.be.reverted;
      expect(await ft.balanceOf(owner.address)).to.equal(0);
      expect(await ft.totalSupply()).to.equal(0);
    });

    it("Should force transactions to adhere to sensible limits", async function () {
      const { ft, owner, acc1, acc2 } = await loadFixture(vanilla);
      await ft.grantRole(CFO_ROLE, acc1.address).then(ack);
      await expect(ft.connect(acc1).burn(owner.address, 1).then(ack)).to.be.revertedWith('ERC20: burn amount exceeds balance');
      await expect(ft.connect(acc1).mint(owner.address, ftx('10000')).then(ack)).to.be.revertedWith('Transfer is too large.');
      await expect(ft.connect(acc1).mint(owner.address, ftx('9000')).then(ack)).to.not.be.reverted;
      await expect(ft.connect(acc1).mint(owner.address, ftx('9000')).then(ack)).to.not.be.reverted;
      expect(await ft.balanceOf(owner.address)).to.equal(ftx('18000'));
      expect(await ft.totalSupply()).to.equal(ftx('18000'));
      await expect(ft.connect(acc1).burn(owner.address, ftx('20000')).then(ack)).to.be.revertedWith('Transfer is too large.');
      await ft.approve(acc2.address, ftx('20000')).then(ack);
      await expect(ft.connect(acc2).transferFrom(owner.address, acc2.address, ftx('20000')).then(ack)).to.be.revertedWith('Transfer is too large.');
      await ft.connect(acc2).transferFrom(owner.address, acc2.address, ftx('9000')).then(ack)
      await ft.connect(acc2).transferFrom(owner.address, acc2.address, ftx('9000')).then(ack)
      await expect(ft.connect(acc2).transferFrom(owner.address, acc2.address, '1').then(ack)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it("Should prevent admins from becoming cfos and vice versa", async function () {
      const { ft, owner, acc1, acc2 } = await loadFixture(vanilla);

      await expect(ft.grantRole(CFO_ROLE, owner.address).then(ack)).to.be.revertedWith('An account cannot be both an admin and a CFO.');
      ft.grantRole(DEFAULT_ADMIN_ROLE, acc1.address).then(ack);
      await expect(ft.connect(acc1).grantRole(CFO_ROLE, owner.address).then(ack)).to.be.revertedWith('An account cannot be both an admin and a CFO.');
      ft.grantRole(CFO_ROLE, acc2.address).then(ack);
      await expect(ft.grantRole(DEFAULT_ADMIN_ROLE, acc2.address).then(ack)).to.be.revertedWith('An account cannot be both an admin and a CFO.');
    });

    it("Should prevent transactions when the contract is paused", async function () {
      const { ft, owner, acc1 } = await loadFixture(vanilla);

      await ft.grantRole(CFO_ROLE, acc1.address).then(ack);
      await ft.connect(acc1).mint(owner.address, 1).then(ack);
      await ft.pause().then(ack);
      await expect(ft.connect(acc1).mint(owner.address, 1).then(ack)).to.be.revertedWith('ERC20Pausable: token transfer while paused');
      await expect(ft.connect(acc1).burn(owner.address, 1).then(ack)).to.be.revertedWith('ERC20Pausable: token transfer while paused');
      await expect(ft.transfer(acc1.address, 1).then(ack)).to.be.revertedWith('ERC20Pausable: token transfer while paused');
      await ft.approve(owner.address, 1).then(ack);     // should this be allowed?
      await expect(ft.transferFrom(owner.address, acc1.address, 1).then(ack)).to.be.revertedWith('ERC20Pausable: token transfer while paused');
      await ft.unpause().then(ack);
      await expect(ft.transferFrom(owner.address, acc1.address, 1).then(ack)).to.not.be.reverted;
    });
  });
});
