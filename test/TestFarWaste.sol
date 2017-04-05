pragma solidity ^0.4.2;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/FarWaste.sol";

contract TestFarWaste {

  function testInitialBalanceUsingDeployedContract() {
    FarWaste meta = FarWaste(DeployedAddresses.FarWaste());

    uint expected = 0;

    Assert.equal(expected, expected, "Test TODO");
  }

}
