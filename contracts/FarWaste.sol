pragma solidity ^0.4.4;
import "./TownHall.sol";
import "./PullPayment.sol";

contract FarWaste is TownHall, PullPayment {

  uint numWasteChases;

  enum WasteChaseStatus {CREATED,CHASED,SHOOT,CANCEL,EXPIRED}

  struct WasteChase {
     WasteChaseStatus wasteChaseStatus;
     uint chasePrice;
     uint chaseExpiredTime;
     string chaseDescription;
     address wasteHunter;
     address wasteOwner;
  }

  mapping(uint => WasteChase) private wasteChases;
  mapping(address => uint) private wasteChasesCountByUser;
  uint[] private wasteChaseIds;


  function getWasteChase(uint wasteChaseId)
  		constant
  		returns (WasteChaseStatus wasteChaseStatus,uint chasePrice, uint chaseExpiredTime,string chaseDescription,address wasteHunter,address wasteOwner) {
  		WasteChase aWasteChase = wasteChases[wasteChaseId];
  		return (
        aWasteChase.wasteChaseStatus,
  			aWasteChase.chasePrice,
  			aWasteChase.chaseExpiredTime,
        aWasteChase.chaseDescription,
        aWasteChase.wasteHunter,
        aWasteChase.wasteOwner
        );
  }

  function getMyWasteChasesCount() constant returns (uint length) {
    return wasteChasesCountByUser[msg.sender];
  }

  function getWasteChasesCount() constant returns (uint length) {
    return wasteChaseIds.length;
  }

  function FarWaste(uint _minChasePrice,uint _maxChasePrice,uint _minWasteChaseDuration,uint _maxWasteChaseDuration,uint _maxWasteChaseByUser) {

     modifyChasePriceLimit(_minChasePrice,_maxChasePrice);
     modifyChaseDurationLimit(_minWasteChaseDuration,_maxWasteChaseDuration);
     modifyMaxWasteChaseByUser(_maxWasteChaseByUser);

	}


  /**
   I- createWasteChase
   reputation +
  **/
  function createWasteChase (uint _chasePrice, string _chaseDescription,uint _wasteChaseDuration) stopInEmergency returns (bool successful){
    if(numWasteChases + 1 < numWasteChases) throw; //overflow ?
    if(_wasteChaseDuration > maxWasteChaseDuration ) throw;
    if(_wasteChaseDuration < minWasteChaseDuration ) throw;
    if(_chasePrice < minChasePrice ) throw;
    if(_chasePrice > maxChasePrice ) throw;
    if(wasteChasesCountByUser[msg.sender] >= maxWasteChaseByUser ) throw;

    uint wasteChaseId = numWasteChases++;

    wasteChases[wasteChaseId] = WasteChase({
                                wasteChaseStatus:WasteChaseStatus.CREATED,
                          			chasePrice:_chasePrice,
                          			chaseExpiredTime: now+_wasteChaseDuration,
                                chaseDescription:_chaseDescription,
                                wasteHunter:address(0),
                                wasteOwner:msg.sender
                          		  });
    wasteChasesCountByUser[msg.sender] += 1;
    wasteChaseIds.push(wasteChaseId);
    return true;
  }

  /**
   II- chaseAWaste
   reputation +
  **/
  function chaseAWaste(uint wasteChaseId) payable stopInEmergency returns (bool successful){
     if (wasteChases[wasteChaseId].wasteChaseStatus != WasteChaseStatus.CREATED) throw;//nothing at this id wasteChaseId

     if (wasteChases[wasteChaseId].wasteOwner == wasteChases[wasteChaseId].wasteHunter ) throw; //waste chase already done

     if (wasteChases[wasteChaseId].chasePrice != msg.value) throw;

     if (wasteChases[wasteChaseId].wasteOwner == msg.sender) throw;

     if (wasteChases[wasteChaseId].wasteHunter != address(0)) throw;//someone already chase this waste

     if (wasteChases[wasteChaseId].chaseExpiredTime < now) throw;

     wasteChases[wasteChaseId].wasteHunter = msg.sender;
     wasteChases[wasteChaseId].wasteChaseStatus= WasteChaseStatus.CHASED;

     return true;
  }

  /**
   IIIa- shootAWaste
    reputation ++
  **/
  function shootAWaste(uint wasteChaseId,string wasteChaseIdString, bytes32 hash, uint8 v, bytes32 r, bytes32 s) stopInEmergency returns (address successful){
    if (wasteChases[wasteChaseId].wasteChaseStatus != WasteChaseStatus.CHASED) throw;//nothing at this id wasteChaseId
    if (wasteChases[wasteChaseId].chasePrice > this.balance ) throw; //sanity check
    if (wasteChases[wasteChaseId].wasteOwner != msg.sender) throw;
    if (wasteChases[wasteChaseId].wasteOwner == address(0)) throw;
    address recoverAddress =ecrecover(hash, v, r, s);
    if (recoverAddress == address(0)) throw;
    if (wasteChases[wasteChaseId].wasteOwner == recoverAddress) throw;
    if (wasteChases[wasteChaseId].wasteHunter != recoverAddress) throw;//it is not your chased waste
    if (sha3(wasteChaseIdString) != hash) throw;
    //check expired or not ?

    address wasteOwnerToSent = wasteChases[wasteChaseId].wasteOwner;
    //change waste ownership
    wasteChases[wasteChaseId].wasteOwner = recoverAddress;
    wasteChasesCountByUser[msg.sender] -= 1;
    wasteChases[wasteChaseId].wasteChaseStatus=WasteChaseStatus.SHOOT;
    //process async payement
    asyncSend(wasteOwnerToSent,wasteChases[wasteChaseId].chasePrice);

    return recoverAddress;
  }
  /**
   IIIb- cancelAChasedWaste
   reputation -
  **/
  function cancelAChasedWaste(uint wasteChaseId) stopInEmergency returns (bool successful){
     if (wasteChases[wasteChaseId].wasteChaseStatus != WasteChaseStatus.CHASED) throw;//nothing at this id wasteChaseId

     if (wasteChases[wasteChaseId].wasteOwner == wasteChases[wasteChaseId].wasteHunter ) throw; //waste chase already done

     if (wasteChases[wasteChaseId].wasteOwner == msg.sender) throw;

     if (wasteChases[wasteChaseId].wasteHunter != msg.sender) throw; // you can't cancel. you have not chase it

     if (wasteChases[wasteChaseId].chaseExpiredTime < now) throw;//to late to cancel. incentive to respect your engagement to the wasteOwner. or if you have difficulty to meet the wasteOwner cancel it before the expired time...

     wasteChases[wasteChaseId].wasteHunter = address(0);//make it available to other wastehunter again

     wasteChases[wasteChaseId].wasteChaseStatus=WasteChaseStatus.CREATED;

     if (wasteChases[wasteChaseId].chasePrice > this.balance ) throw; //sanity check
     //refund your previous deposit
     asyncSend(msg.sender,wasteChases[wasteChaseId].chasePrice);

     return true;
  }
  /**
   IIIc- cancelACreatedWasteChase
   reputation --
  **/
  function cancelACreatedWasteChase(uint wasteChaseId) stopInEmergency returns (bool successful){
     if (wasteChases[wasteChaseId].wasteChaseStatus == WasteChaseStatus.SHOOT) throw;
     if (wasteChases[wasteChaseId].wasteChaseStatus == WasteChaseStatus.CANCEL) throw;
     if (wasteChases[wasteChaseId].wasteChaseStatus == WasteChaseStatus.EXPIRED) throw;

     if (wasteChases[wasteChaseId].wasteOwner == wasteChases[wasteChaseId].wasteHunter ) throw; //waste chase already done

     if (wasteChases[wasteChaseId].wasteOwner != msg.sender) throw; //only the wasteOwner can cancel it

     if (wasteChases[wasteChaseId].chaseExpiredTime < now) throw;//to late to cancel.

     if ((wasteChases[wasteChaseId].wasteChaseStatus == WasteChaseStatus.CHASED) && (wasteChases[wasteChaseId].wasteHunter !=  address(0))){
       // someone his chasing this waste with fund on it ... reputation ---
       //refund him
       address wasteHunterToSent = wasteChases[wasteChaseId].wasteHunter;
       wasteChases[wasteChaseId].wasteHunter = address(0);//make it available to other wastehunter again
       // change status
       wasteChases[wasteChaseId].wasteChaseStatus=WasteChaseStatus.CANCEL;
       wasteChasesCountByUser[msg.sender] -= 1;
       if (wasteChases[wasteChaseId].chasePrice > this.balance ) throw; //sanity check
       asyncSend(wasteHunterToSent,wasteChases[wasteChaseId].chasePrice);
     }else{
       wasteChases[wasteChaseId].wasteChaseStatus=WasteChaseStatus.CANCEL;
       wasteChasesCountByUser[msg.sender] -= 1;
     }
     return true;
  }

  /**
   IIIc- Terminte an expired waste chase
   reputation -
  **/
  function terminateAnExpiredWasteChase(uint wasteChaseId) stopInEmergency returns (bool successful){
     if (wasteChases[wasteChaseId].chaseExpiredTime > now) throw;//not yet expired
     if (wasteChases[wasteChaseId].wasteChaseStatus == WasteChaseStatus.SHOOT) throw;
     if (wasteChases[wasteChaseId].wasteChaseStatus == WasteChaseStatus.CANCEL) throw;
     if (wasteChases[wasteChaseId].wasteChaseStatus == WasteChaseStatus.EXPIRED) throw;

     if (wasteChases[wasteChaseId].wasteOwner == wasteChases[wasteChaseId].wasteHunter ) throw; //waste chase already done

     if (wasteChases[wasteChaseId].wasteOwner != msg.sender) throw; //only the wasteOwner temrinate an expired waste chase

     if ((wasteChases[wasteChaseId].wasteChaseStatus == WasteChaseStatus.CHASED) && (wasteChases[wasteChaseId].wasteHunter !=  address(0))){
       // someone his chasing this waste but has not come to take it or has not cancel his chase. he loose his deposit ( and reputation )
       //deposit come to the wasteOwner
       // change status
       wasteChases[wasteChaseId].wasteChaseStatus=WasteChaseStatus.EXPIRED;
       wasteChasesCountByUser[msg.sender] -= 1;
       if (wasteChases[wasteChaseId].chasePrice > this.balance ) throw; //sanity check
       asyncSend(wasteChases[wasteChaseId].wasteOwner,wasteChases[wasteChaseId].chasePrice);
     }else{
       wasteChases[wasteChaseId].wasteChaseStatus=WasteChaseStatus.EXPIRED;
       wasteChasesCountByUser[msg.sender] -= 1;
     }
     return true;
  }


}
