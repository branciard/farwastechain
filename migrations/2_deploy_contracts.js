var FarWaste = artifacts.require("./FarWaste.sol");

module.exports = function(deployer) {
  deployer.deploy(FarWaste,1,2,3,4,5);

};
