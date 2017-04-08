var FarWaste = artifacts.require("./FarWaste.sol");

//extensions.js : credit to : https://github.com/coldice/dbh-b9lab-hackathon/blob/development/truffle/utils/extensions.js
const Extensions = require("../utils/extensions.js");
var moment = require("../utils/moment.min.js");
Extensions.init(web3, assert);

contract('FarWaste', function(accounts) {

  var sheriff,wasteOwner,wasteHunter;

    before("should prepare accounts", function() {
      assert.isAtLeast(accounts.length, 3, "should have at least 3 accounts");
      sheriff = accounts[0];
      wasteOwner = accounts[1];
      wasteHunter = accounts[2];
      return Extensions.makeSureAreUnlocked(
              [ sheriff, wasteOwner, wasteHunter])
              .then(() => web3.eth.getBalancePromise(sheriff))
              //check owner has at least 2 ether
              .then(balance => assert.isTrue(
                        web3.toWei(web3.toBigNumber(3), "ether").lessThan(balance),
                        "sheriff should have at least 3 ether, not " + web3.fromWei(balance, "ether"))
              )
              .then(() => Extensions.refillAccount(sheriff,wasteOwner,1))
              .then(() => Extensions.refillAccount(sheriff,wasteHunter,1));
    });

    describe("Test inital FarWaste state", function() {

      var aFarWasteInstance;
      var sheriffInitialBalance;
      var wasteOwnerInitialBalance;

      beforeEach("create a new contract instance and get inital balance", function() {
          return Promise.all([
            web3.eth.getBalancePromise(sheriff),
            web3.eth.getBalancePromise(wasteOwner),
            FarWaste.new(2,3,4,5,6)
          ])
          .then(results => {
            [sheriffInitialBalance,wasteOwnerInitialBalance,aFarWasteInstance]=results;
          });
      });

      it("test intial minChasePrice maxChasePrice minWasteChaseDuration maxWasteChaseDuration maxWasteChaseByUser", function() {
          return Promise.all([
            aFarWasteInstance.minChasePrice.call(),
            aFarWasteInstance.maxChasePrice.call(),
            aFarWasteInstance.minWasteChaseDuration.call(),
            aFarWasteInstance.maxWasteChaseDuration.call(),
            aFarWasteInstance.maxWasteChaseByUser.call()
          ])
          .then( results  => {
            [minChasePrice,maxChasePrice,minWasteChaseDuration,maxWasteChaseDuration,maxWasteChaseByUser]=results
            assert.strictEqual(minChasePrice.toNumber(), 2, "minChasePrice assigned");
            assert.strictEqual(maxChasePrice.toNumber(), 3, "maxChasePrice assigned");
            assert.strictEqual(minWasteChaseDuration.toNumber(), 4, "minWasteChaseDuration assigned");
            assert.strictEqual(maxWasteChaseDuration.toNumber(), 5, "maxWasteChaseDuration assigned");
            assert.strictEqual(maxWasteChaseByUser.toNumber(), 6, "maxWasteChaseByUser assigned");
            return Promise.all([
              aFarWasteInstance.modifyChaseDurationLimit(50,50,{from:sheriff, gas: 3000000 }),
              aFarWasteInstance.modifyChasePriceLimit(50,50,{from:sheriff, gas: 3000000 }),
              aFarWasteInstance.modifyMaxWasteChaseByUser(50,{from:sheriff, gas: 3000000 })
              ]);
          })
          .then(()=> Promise.all([
            aFarWasteInstance.minChasePrice.call(),
            aFarWasteInstance.maxChasePrice.call(),
            aFarWasteInstance.minWasteChaseDuration.call(),
            aFarWasteInstance.maxWasteChaseDuration.call(),
            aFarWasteInstance.maxWasteChaseByUser.call()
          ]))
          .then( results => {
            [minChasePrice,maxChasePrice,minWasteChaseDuration,maxWasteChaseDuration,maxWasteChaseByUser]=results
            assert.strictEqual(minChasePrice.toNumber(), 50, "minChasePrice changed to 50");
            assert.strictEqual(maxChasePrice.toNumber(), 50, "maxChasePrice changed to 50");
            assert.strictEqual(minWasteChaseDuration.toNumber(), 50, "minWasteChaseDuration changed to 50");
            assert.strictEqual(maxWasteChaseDuration.toNumber(), 50, "maxWasteChaseDuration changed to 50");
            assert.strictEqual(maxWasteChaseByUser.toNumber(), 50, "maxWasteChaseByUser changed to 50");
          }
          );
      });


      it("contract should have 0 balance at start", function() {
           return web3.eth.getBalancePromise(aFarWasteInstance.address)
           .then( balance  => assert.strictEqual(balance.toString(10), '0', "contract should have 0 balance at start"));
      });


      it("sheriff must be assigned", function() {
           return aFarWasteInstance.sheriff.call()
           .then( sheriffCall  => assert.strictEqual(sheriffCall, sheriff, "sheriff assigned"));
      });

      it("it should not failed to call kill function with sheriff ", function() {
            return aFarWasteInstance.kill({from:sheriff, gas: 3000000 })
            .then(txMined => {
                assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
            });
      });

      it("it should failed to call kill function if not sheriff ", function() {
            return Extensions.expectedExceptionPromise(function () {
              return aFarWasteInstance.kill({from:wasteOwner, gas: 3000000 });
              },
              3000000);
      });

      it("it should failed to modify modifyChaseDurationLimit by other than sheriff ", function() {
            return Extensions.expectedExceptionPromise(function () {
              return aFarWasteInstance.modifyChaseDurationLimit(50,50,{from:wasteOwner, gas: 3000000 });
              },
              3000000);
      });

      it("it should failed to modify modifyChasePriceLimit by other than sheriff ", function() {
            return Extensions.expectedExceptionPromise(function () {
              return aFarWasteInstance.modifyChasePriceLimit(50,50,{from:wasteOwner, gas: 3000000 });
              },
              3000000);
      });



      it("it should failed to modify modifyMaxWasteChaseByUser by other than sheriff ", function() {
            return Extensions.expectedExceptionPromise(function () {
              return aFarWasteInstance.modifyMaxWasteChaseByUser(50,{from:wasteOwner, gas: 3000000 });
              },
              3000000);
      });

      it("it should return 0 when call getChasesCount  ", function() {
          return aFarWasteInstance.getWasteChasesCount.call()
          .then( getWasteChasesCountCall  => assert.strictEqual(getWasteChasesCountCall.toNumber(), 0, "0 when call getWasteChasesCount"));
      });

    });


    describe("Test createWasteChase function", function() {

      var aFarWasteInstance;
      var sheriffInitialBalance;
      var wasteOwnerInitialBalance;
      var currentTime;

      beforeEach("create a new contract instance and get inital balance", function() {
          return Promise.all([
            web3.eth.getBalancePromise(sheriff),
            web3.eth.getBalancePromise(wasteOwner),
            FarWaste.new(50,100,50,100,2)
          ])
          .then(results => {
            [sheriffInitialBalance,wasteOwnerInitialBalance,aFarWasteInstance]=results;
          });
      });


      it("it shoud pass to create 2 createWasteChase for wasteOwner and failed on the third one", function() {
          currentTime = moment().unix();
          return aFarWasteInstance.createWasteChase(
            50,//price
            web3.sha3("test desc"),//desciption
            50, //duration in sec
            {from:wasteOwner,value:0, gas: 3000000}
          )
          .then(txMined => {
              assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
              return aFarWasteInstance.getWasteChasesCount.call();
          })
          .then(getWasteChasesCountCall => {
              assert.strictEqual(getWasteChasesCountCall.toNumber(), 1, "1 when call getWasteChasesCount");
              return aFarWasteInstance.getWasteChase(0);
            }
          )
          .then(aWasteChase => {
                [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
                assert.strictEqual(status.toNumber(), 1, "aWasteChase WasteChaseStatus is 1 = CREATED");
                assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice is 50");
                assert.strictEqual(expirationTime.toNumber(), currentTime + 50, "aWasteChase chaseExpiredTime is cuurentDate + 50");
                assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
                var aWasteChaseWasteHunter = web3.toBigNumber(hunter, 16);
                assert.isTrue(aWasteChaseWasteHunter.equals(0) ,"aWasteChase wasteHunter  address not set");
                assert.strictEqual(owner, wasteOwner, "aWasteChase wasteOwner is wasteOwner");
                currentTime = moment().unix();
          })
          .then(() => aFarWasteInstance.createWasteChase(
            60,//price
            web3.sha3("test desc 2"),//desciption
            60, //duration in sec
            {from:wasteOwner,value:0, gas: 3000000}
          ))
          .then(txMined => {
              assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
              return aFarWasteInstance.getWasteChasesCount.call();
          })
          .then(getWasteChasesCountCall => {
              assert.strictEqual(getWasteChasesCountCall.toNumber(), 2, "2 when call getWasteChasesCount");
              return aFarWasteInstance.getWasteChase(1);
            }
          )
          .then(aWasteChase => {
              [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
              assert.strictEqual(status.toNumber(), 1, "aWasteChase WasteChaseStatus is 1 = CREATED");
              assert.strictEqual(price.toNumber(), 60, "aWasteChase chasePrice is 60");
              assert.strictEqual(expirationTime.toNumber(), currentTime + 60, "aWasteChase chaseExpiredTime is cuurentDate + 50");
              assert.strictEqual(descriptionHash, web3.sha3("test desc 2"), "aWasteChase chaseDescription is test desc");
              var aWasteChaseWasteHunter = web3.toBigNumber(hunter, 16);
              assert.isTrue(aWasteChaseWasteHunter.equals(0) ,"aWasteChase wasteHunter  address not set");
              assert.strictEqual(owner, wasteOwner, "aWasteChase wasteOwner is wasteOwner");
              return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.createWasteChase(
                    50,//price
                    web3.sha3("test desc"),//desciption
                    50, //duration in sec
                    {from:wasteOwner,value:0, gas: 3000000}
                  )
              },
              3000000);
          });
      });

      it("it shoud failed to create createWasteChase with price < minChasePrice  ", function() {
          return Extensions.expectedExceptionPromise(function () {
              return aFarWasteInstance.createWasteChase(
                49,//price
                web3.sha3("test desc"),//desciption
                50, //duration in sec
                {from:wasteOwner,value:0, gas: 3000000}
              )
          },
          3000000);
      });

      it("it shoud failed to create createWasteChase with price > maxChasePrice  ", function() {
          return Extensions.expectedExceptionPromise(function () {
              return aFarWasteInstance.createWasteChase(
                101,//price
                web3.sha3("test desc"),//desciption
                50, //duration in sec
                {from:wasteOwner,value:0, gas: 3000000}
              )
          },
          3000000);
      });

      it("it shoud failed to create createWasteChase with price < minWasteChaseDuration  ", function() {
          return Extensions.expectedExceptionPromise(function () {
              return aFarWasteInstance.createWasteChase(
                50,//price
                web3.sha3("test desc"),//desciption
                49, //duration in sec
                {from:wasteOwner,value:0, gas: 3000000}
              )
          },
          3000000);
      });

      it("it shoud failed to create createWasteChase with price > maxWasteChaseDuration ", function() {
          return Extensions.expectedExceptionPromise(function () {
              return aFarWasteInstance.createWasteChase(
                50,//price
                web3.sha3("test desc"),//desciption
                101, //duration in sec
                {from:wasteOwner,value:0, gas: 3000000}
              )
          },
          3000000);
      });

      it("it shoud failed to create createWasteChase after change minWasteChaseDuration limit from 50 to 51", function() {
          return aFarWasteInstance.createWasteChase(
                            50,//price
                            web3.sha3("test desc"),//desciption
                            50, //duration in sec.
                            {from:wasteOwner,value:0, gas: 3000000})
            .then(txMined => assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas"))
            .then(() => aFarWasteInstance.modifyChaseDurationLimit(51,100,{from:sheriff}))
            .then(txMined => assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas"))
            .then(() => {
                return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.createWasteChase(
                                    50,//price
                                    web3.sha3("test desc"),//desciption
                                    50, //duration in sec.
                                    {from:wasteOwner,value:0, gas: 3000000}
                                  )
                                },
                                3000000);
            });
      });

      it("it shoud failed to create createWasteChase after change minChasePrice limit from 50 to 51", function() {
          return aFarWasteInstance.createWasteChase(
                            50,//price
                            web3.sha3("test desc"),//desciption
                            50, //duration in sec.
                            {from:wasteOwner,value:0, gas: 3000000})
            .then(txMined => assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas"))
            .then(() => aFarWasteInstance.modifyChasePriceLimit(51,100,{from:sheriff}))
            .then(txMined => assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas"))
            .then(() => {
                return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.createWasteChase(
                                    50,//price
                                    web3.sha3("test desc"),//desciption
                                    50, //duration in sec.
                                    {from:wasteOwner,value:0, gas: 3000000}
                                  )
                                },
                                3000000);
            });
      });

      it("it shoud failed to create createWasteChase after change maxWasteChaseDuration limit from 100 to 99", function() {
          return aFarWasteInstance.createWasteChase(
                            50,//price
                            web3.sha3("test desc"),//desciption
                            100, //duration in sec.
                            {from:wasteOwner,value:0, gas: 3000000})
            .then(txMined => assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas"))
            .then(() => aFarWasteInstance.modifyChaseDurationLimit(50,99,{from:sheriff}))
            .then(txMined => assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas"))
            .then(() => {
                return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.createWasteChase(
                                    50,//price
                                    web3.sha3("test desc"),//desciption
                                    100, //duration in sec.
                                    {from:wasteOwner,value:0, gas: 3000000}
                                  )
                                },
                                3000000);
            });
      });


        it("it shoud failed to create createWasteChase after change maxChasePrice limit from 100 to 99", function() {
            return aFarWasteInstance.createWasteChase(
                              100,//price
                              web3.sha3("test desc"),//desciption
                              50, //duration in sec.
                              {from:wasteOwner,value:0, gas: 3000000})
              .then(txMined => assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas"))
              .then(() => aFarWasteInstance.modifyChasePriceLimit(50,99,{from:sheriff}))
              .then(txMined => assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas"))
              .then(() => {
                  return Extensions.expectedExceptionPromise(function () {
                    return aFarWasteInstance.createWasteChase(
                                      100,//price
                                      web3.sha3("test desc"),//desciption
                                      50, //duration in sec.
                                      {from:wasteOwner,value:0, gas: 3000000}
                                    )
                                  },
                                  3000000);
              });
        });

    });


    describe("Test chaseAWaste function", function() {

      var aFarWasteInstance;
      var sheriffInitialBalance;
      var wasteOwnerInitialBalance;
      var currentTime;

      beforeEach("create a new contract instance and get inital balance and create a waste chase", function() {
          return Promise.all([
            web3.eth.getBalancePromise(sheriff),
            web3.eth.getBalancePromise(wasteOwner),
            FarWaste.new(50,100,5,100,2)
          ])
          .then(results => {
            [sheriffInitialBalance,wasteOwnerInitialBalance,aFarWasteInstance]=results;
            return aFarWasteInstance.createWasteChase(
                              50,//price
                              web3.sha3("test desc"),//desciption
                              5, //duration in sec.
                              {from:wasteOwner,value:0, gas: 3000000});
          })
          .then(txMined => {
              assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
              return aFarWasteInstance.getWasteChasesCount.call();
          })
          .then(getWasteChasesCountCall => {
              assert.strictEqual(getWasteChasesCountCall.toNumber(), 1, "1 when call getWasteChasesCount");
            }
          );
      });

      it("it should pass to chase this existing waste by wasteHunter  created by wasteOwner", function() {
          return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:50, gas: 3000000})
          .then(txMined => {
              assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
              return web3.eth.getBalancePromise(aFarWasteInstance.address);
          })
          .then(contractBalance => {
            assert.strictEqual(contractBalance.toNumber(), 50, "chaseAWaste has put 50 in the contract");
            return aFarWasteInstance.getWasteChasesCount.call();
          }
          )
          .then(getWasteChasesCountCall => {
              assert.strictEqual(getWasteChasesCountCall.toNumber(), 1, "1 when call getWasteChasesCount");
              return aFarWasteInstance.getWasteChase(0);
            }
          )
          .then(aWasteChase => {
                [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
                assert.strictEqual(status.toNumber(), 2, "aWasteChase WasteChaseStatus is 2 = CHASED");
                assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice is 50");
                assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
                assert.strictEqual(hunter,wasteHunter,"aWasteChase wasteHunter is wasteHunter");
                assert.strictEqual(owner, wasteOwner, "aWasteChase wasteOwner is wasteOwner");
                //chaseAWaste twice should failed
                return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:50, gas: 3000000})
                                },
                                3000000);
          });
        });

        it("it should failed to chase with 0 value sent", function() {
          return Extensions.expectedExceptionPromise(function () {
            return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:0, gas: 3000000})
                          },
                          3000000);
        });

        it("it should failed to chase with value under the chasePrice 50", function() {
          return Extensions.expectedExceptionPromise(function () {
            return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:49, gas: 3000000})
                          },
                          3000000);
        });

        it("it should failed to chase with value above the chasePrice 50", function() {
          return Extensions.expectedExceptionPromise(function () {
            return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:51, gas: 3000000})
                          },
                          3000000);
        });


        it("it should failed to chase an expired chaseWaste", function() {
          Extensions.sleep(8000);
          return Extensions.expectedExceptionPromise(function () {
            return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:50, gas: 3000000})
                          },
                          3000000);
        });

      });


          describe("Test shootAWaste function", function() {

            var aFarWasteInstance;
            var sheriffInitialBalance;
            var wasteOwnerInitialBalance;
            var currentTime;

            beforeEach("create a new contract instance and get inital balance and create a waste chase", function() {
                return Promise.all([
                  web3.eth.getBalancePromise(sheriff),
                  web3.eth.getBalancePromise(wasteOwner),
                  FarWaste.new(50,100,5,100,2)
                ])
                .then(results => {
                  [sheriffInitialBalance,wasteOwnerInitialBalance,aFarWasteInstance]=results;
                  return aFarWasteInstance.createWasteChase(
                                    50,//price
                                    web3.sha3("test desc"),//desciption
                                    5, //duration in sec.
                                    {from:wasteOwner,value:0, gas: 3000000});
                })
                .then(txMined => {
                    assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                    return aFarWasteInstance.getWasteChasesCount.call();
                })
                .then(getWasteChasesCountCall => {
                    assert.strictEqual(getWasteChasesCountCall.toNumber(), 1, "1 when call getWasteChasesCount");
                    return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:50, gas: 3000000});
                  }
                )
                .then(txMined => {
                    assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                    return web3.eth.getBalancePromise(aFarWasteInstance.address);
                })
                .then(contractBalance => {
                    assert.strictEqual(contractBalance.toNumber(), 50, "chaseAWaste has put 50 in the contract");
                    return aFarWasteInstance.getWasteChase(0);
                  }
                )
                .then(aWasteChase => {
                      [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
                      assert.strictEqual(status.toNumber(), 2, "aWasteChase WasteChaseStatus is 2 = CHASED");
                      assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice is 50");
                      assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
                      assert.strictEqual(hunter,wasteHunter,"aWasteChase wasteHunter is wasteHunter");
                      assert.strictEqual(owner,wasteOwner, "aWasteChase wasteOwner is wasteOwner");
                });
            });

            it("contract should have 50 balance now", function() {
                 return web3.eth.getBalancePromise(aFarWasteInstance.address)
                 .then( balance  => assert.strictEqual(balance.toString(10), '50', "contract should have 50 after createWasteChase and chaseAWaste call"));
            });

            it("shootAWaste is call by the wasteOwner and need a signed msg (meet each other and send signMessage via flashcode ? use uport for identity ?) from wasteHunter.", function() {
               return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000})
               .then(getMyProcessingWasteChasesCount =>{
                 assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 1, "wasteOwner has 1 waste chase");
                 return Extensions.signMessage(wasteHunter,"0");
                })
                .then(sig => {
                   return aFarWasteInstance.shootAWaste(0,"0",sig.sha,sig.v,sig.r,sig.s,{from:wasteOwner, gas: 3000000});
                })
                .then(txMined => {
                   assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                   return aFarWasteInstance.getWasteChase(0);
                })
                .then(aWasteChase => {
                      [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
                      assert.strictEqual(status.toNumber(), 3, "aWasteChase WasteChaseStatus is 3 = SHOOT");
                      assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice was 50");
                      assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
                      assert.strictEqual(hunter,wasteHunter,"aWasteChase wasteHunter was wasteHunter");
                      assert.strictEqual(owner,wasteHunter, "aWasteChase new wasteOwner is wasteHunter");
                      return  Promise.all([
                      aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000}),
                      aFarWasteInstance.getMyCompletedWasteChasesCount.call({from:wasteHunter, gas: 3000000})
                      ]);
                })
                .then(chasesCount =>{
                      [getMyProcessingWasteChasesCount, getMyCompletedWasteChasesCount]=chasesCount;
                      assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 0, "wasteOwner has now 0 waste chase");
                      assert.strictEqual(getMyCompletedWasteChasesCount.toNumber(), 1, "wasteHunter has completed 1 waste chase!");
                      return web3.eth.getBalancePromise(wasteOwner);
                })
                .then(balance => {
                  wasteOwnerInitialBalance=balance;//wasteOwner balance before withdrawPayments
                  //wasteOwner can pull payment
                  return aFarWasteInstance.withdrawPayments({from:wasteOwner, gas: 3000000});
                })
                .then(txMined => {
                   assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                   return Promise.all([
                   web3.eth.getBalancePromise(wasteOwner),
                   web3.eth.getBalancePromise(aFarWasteInstance.address),
                   Extensions.gazTxUsedCost(txMined)
                   ]);
                 }
               )
               .then( results  => {
                    [wasteOwnerCurrentBalance,contractCurrentBalance,gazUsedCost]=results;
                    initialBalanceMinusGazUsed=web3.toBigNumber(wasteOwnerInitialBalance.minus(gazUsedCost));
                    assert.strictEqual(wasteOwnerCurrentBalance.minus(initialBalanceMinusGazUsed).toString(10), '50' , "wasteOwner has withdrow his 50 payment");
                    assert.strictEqual(contractCurrentBalance.toString(10), '0', "nothing left in the contract after this withdrow");
                  }
               );
            });

            it("shootAWaste is call by the wasteOwner with wrong signed msg from wasteHunter.", function() {
              return Extensions.signMessage(wasteOwner,"0")//must be signed by wasteHunter not wasteOwner
              .then(sig => {
                return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.shootAWaste(0,"0",sig.sha,sig.v,sig.r,sig.s,{from:wasteOwner, gas: 3000000});
                                },
                                3000000);
              });
            });

            it("shootAWaste to an unknown id failed", function() {
              return Extensions.signMessage(wasteHunter,"10")
              .then(sig => {
                return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.shootAWaste(10,"10",sig.sha,sig.v,sig.r,sig.s,{from:wasteOwner, gas: 3000000});
                                },
                                3000000);
              });
            });

            it("shootAWaste for id 0 : only wasteOwner can call it", function() {
              return Extensions.signMessage(wasteHunter,"0")
              .then(sig => {
                return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.shootAWaste(0,"0",sig.sha,sig.v,sig.r,sig.s,{from:wasteHunter, gas: 3000000});
                                },
                                3000000);
              });
            });

            it("shootAWaste id 0 has been paid by wasteHunter. others can't pretend to take it", function() {
              return Extensions.signMessage(sheriff,"0")
              .then(sig => {
                return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.shootAWaste(0,"0",sig.sha,sig.v,sig.r,sig.s,{from:wasteOwner, gas: 3000000});
                                },
                                3000000);
              });
            });

            it("wasteHunter must sign the right id number to validate the shootAWaste.", function() {
              return Extensions.signMessage(wasteHunter,"1")
              .then(sig => {
                return Extensions.expectedExceptionPromise(function () {
                  return aFarWasteInstance.shootAWaste(0,"0",sig.sha,sig.v,sig.r,sig.s,{from:wasteOwner, gas: 3000000});
                                },
                                3000000);
              });
            });


    });



              describe("Test cancelAChasedWaste function", function() {

                var aFarWasteInstance;
                var sheriffInitialBalance;
                var wasteHunterInitialBalance;
                var currentTime;

                beforeEach("create a new contract instance and get inital balance and create a waste chase", function() {
                    return Promise.all([
                      web3.eth.getBalancePromise(sheriff),
                      web3.eth.getBalancePromise(wasteOwner),
                      FarWaste.new(50,100,5,100,2)
                    ])
                    .then(results => {
                      [sheriffInitialBalance,wasteOwnerInitialBalance,aFarWasteInstance]=results;
                      return aFarWasteInstance.createWasteChase(
                                        50,//price
                                        web3.sha3("test desc"),//desciption
                                        5, //duration in sec.
                                        {from:wasteOwner,value:0, gas: 3000000});
                    })
                    .then(txMined => {
                        assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                        return aFarWasteInstance.getWasteChasesCount.call();
                    })
                    .then(getWasteChasesCountCall => {
                        assert.strictEqual(getWasteChasesCountCall.toNumber(), 1, "1 when call getWasteChasesCount");
                        return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:50, gas: 3000000});
                      }
                    )
                    .then(txMined => {
                        assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                        return web3.eth.getBalancePromise(aFarWasteInstance.address);
                    })
                    .then(contractBalance => {
                        assert.strictEqual(contractBalance.toNumber(), 50, "chaseAWaste has put 50 in the contract");
                        return aFarWasteInstance.getWasteChase(0);
                      }
                    )
                    .then(aWasteChase => {
                          [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
                          assert.strictEqual(status.toNumber(), 2, "aWasteChase WasteChaseStatus is 2 = CHASED");
                          assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice is 50");
                          assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
                          assert.strictEqual(hunter,wasteHunter,"aWasteChase wasteHunter is wasteHunter");
                          assert.strictEqual(owner,wasteOwner, "aWasteChase wasteOwner is wasteOwner");
                    });
                });

                it("contract should have 50 balance now", function() {
                     return web3.eth.getBalancePromise(aFarWasteInstance.address)
                     .then( balance  => assert.strictEqual(balance.toString(10), '50', "contract should have 50 after createWasteChase and chaseAWaste call"));
                });


                it("cancelAChasedWaste is call by the wastehunter to cancel his waste chase ", function() {
                   return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000})
                   .then(getMyProcessingWasteChasesCount =>{
                     assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 1, "wasteOwner has 1 waste chase");
                       return aFarWasteInstance.cancelAChasedWaste(0,{from:wasteHunter, gas: 3000000});
                    })
                    .then(txMined => {
                       assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                       return aFarWasteInstance.getWasteChase(0);
                    })
                    .then(aWasteChase => {
                          [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
                          assert.strictEqual(status.toNumber(), 1, "aWasteChase WasteChaseStatus return to 1 = CREATED");
                          assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice was 50");
                          assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
                          var aWasteChaseWasteHunter = web3.toBigNumber(hunter, 16);
                          assert.isTrue(aWasteChaseWasteHunter.equals(0) ,"aWasteChase wasteHunter  has cancel address not set.free to new wasteHunter");
                          assert.strictEqual(owner,wasteOwner, "aWasteChase wasteOwner is still  wasteOwner");
                          return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000});
                    })
                    .then(getMyProcessingWasteChasesCount =>{
                          assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 1, "wasteOwner has still 1 waste chase");
                          return web3.eth.getBalancePromise(wasteHunter);
                    })
                    .then(balance => {
                      wasteHunterInitialBalance=balance;//wasteHunter balance before withdrawPayments
                      //chaseHunter can pull payment because he cancel his wasteChase
                      return aFarWasteInstance.withdrawPayments({from:wasteHunter, gas: 3000000});
                    })
                    .then(txMined => {
                       assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                       return Promise.all([
                       web3.eth.getBalancePromise(wasteHunter),
                       web3.eth.getBalancePromise(aFarWasteInstance.address),
                       Extensions.gazTxUsedCost(txMined)
                       ]);
                     }
                   )
                   .then( results  => {
                        [wasteHunterCurrentBalance,contractCurrentBalance,gazUsedCost]=results;
                        initialBalanceMinusGazUsed=web3.toBigNumber(wasteHunterInitialBalance.minus(gazUsedCost));
                        assert.strictEqual(wasteHunterCurrentBalance.minus(initialBalanceMinusGazUsed).toString(10), '50' , "wasteHunter has withdrow his 50 payment");
                        assert.strictEqual(contractCurrentBalance.toString(10), '0', "nothing left in the contract after this withdrow");
                      }
                   );
                });

              it("cancelAChasedWaste is call by the wasteOwner so failed. only the current wasteHunter can cancel.", function() {
                  return Extensions.expectedExceptionPromise(function () {
                    return aFarWasteInstance.cancelAChasedWaste(0,{from:wasteOwner, gas: 3000000});
                                  },
                                  3000000);
              });

              it("cancelAChasedWaste is call by the sheriff so failed. only the current wasteHunter can cancel.", function() {
                  return Extensions.expectedExceptionPromise(function () {
                    return aFarWasteInstance.cancelAChasedWaste(0,{from:sheriff, gas: 3000000});
                                  },
                                  3000000);
              });

              it("cancelAChasedWaste on a wrong id failed", function() {
                  return Extensions.expectedExceptionPromise(function () {
                    return aFarWasteInstance.cancelAChasedWaste(1,{from:wasteHunter, gas: 3000000});
                                  },
                                  3000000);
              });

              it("cancelAChasedWaste after the expiredTime failed", function() {
                  Extensions.sleep(8000);
                  return Extensions.expectedExceptionPromise(function () {
                    return aFarWasteInstance.cancelAChasedWaste(0,{from:wasteHunter, gas: 3000000});
                                  },
                                  3000000);
              });
        });


              describe("Test cancelACreatedWasteChase function on already chased waste", function() {

                var aFarWasteInstance;
                var sheriffInitialBalance;
                var wasteHunterInitialBalance;
                var currentTime;

                beforeEach("create a new contract instance and get inital balance and create a waste chase", function() {
                    return Promise.all([
                      web3.eth.getBalancePromise(sheriff),
                      web3.eth.getBalancePromise(wasteOwner),
                      FarWaste.new(50,100,5,100,2)
                    ])
                    .then(results => {
                      [sheriffInitialBalance,wasteOwnerInitialBalance,aFarWasteInstance]=results;
                      return aFarWasteInstance.createWasteChase(
                                        50,//price
                                        web3.sha3("test desc"),//desciption
                                        5, //duration in sec.
                                        {from:wasteOwner,value:0, gas: 3000000});
                    })
                    .then(txMined => {
                        assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                        return aFarWasteInstance.getWasteChasesCount.call();
                    })
                    .then(getWasteChasesCountCall => {
                        assert.strictEqual(getWasteChasesCountCall.toNumber(), 1, "1 when call getWasteChasesCount");
                        return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:50, gas: 3000000});
                      }
                    )
                    .then(txMined => {
                        assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                        return web3.eth.getBalancePromise(aFarWasteInstance.address);
                    })
                    .then(contractBalance => {
                        assert.strictEqual(contractBalance.toNumber(), 50, "chaseAWaste has put 50 in the contract");
                        return aFarWasteInstance.getWasteChase(0);
                      }
                    )
                    .then(aWasteChase => {
                          [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
                          assert.strictEqual(status.toNumber(), 2, "aWasteChase WasteChaseStatus is 2 = CHASED");
                          assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice is 50");
                          assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
                          assert.strictEqual(hunter,wasteHunter,"aWasteChase wasteHunter is wasteHunter");
                          assert.strictEqual(owner,wasteOwner, "aWasteChase wasteOwner is wasteOwner");
                    });
                });

                it("contract should have 50 balance now", function() {
                     return web3.eth.getBalancePromise(aFarWasteInstance.address)
                     .then( balance  => assert.strictEqual(balance.toString(10), '50', "contract should have 50 after createWasteChase and chaseAWaste call"));
                });

                it("cancelACreatedWasteChase function on already chased waste", function() {
                   return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000})
                   .then(getMyProcessingWasteChasesCount =>{
                     assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 1, "wasteOwner has 1 waste chase");
                       return aFarWasteInstance.cancelACreatedWasteChase(0,{from:wasteOwner, gas: 3000000});
                    })
                    .then(txMined => {
                       assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                       return aFarWasteInstance.getWasteChase(0);
                    })
                    .then(aWasteChase => {
                          [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
                          assert.strictEqual(status.toNumber(), 4, "aWasteChase WasteChaseStatus return to 4 = CANCEL");
                          assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice was 50");
                          assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
                          var aWasteChaseWasteHunter = web3.toBigNumber(hunter, 16);
                          assert.isTrue(aWasteChaseWasteHunter.equals(0) ,"aWasteChase wasteHunter  has cancel address not set.free to new wasteHunter");
                          assert.strictEqual(owner,wasteOwner, "aWasteChase wasteOwner is still  wasteOwner");
                          return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000});
                    })
                    .then(getMyProcessingWasteChasesCount =>{
                          assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 0, "wasteOwner has no waste chase");
                          return web3.eth.getBalancePromise(wasteHunter);
                    })
                    .then(balance => {
                      wasteHunterInitialBalance=balance;//wasteHunter balance before withdrawPayments
                      //chaseHunter can pull payment because wasteOwner cancel this wasteChase
                      return aFarWasteInstance.withdrawPayments({from:wasteHunter, gas: 3000000});
                    })
                    .then(txMined => {
                       assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                       return Promise.all([
                       web3.eth.getBalancePromise(wasteHunter),
                       web3.eth.getBalancePromise(aFarWasteInstance.address),
                       Extensions.gazTxUsedCost(txMined)
                       ]);
                     }
                   )
                   .then( results  => {
                        [wasteHunterCurrentBalance,contractCurrentBalance,gazUsedCost]=results;
                        initialBalanceMinusGazUsed=web3.toBigNumber(wasteHunterInitialBalance.minus(gazUsedCost));
                        assert.strictEqual(wasteHunterCurrentBalance.minus(initialBalanceMinusGazUsed).toString(10), '50' , "wasteHunter has withdrow his 50 payment");
                        assert.strictEqual(contractCurrentBalance.toString(10), '0', "nothing left in the contract after this withdrow");
                      }
                   )
                   ;
                });


                it("cancelACreatedWasteChase is call by the wasteHunter so failed. only the current wasteOwner can cancel.", function() {
                    return Extensions.expectedExceptionPromise(function () {
                      return aFarWasteInstance.cancelACreatedWasteChase(0,{from:wasteHunter, gas: 3000000});
                                    },
                                    3000000);
                });

                it("cancelACreatedWasteChase is call by the sheriff so failed. only the current wasteHunter can cancel.", function() {
                    return Extensions.expectedExceptionPromise(function () {
                      return aFarWasteInstance.cancelACreatedWasteChase(0,{from:sheriff, gas: 3000000});
                                    },
                                    3000000);
                });

                it("cancelACreatedWasteChase on a wrong id failed", function() {
                    return Extensions.expectedExceptionPromise(function () {
                      return aFarWasteInstance.cancelACreatedWasteChase(1,{from:wasteOwner, gas: 3000000});
                                    },
                                    3000000);
                });

                it("cancelACreatedWasteChase after the expiredTime failed", function() {
                    Extensions.sleep(8000);
                    return Extensions.expectedExceptionPromise(function () {
                      return aFarWasteInstance.cancelACreatedWasteChase(0,{from:wasteOwner, gas: 3000000});
                                    },
                                    3000000);
                });

        });


        describe("Test cancelACreatedWasteChase function no waste chase processing", function() {

          var aFarWasteInstance;
          var sheriffInitialBalance;
          var wasteHunterInitialBalance;
          var currentTime;

          beforeEach("create a new contract instance and get inital balance and create a waste chase", function() {
              return Promise.all([
                web3.eth.getBalancePromise(sheriff),
                web3.eth.getBalancePromise(wasteOwner),
                FarWaste.new(50,100,5,100,2)
              ])
              .then(results => {
                [sheriffInitialBalance,wasteOwnerInitialBalance,aFarWasteInstance]=results;
                return aFarWasteInstance.createWasteChase(
                                  50,//price
                                  web3.sha3("test desc"),//desciption
                                  5, //duration in sec.
                                  {from:wasteOwner,value:0, gas: 3000000});
              })
              .then(txMined => {
                  assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                  return aFarWasteInstance.getWasteChasesCount.call();
              })
              .then(getWasteChasesCountCall => {
                  assert.strictEqual(getWasteChasesCountCall.toNumber(), 1, "1 when call getWasteChasesCount");
                }
              );

          });

          it("contract should have 50 balance now", function() {
               return web3.eth.getBalancePromise(aFarWasteInstance.address)
               .then( balance  => assert.strictEqual(balance.toString(10), '0', "contract should have 0 after createWasteChase"));
          });

          it("cancelACreatedWasteChase function ", function() {
             return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000})
             .then(getMyProcessingWasteChasesCount =>{
               assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 1, "wasteOwner has 1 waste chase");
                 return aFarWasteInstance.cancelACreatedWasteChase(0,{from:wasteOwner, gas: 3000000});
              })
              .then(txMined => {
                 assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
                 return aFarWasteInstance.getWasteChase(0);
              })
              .then(aWasteChase => {
                    [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
                    assert.strictEqual(status.toNumber(), 4, "aWasteChase WasteChaseStatus return to 4 = CANCEL");
                    assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice was 50");
                    assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
                    var aWasteChaseWasteHunter = web3.toBigNumber(hunter, 16);
                    assert.isTrue(aWasteChaseWasteHunter.equals(0) ,"aWasteChase wasteHunter  has cancel address not set.free to new wasteHunter");
                    assert.strictEqual(owner,wasteOwner, "aWasteChase wasteOwner is still  wasteOwner");
                    return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000});
              })
              .then(getMyProcessingWasteChasesCount =>{
                    assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 0, "wasteOwner has no waste chase");
                    return Extensions.expectedExceptionPromise(function () {
                      return aFarWasteInstance.withdrawPayments({from:wasteHunter, gas: 3000000});//nothing to withdrow
                                    },
                                    3000000);
              });

          });


          it("cancelACreatedWasteChase is call by the wasteHunter so failed. only the current wasteOwner can cancel.", function() {
              return Extensions.expectedExceptionPromise(function () {
                return aFarWasteInstance.cancelACreatedWasteChase(0,{from:wasteHunter, gas: 3000000});
                              },
                              3000000);
          });

          it("cancelACreatedWasteChase is call by the sheriff so failed. only the current wasteHunter can cancel.", function() {
              return Extensions.expectedExceptionPromise(function () {
                return aFarWasteInstance.cancelACreatedWasteChase(0,{from:sheriff, gas: 3000000});
                              },
                              3000000);
          });

          it("cancelACreatedWasteChase on a wrong id failed", function() {
              return Extensions.expectedExceptionPromise(function () {
                return aFarWasteInstance.cancelACreatedWasteChase(1,{from:wasteOwner, gas: 3000000});
                              },
                              3000000);
          });

          it("cancelACreatedWasteChase after the expiredTime failed", function() {
              Extensions.sleep(8000);
              return Extensions.expectedExceptionPromise(function () {
                return aFarWasteInstance.cancelACreatedWasteChase(0,{from:wasteOwner, gas: 3000000});
                              },
                              3000000);
          });
  });


  describe("Test terminateAnExpiredWasteChase function on already chased waste", function() {

    var aFarWasteInstance;
    var sheriffInitialBalance;
    var wasteOwnerInitialBalance;
    var currentTime;

    beforeEach("create a new contract instance and get inital balance and create a waste chase", function() {
        return Promise.all([
          web3.eth.getBalancePromise(sheriff),
          web3.eth.getBalancePromise(wasteOwner),
          FarWaste.new(50,100,5,100,2)
        ])
        .then(results => {
          [sheriffInitialBalance,wasteOwnerInitialBalance,aFarWasteInstance]=results;
          return aFarWasteInstance.createWasteChase(
                            50,//price
                            web3.sha3("test desc"),//desciption
                            5, //duration in sec.
                            {from:wasteOwner,value:0, gas: 3000000});
        })
        .then(txMined => {
            assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
            return aFarWasteInstance.getWasteChasesCount.call();
        })
        .then(getWasteChasesCountCall => {
            assert.strictEqual(getWasteChasesCountCall.toNumber(), 1, "1 when call getWasteChasesCount");
            return aFarWasteInstance.chaseAWaste(0,{from:wasteHunter, value:50, gas: 3000000});
          }
        )
        .then(txMined => {
            assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
            return web3.eth.getBalancePromise(aFarWasteInstance.address);
        })
        .then(contractBalance => {
            assert.strictEqual(contractBalance.toNumber(), 50, "chaseAWaste has put 50 in the contract");
            return aFarWasteInstance.getWasteChase(0);
          }
        )
        .then(aWasteChase => {
              [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
              assert.strictEqual(status.toNumber(), 2, "aWasteChase WasteChaseStatus is 2 = CHASED");
              assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice is 50");
              assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
              assert.strictEqual(hunter,wasteHunter,"aWasteChase wasteHunter is wasteHunter");
              assert.strictEqual(owner,wasteOwner, "aWasteChase wasteOwner is wasteOwner");
        });
    });

    it("contract should have 50 balance now", function() {
         return web3.eth.getBalancePromise(aFarWasteInstance.address)
         .then( balance  => assert.strictEqual(balance.toString(10), '50', "contract should have 50 after createWasteChase and chaseAWaste call"));
    });

    it("terminateAnExpiredWasteChase function on a chased waste but expired ", function() {
       return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000})
       .then(getMyProcessingWasteChasesCount =>{
         assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 1, "wasteOwner has 1 waste chase");
           Extensions.sleep(8000);
           return aFarWasteInstance.terminateAnExpiredWasteChase(0,{from:wasteOwner, gas: 3000000});
        })
        .then(txMined => {
           assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
           return aFarWasteInstance.getWasteChase(0);
        })
        .then(aWasteChase => {
              [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
              assert.strictEqual(status.toNumber(), 5, "aWasteChase WasteChaseStatus return to 5 = EXPIRED");
              assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice was 50");
              assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
              assert.strictEqual(hunter,wasteHunter ,"wasteHunter was here but do not take the product before expiration");
              assert.strictEqual(owner,wasteOwner, "aWasteChase wasteOwner is still wasteOwner but on an expired product ...");
              return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000});
        })
        .then(getMyProcessingWasteChasesCount =>{
              assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 0, "wasteOwner has no waste chase");
              return web3.eth.getBalancePromise(wasteOwner);
        })
        .then(balance => {
          wasteOwnerInitialBalance=balance;//wasteHunter balance before withdrawPayments
          //wasteOwner can pull payment because wasteHunter did not come to take the product or cancel his chase
          return aFarWasteInstance.withdrawPayments({from:wasteOwner, gas: 3000000});
        })
        .then(txMined => {
           assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
           return Promise.all([
           web3.eth.getBalancePromise(wasteOwner),
           web3.eth.getBalancePromise(aFarWasteInstance.address),
           Extensions.gazTxUsedCost(txMined)
           ]);
         }
       )
       .then( results  => {
            [wasteOwnerCurrentBalance,contractCurrentBalance,gazUsedCost]=results;
            initialBalanceMinusGazUsed=web3.toBigNumber(wasteOwnerInitialBalance.minus(gazUsedCost));
            assert.strictEqual(wasteOwnerCurrentBalance.minus(initialBalanceMinusGazUsed).toString(10), '50' , "wasteOwner has withdrow 50 payment");
            assert.strictEqual(contractCurrentBalance.toString(10), '0', "nothing left in the contract after this withdrow");
          }
       )
       ;
    });


    it("cancelACreatedWasteChase is call by the wasteHunter so failed. only the current wasteOwner can cancel.", function() {
        Extensions.sleep(8000);
        return Extensions.expectedExceptionPromise(function () {
          return aFarWasteInstance.terminateAnExpiredWasteChase(0,{from:wasteHunter, gas: 3000000});
                        },
                        3000000);
    });

    it("terminateAnExpiredWasteChase is call by the sheriff so failed. only the current wasteOwner can terminate.", function() {
        Extensions.sleep(8000);
        return Extensions.expectedExceptionPromise(function () {
          return aFarWasteInstance.terminateAnExpiredWasteChase(0,{from:sheriff, gas: 3000000});
                        },
                        3000000);
    });

    it("terminateAnExpiredWasteChase on a wrong id failed", function() {
      Extensions.sleep(8000);
        return Extensions.expectedExceptionPromise(function () {
          return aFarWasteInstance.terminateAnExpiredWasteChase(1,{from:wasteOwner, gas: 3000000});
                        },
                        3000000);
    });

});


describe("Test terminateAnExpiredWasteChase on a created waste and then expired (not CHASED status)", function() {

  var aFarWasteInstance;
  var sheriffInitialBalance;
  var wasteOwnerInitialBalance;
  var currentTime;

  beforeEach("create a new contract instance and get inital balance and create a waste chase", function() {
      return Promise.all([
        web3.eth.getBalancePromise(sheriff),
        web3.eth.getBalancePromise(wasteOwner),
        FarWaste.new(50,100,5,100,2)
      ])
      .then(results => {
        [sheriffInitialBalance,wasteOwnerInitialBalance,aFarWasteInstance]=results;
        return aFarWasteInstance.createWasteChase(
                          50,//price
                          web3.sha3("test desc"),//desciption
                          5, //duration in sec.
                          {from:wasteOwner,value:0, gas: 3000000});
      })
      .then(txMined => {
          assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
          return aFarWasteInstance.getWasteChasesCount.call();
      })
      .then(getWasteChasesCountCall => {
          assert.strictEqual(getWasteChasesCountCall.toNumber(), 1, "1 when call getWasteChasesCount");
        }
      );

  });

  it("contract should have 0 balance now", function() {
       return web3.eth.getBalancePromise(aFarWasteInstance.address)
       .then( balance  => assert.strictEqual(balance.toString(10), '0', "contract should have 0 after createWasteChase"));
  });

  it("terminateAnExpiredWasteChase function on a created waste but expired ", function() {
     return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000})
     .then(getMyProcessingWasteChasesCount =>{
       assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 1, "wasteOwner has 1 waste chase");
         Extensions.sleep(8000);
         return aFarWasteInstance.terminateAnExpiredWasteChase(0,{from:wasteOwner, gas: 3000000});
      })
      .then(txMined => {
         assert.isBelow(txMined.receipt.gasUsed, 3000000, "should not use all gas");
         return aFarWasteInstance.getWasteChase(0);
      })
      .then(aWasteChase => {
            [status,price,expirationTime,descriptionHash,hunter,owner]=aWasteChase;
            assert.strictEqual(status.toNumber(), 5, "aWasteChase WasteChaseStatus return to 5 = EXPIRED");
            assert.strictEqual(price.toNumber(), 50, "aWasteChase chasePrice was 50");
            assert.strictEqual(descriptionHash, web3.sha3("test desc"), "aWasteChase chaseDescription is test desc");
            var aWasteChaseWasteHunter = web3.toBigNumber(hunter, 16);
            assert.isTrue(aWasteChaseWasteHunter.equals(0) ,"aWasteChase no wasteHunter");
            assert.strictEqual(owner,wasteOwner, "aWasteChase wasteOwner is still wasteOwner but on an expired product ...");
            return aFarWasteInstance.getMyProcessingWasteChasesCount.call({from:wasteOwner, gas: 3000000});
      })
      .then(getMyProcessingWasteChasesCount =>{
        assert.strictEqual(getMyProcessingWasteChasesCount.toNumber(), 0, "wasteOwner has no waste chase");
        //nothing to pull
        return Extensions.expectedExceptionPromise(function () {
          return aFarWasteInstance.withdrawPayments({from:wasteOwner, gas: 3000000});
                        },
                        3000000);
      })
     ;
  });


  it("cancelACreatedWasteChase is call by the wasteHunter so failed. only the current wasteOwner can cancel.", function() {
      Extensions.sleep(8000);
      return Extensions.expectedExceptionPromise(function () {
        return aFarWasteInstance.terminateAnExpiredWasteChase(0,{from:wasteHunter, gas: 3000000});
                      },
                      3000000);
  });

  it("terminateAnExpiredWasteChase is call by the sheriff so failed. only the current wasteOwner can terminate.", function() {
      Extensions.sleep(8000);
      return Extensions.expectedExceptionPromise(function () {
        return aFarWasteInstance.terminateAnExpiredWasteChase(0,{from:sheriff, gas: 3000000});
                      },
                      3000000);
  });

  it("terminateAnExpiredWasteChase on a wrong id failed", function() {
    Extensions.sleep(8000);
      return Extensions.expectedExceptionPromise(function () {
        return aFarWasteInstance.terminateAnExpiredWasteChase(1,{from:wasteOwner, gas: 3000000});
                      },
                      3000000);
  });

});



});
