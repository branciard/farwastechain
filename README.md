# FarWaste Chain

## Actors :
- sheriff : can control all the settings of the farWaste describe in the contract TownHall.sol
- wasteOwner : create a wasteChase to find a wasteHunter around. If his wasteChase succeed he will earn ether for that and he contributes to reduce food waste !
- wasteHunter : can find good deals around and he contributes to reduce food waste !


## Nominal use case
To not throw away his food, a waste owner can alert and launch WasteChase with a price, description and an expired time of his product. (see createWasteChase function in FarWaste.sol).

A wasteHunter can chase a wasteChase created by the wasteOwner by sending the right price in ether to the FarWaste.sol contract. (see chaseAWaste function ).

Then they have to meet each other to transact.(see shootAWaste function call by the WasteOwner with a sign message of the wasteHunter to be valid).

After that the WasteOwner can pull the payment sent to the contract by the chaseHunter.

## Cancel use case

The wasteOwner can cancel his wasteChase created ( it also eventually refund the current wasteHunter if present). (see cancelACreatedWasteChase function).

Before the expired time, a wasteHunter can cancel a wasteChase he has made and be refund.(see cancelAChasedWaste function).

We can also imagine a reputation system off chain feed by solidity event to discourage those kind of cancel behaviour.

## Expired use case

 If the wasteChase expired and someone was suppose to take it and did not come. The wasteOwner can withrow to obtain the wasteHunter deposit. (see terminateAnExpiredWasteChase function)

 ## Nominal WasteChase lifecycle
 by WO = by wasteOwner</br>
 by WH = by wasteHunter

 ----(createWasteChase by WO)----> CREATED ----(chaseAWaste by WH)----> CHASED ----(shootAWaste by WO)----> SHOOT

 ## Cancel WasteChase lifecycle

----(createWasteChase by WO)----> CREATED ----(chaseAWaste by WH)----> CHASED ----(cancelAChasedWaste by WH)----> CREATED

----(createWasteChase by WO)----> CREATED ----(cancelACreatedWasteChase by WO)----> CANCEL

----(createWasteChase by WO)----> CREATED ----(chaseAWaste by WH)----> CHASED ----(cancelACreatedWasteChase by WO)----> CANCEL

 ## Expired WasteChase lifecycle

----(createWasteChase by WO)----> CREATED ----(terminateAnExpiredWasteChase by WO)----> EXPIRED

----(createWasteChase by WO)----> CREATED -(chaseAWaste by WH)----> CHASED ----(terminateAnExpiredWasteChase by WO)----> EXPIRED
