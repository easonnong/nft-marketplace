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
        it("updates cancel item price to 0", async () => {
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

      describe("buyItem")
    })