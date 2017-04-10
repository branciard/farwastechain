pragma solidity ^0.4.4;
import "./TownHall.sol";
import "./PullPayment.sol";

contract FarWaste is TownHall, PullPayment {

  uint numChases;

  enum ChaseStatus {NOTHING,CREATED,CHASED,SHOOT,CANCEL,EXPIRED}

  struct WasteChase {
     ChaseStatus status;
     uint price;
     uint expirationTime;
     bytes32 descriptionHash;
     address hunter;
     bytes32 dealPasswordFromHunterHash;
     address owner;
     bytes32 dealPasswordFromOwnerHash;
  }

  mapping(uint => WasteChase) private chases;
  mapping(address => uint) private chasesProcessingByOwner;
  mapping(address => uint) private chasesCompletedByHunter;
  uint[] private chaseIds;


  function getWasteChase(uint chaseId)
  		constant
  		returns (ChaseStatus status,uint price, uint expirationTime,bytes32 descriptionHash,address hunter,bytes32 dealPasswordFromHunterHash,address owner,bytes32 dealPasswordFromOwnerHash) {
  		WasteChase aChase = chases[chaseId];
  		return (
        aChase.status,
  			aChase.price,
  			aChase.expirationTime,
        aChase.descriptionHash,
        aChase.hunter,
        aChase.dealPasswordFromHunterHash,
        aChase.owner,
        aChase.dealPasswordFromOwnerHash
        );
  }

  function getMyProcessingWasteChasesCount() constant returns (uint length) {
    return chasesProcessingByOwner[msg.sender];
  }

  function getMyCompletedWasteChasesCount() constant returns (uint length) {
    return chasesCompletedByHunter[msg.sender];
  }

  function getWasteChasesCount() constant returns (uint length) {
    return chaseIds.length;
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
  function createWasteChase (uint _chasePrice, bytes32 _chaseDescriptionHash,uint _wasteChaseDuration,bytes32 _dealPasswordFromOwnerHash) stopInEmergency returns (bool successful){
    if(numChases + 1 < numChases) throw; //overflow ?
    if(_wasteChaseDuration > maxWasteChaseDuration ) throw;
    if(_wasteChaseDuration < minWasteChaseDuration ) throw;
    if(_chasePrice < minChasePrice ) throw;
    if(_chasePrice > maxChasePrice ) throw;
    if(chasesProcessingByOwner[msg.sender] >= maxWasteChaseByUser ) throw;
    if (_dealPasswordFromOwnerHash == 0 ) throw;

    uint chaseId = numChases++;

    chases[chaseId] = WasteChase({
                                status:ChaseStatus.CREATED,
                          			price:_chasePrice,
                          			expirationTime: now+_wasteChaseDuration,
                                descriptionHash:_chaseDescriptionHash,
                                hunter:address(0),
                                dealPasswordFromHunterHash:0,
                                owner:msg.sender,
                                dealPasswordFromOwnerHash:_dealPasswordFromOwnerHash
                          		  });
    chasesProcessingByOwner[msg.sender] += 1;
    chaseIds.push(chaseId);
    return true;
  }

  /**
   II- chaseAWaste
   reputation +
  **/
  function chaseAWaste(uint chaseId,  bytes32 _dealPasswordFromHunterHash) payable stopInEmergency returns (bool successful){
     if (chases[chaseId].status != ChaseStatus.CREATED) throw;//nothing at this id chaseId

     if (chases[chaseId].owner == chases[chaseId].hunter ) throw; //waste chase already done

     if (chases[chaseId].price != msg.value) throw;

     if (chases[chaseId].hunter != address(0)) throw;//someone already chase this waste

     if (chases[chaseId].expirationTime < now) throw;

     if (_dealPasswordFromHunterHash == 0 ) throw;

     chases[chaseId].hunter = msg.sender;
     chases[chaseId].dealPasswordFromHunterHash=_dealPasswordFromHunterHash;
     chases[chaseId].status= ChaseStatus.CHASED;

     return true;
  }

  /**
   IIIa- shootAWaste
    reputation ++
  **/
  function shootAWaste(uint chaseId,bytes32 dealPasswordFromHunter,bytes32 signedHunterHash, uint8 v, bytes32 r, bytes32 s) stopInEmergency returns (address successful){
    if (chases[chaseId].status != ChaseStatus.CHASED) throw;//nothing at this id chaseId
    if (chases[chaseId].price > this.balance ) throw; //sanity check
    if (chases[chaseId].owner != msg.sender) throw;
    if (chases[chaseId].owner == address(0)) throw;
    address recoverAddress =ecrecover(signedHunterHash, v, r, s);
    if (recoverAddress == address(0)) throw;
    if (chases[chaseId].owner == recoverAddress) throw;
    //check that the signed message is from the right hunter.
    if (chases[chaseId].hunter != recoverAddress) throw;

    //hunter must have signed the dealPasswordFromOwner, prove that hunter has receive the waste from owner.
    if (chases[chaseId].dealPasswordFromOwnerHash != sha3(signedHunterHash)) throw;

    //owner must receive the dealPasswordFromHunter, prove that owner has meet the right hunter who has sent ether and
    //dealPasswordFromHunter hash at chaseAWaste call :
    if (chases[chaseId].dealPasswordFromHunterHash != sha3(dealPasswordFromHunter)) throw;

    address ownerToSent = chases[chaseId].owner;
    //change waste ownership
    chases[chaseId].owner = recoverAddress;
    chasesProcessingByOwner[msg.sender] -= 1;
    chasesCompletedByHunter[recoverAddress] += 1;
    chases[chaseId].status=ChaseStatus.SHOOT;
    //clear it. not needed anymore.
    chases[chaseId].dealPasswordFromHunterHash=0;
    chases[chaseId].dealPasswordFromOwnerHash=0;
    //process async payement
    asyncSend(ownerToSent,chases[chaseId].price);

    return recoverAddress;
  }

  /**
   IIIb- cancelAChasedWaste
   reputation -
  **/
  function cancelAChasedWaste(uint chaseId) stopInEmergency returns (bool successful){
     if (chases[chaseId].status != ChaseStatus.CHASED) throw;//nothing at this id chaseId

     if (chases[chaseId].owner == chases[chaseId].hunter ) throw; //waste chase already done

     if (chases[chaseId].owner == msg.sender) throw;

     if (chases[chaseId].hunter != msg.sender) throw; // you can't cancel. you have not chase it

     if (chases[chaseId].expirationTime < now) throw;//to late to cancel. incentive to respect your engagement to the owner. or if you have difficulty to meet the owner cancel it before the expired time...

     chases[chaseId].hunter = address(0);//make it available to other hunter again
     chases[chaseId].dealPasswordFromHunterHash=0;

     chases[chaseId].status=ChaseStatus.CREATED;

     if (chases[chaseId].price > this.balance ) throw; //sanity check
     //refund your previous deposit
     asyncSend(msg.sender,chases[chaseId].price);

     return true;
  }
  /**
   IIIc- cancelACreatedWasteChase
   reputation --
  **/
  function cancelACreatedWasteChase(uint chaseId) stopInEmergency returns (bool successful){
     if (chases[chaseId].status == ChaseStatus.SHOOT) throw;
     if (chases[chaseId].status == ChaseStatus.CANCEL) throw;
     if (chases[chaseId].status == ChaseStatus.EXPIRED) throw;

     if (chases[chaseId].owner == chases[chaseId].hunter ) throw; //waste chase already done

     if (chases[chaseId].owner != msg.sender) throw; //only the owner can cancel it

     if (chases[chaseId].expirationTime < now) throw;//to late to cancel.

     if ((chases[chaseId].status == ChaseStatus.CHASED) && (chases[chaseId].hunter !=  address(0))){
       // someone his chasing this waste with fund on it ... reputation ---
       //refund him
       address hunterToSent = chases[chaseId].hunter;
       chases[chaseId].hunter = address(0);//make it available to other hunter again
       chases[chaseId].dealPasswordFromHunterHash=0;
       chases[chaseId].dealPasswordFromOwnerHash=0;
       // change status
       chases[chaseId].status=ChaseStatus.CANCEL;
       chasesProcessingByOwner[msg.sender] -= 1;
       if (chases[chaseId].price > this.balance ) throw; //sanity check
       asyncSend(hunterToSent,chases[chaseId].price);
     }else{
       chases[chaseId].dealPasswordFromOwnerHash=0;
       chases[chaseId].status=ChaseStatus.CANCEL;
       chasesProcessingByOwner[msg.sender] -= 1;
     }
     return true;
  }

  /**
   IIIc- Terminte an expired waste chase
   reputation -
  **/
  function terminateAnExpiredWasteChase(uint chaseId) stopInEmergency returns (bool successful){
     if (chases[chaseId].expirationTime >= now) throw;//not yet expired
     if (chases[chaseId].status == ChaseStatus.SHOOT) throw;
     if (chases[chaseId].status == ChaseStatus.CANCEL) throw;
     if (chases[chaseId].status == ChaseStatus.EXPIRED) throw;

     if (chases[chaseId].owner == chases[chaseId].hunter ) throw; //waste chase already done

     if (chases[chaseId].owner != msg.sender) throw; //only the owner temrinate an expired waste chase

     if ((chases[chaseId].status == ChaseStatus.CHASED) && (chases[chaseId].hunter !=  address(0))){
       // someone his chasing this waste but has not come to take it or has not cancel his chase. he loose his deposit ( and reputation )
       //deposit come to the owner
       // change status
       chases[chaseId].status=ChaseStatus.EXPIRED;
       //clear it. not needed anymore.
       chases[chaseId].dealPasswordFromHunterHash=0;
       chases[chaseId].dealPasswordFromOwnerHash=0;
       chasesProcessingByOwner[msg.sender] -= 1;
       if (chases[chaseId].price > this.balance ) throw; //sanity check
       asyncSend(chases[chaseId].owner,chases[chaseId].price);
     }else{
       chases[chaseId].status=ChaseStatus.EXPIRED;
       chasesProcessingByOwner[msg.sender] -= 1;
     }
     return true;
  }
}
