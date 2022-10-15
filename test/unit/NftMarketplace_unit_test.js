const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
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
      }

      describe("listItem", function () {
        it("emits an event after listing an item", async () => {
          await loadFixture(deployContractLockFixture)
          console.log(`nftMarketplace address:${nftMarketplace.address}`)
          console.log(`nftMarketplaceContract:${nftMarketplaceContract.address}`)
          await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.be.emit(
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
