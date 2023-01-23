const { utils } = ethers;

function ftx(numStr) {
  return utils.parseUnits(numStr, 18);
}
exports.ftx = ftx;

function fmtFtx(bigNum) {
  return utils.formatUnits(bigNum, 18);
}
exports.fmtFtx = fmtFtx;

function ack(t){
  return t.wait();
}
exports.ack = ack;

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
exports.DEFAULT_ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

const CFO_ROLE = '0xa3096443b30f1eec162a8cf66862cf662a85fd0e4fd35a824b183bfeac968c32';
exports.CFO_ROLE = CFO_ROLE;
