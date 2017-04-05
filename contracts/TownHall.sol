pragma solidity ^0.4.4;

contract TownHall {

  /*
   * stopped bool for "Pausable"
   * Abstract contract that allows children to implement an
   * emergency stop mechanism.
   *from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/lifecycle/Pausable.sol
   */
   bool public stopped;

   address public sheriff;

   //config
   uint public minChasePrice;
   uint public maxChasePrice;
   uint public minWasteChaseDuration;
   uint public maxWasteChaseDuration;
   uint public maxWasteChaseByUser;

   function TownHall(){
     sheriff = msg.sender;
   }

   modifier stopInEmergency {
     if (!stopped) {
       _;
     }
   }

   modifier onlyInEmergency {
     if (stopped) {
       _;
     }
   }

   modifier onlySheriff() {
     if(msg.sender != sheriff){
       throw;
     }
     _;
   }

   // called by the owner on emergency, triggers stopped state
   function emergencyStop() external onlySheriff {
     stopped = true;
   }

   // called by the owner on end of emergency, returns to normal state
   function release() external onlySheriff onlyInEmergency {
     stopped = false;
   }


   function modifyMaxWasteChaseByUser(uint _newMaxWasteChaseByUser) onlySheriff {
     if(_newMaxWasteChaseByUser == 0) throw;
     maxWasteChaseByUser=_newMaxWasteChaseByUser;
   }

   function modifyChasePriceLimit(uint _newMinChasePrice,uint _newMaxChasePrice) onlySheriff {
     if(_newMinChasePrice == 0) throw;
     if(_newMaxChasePrice == 0) {throw;}
     if(_newMaxChasePrice < _newMinChasePrice) throw;
     minChasePrice=_newMinChasePrice;
     maxChasePrice=_newMaxChasePrice;
   }

   function modifyChaseDurationLimit(uint _newMinWasteChaseDuration,uint _newMaxWasteChaseDuration) onlySheriff {
     if(_newMinWasteChaseDuration == 0) throw;
     if(_newMaxWasteChaseDuration == 0) {throw;}
     if(_newMaxWasteChaseDuration < _newMinWasteChaseDuration) throw;
     minWasteChaseDuration=_newMinWasteChaseDuration;
     maxWasteChaseDuration=_newMaxWasteChaseDuration;
   }

   function transferOwnership(address newSheriff) onlySheriff() {
     if(newSheriff != address(0)){
       sheriff=newSheriff;
     }
   }

   function kill() onlySheriff {
      selfdestruct(sheriff);
   }

}
