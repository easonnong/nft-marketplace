const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { CustomError } = require("hardhat/internal/hardhat-network/stack-traces/model")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Nft Marketplace Unit Tests", function () {
      let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
      const PRICE = ethers.utils.parseEther("0.1")
      const TOKEN_ID = 0

      async function deployContractLockFixture() {
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
        return { user }
      }

      describe("listItem", function () {
        it("exclusively items that haven't been listed", async () => {
          await loadFixture(deployContractLockFixture)
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWithCustomError(nftMarketplace, "AlreadyListed")
        })

        it("exclusively allows owners to list", async () => {
          const { user } = await loadFixture(deployContractLockFixture)
          nftMarketplace = await nftMarketplaceContract.connect(user)
          await basicNft.approve(user.address, TOKEN_ID)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWithCustomError(nftMarketplace, "NotOwner")
        })
        it.only("need approvals to list item", async () => {
          await loadFixture(deployContractLockFixture)
          await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWithCustomError(nftMarketplace, "NotApprovedForMarketplace")
        })
        it("emits an event after listing an item", async () => {
          await loadFixture(deployContractLockFixture)
          await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
            nftMarketplace,
            "ItemListed"
          )
        })
      })

      describe("test", function () {
        it("it test", async () => {
          await loadFixture(deployContractLockFixture)
          console.log(`nftMarketplace address:${nftMarketplace.address}`)
        })
      })
    })
