const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { CustomError } = require("hardhat/internal/hardhat-network/stack-traces/model")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Nft Marketplace Unit Tests", function () {
      const PRICE = ethers.utils.parseEther("0.1")
      const TOKEN_ID = 0

      async function deployContractLockFixture() {
        let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
        const accounts = await ethers.getSigners()
        const deployer = accounts[0]
        const user = accounts[1]
        await deployments.fixture(["all"])
        nftMarketplaceContract = await ethers.getContract("NftMarketplace")
        nftMarketplace = nftMarketplaceContract.connect(deployer)
        basicNftContract = await ethers.getContract("BasicNft")
        basicNft = basicNftContract.connect(deployer)
        await basicNft.mintNft()
        await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID)
        return { nftMarketplace, nftMarketplaceContract, basicNft, deployer, user }
      }

      describe("listItem", function () {
        it("exclusively items that haven't been listed", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWithCustomError(nftMarketplace, "AlreadyListed")
        })

        it("exclusively allows owners to list", async () => {
          let { nftMarketplace, nftMarketplaceContract, basicNft, user } = await loadFixture(
            deployContractLockFixture
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await basicNft.approve(user.address, TOKEN_ID)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWithCustomError(nftMarketplace, "NotOwner")
        })
        it("need approvals to list item", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWithCustomError(nftMarketplace, "NotApprovedForMarketplace")
        })
        it("updates listing with seller and price", async () => {
          let { nftMarketplace, basicNft, deployer } = await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
          assert(listing.price.toString() == PRICE.toString())
          assert(listing.seller.toString() == deployer.address)
        })
        it("emits an event after listing an item", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
            nftMarketplace,
            "ItemListed"
          )
        })
      })

      describe("cancelListing", function () {
        it("reverts if anyone but the owner tries to call", async () => {
          let { nftMarketplace, nftMarketplaceContract, basicNft, user } = await loadFixture(
            deployContractLockFixture
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await basicNft.approve(user.address, TOKEN_ID)
          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWithCustomError(nftMarketplace, "NotOwner")
        })
        it("reverts if there is no listing", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWithCustomError(nftMarketplace, "NotListed")
        })
        it("updates canceled item price to zero", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          let listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
          let price = ethers.utils.formatEther(listing.price)
          // assert(listing.price.toString()=="0")
          expect(Number(price)).to.be.greaterThan(0)
          await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
          price = ethers.utils.formatEther(listing.price)
          expect(Number(price)).to.be.eq(0)
        })
        it("emits event after cancel listing", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await expect(nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
            nftMarketplace,
            "ItemCanceled"
          )
        })
      })

      describe("buyItem", function () {
        it("reverts if the item isnt listed", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
          ).to.be.revertedWithCustomError(nftMarketplace, "NotListed")
        })
        it("reverts if the price isnt met", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
          ).to.be.revertedWithCustomError(nftMarketplace, "PriceNotMet")
        })
        it("updates buyed item price to zero", async () => {
          let { nftMarketplace, nftMarketplaceContract, basicNft, user } = await loadFixture(
            deployContractLockFixture
          )
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          let listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
          assert(listing.price.toString() == "0")
        })
        it("transfers the nft to the buyer and updates internal proceeds record", async () => {
          let { nftMarketplace, nftMarketplaceContract, basicNft, deployer, user } =
            await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          let ownerOfNft = await basicNft.ownerOf(TOKEN_ID)
          assert(ownerOfNft == deployer.address)
          let proceeds = await nftMarketplace.getProceeds(deployer.address)
          assert(proceeds.toString() == "0")
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          ).to.be.emit(nftMarketplace, "ItemBought")
          ownerOfNft = await basicNft.ownerOf(TOKEN_ID)
          assert(ownerOfNft == user.address)
          proceeds = await nftMarketplace.getProceeds(deployer.address)
          assert(proceeds.toString() == PRICE.toString())
        })
      })

      describe("updateListing", function () {
        it("must be owner and listed", async () => {
          let { nftMarketplace, nftMarketplaceContract, basicNft, user } = await loadFixture(
            deployContractLockFixture
          )
          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWithCustomError(nftMarketplace, "NotListed")
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          let updatedPrice = ethers.utils.parseEther("0.2")
          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, updatedPrice)
          ).to.be.revertedWithCustomError(nftMarketplace, "NotOwner")
        })
        it("reverts if the update price is less than or equal to zero", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          let updatedPrice = ethers.utils.parseEther("0")

          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, updatedPrice)
          ).to.be.revertedWithCustomError(nftMarketplace, "PriceMustBeAboveZero")
        })
        it("updates the price of the item and emits ItemListed", async () => {
          let { nftMarketplace, basicNft } = await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          let listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
          assert(listing.price.toString() == PRICE.toString())
          let updatedPrice = ethers.utils.parseEther("0.2")
          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, updatedPrice)
          ).to.emit(nftMarketplace, "ItemListed")
          listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
          assert(listing.price.toString() == updatedPrice.toString())
        })
      })

      describe("withdrawProceeds", function () {
        it("doesn't allow 0 proceed withdraws", async () => {
          let { nftMarketplace } = await loadFixture(deployContractLockFixture)
          await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWithCustomError(
            nftMarketplace,
            "NotProceeds"
          )
        })
        it("withdraws proceeds", async () => {
          let { nftMarketplace, nftMarketplaceContract, basicNft, deployer, user } =
            await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          //console.log(`nftMarketplace balance=${await ethers.provider.getBalance(nftMarketplace.address)}`)
          nftMarketplace = nftMarketplaceContract.connect(deployer)
          const deployerProceedBefore = await nftMarketplace.getProceeds(deployer.address)
          const deployerBalanceBefore = await deployer.getBalance()
          //console.log(`deployerProceedBefore=${deployerProceedBefore.toString()}`)
          //console.log(`deployerBalanceBefore=${deployerBalanceBefore.toString()}`)
          const txResponse = await nftMarketplace.withdrawProceeds()
          const transactionReceipt = await txResponse.wait(1)
          const { gasUsed, effectiveGasPrice } = transactionReceipt
          //console.log(`gasUsed:${gasUsed.toString()} type:${typeof gasUsed}`)
          //console.log(`effectiveGasPrice:${effectiveGasPrice.toString()} type:${typeof effectiveGasPrice}`)
          const gasCost = gasUsed.mul(effectiveGasPrice)
          //console.log(`gasCost=${gasCost.toString()} type:${typeof gasCost}`)
          const deployerProceedAfter = await nftMarketplace.getProceeds(deployer.address)
          const deployerBalanceAfter = await deployer.getBalance()
          //console.log(`deployerProceedAfter=${deployerProceedAfter.toString()}`)
          //console.log(`deployerBalanceAfter=${deployerBalanceAfter.toString()}`)
          assert(
            deployerBalanceAfter.add(gasCost).toString() ==
              deployerProceedBefore.add(deployerBalanceBefore).toString()
          )
        })
      })
    })
