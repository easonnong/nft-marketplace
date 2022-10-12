const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) ? describe.skip : describe("Nft Marketplace Unit Tests", function () {
  let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
  const PRICE = ethers.utils.parseEther("0.1")
  const TOKEN_ID = 0

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    user = accounts[1]
    await deployments.fixture(["all"])
    nftMarketplaceContract = await ethers.getContract("NftMarketplace")
    nftMarketplace = nftMarketplaceContract.connect(deployer)
    basicNftContract = await ethers.getContract("BasicNft")
    /*///////////
    console.log(`deployer:${deployer.address}`);
    console.log(`user:${user.address}`);
    console.log(`nftMarketplace:${nftMarketplaceContract.address}`);
    console.log(`basicNft:${basicNftContract.address}`);
    ///////////*/
    basicNft = basicNftContract.connect(deployer)
    await basicNft.mintNft()
    await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID)
  })

  describe("listItem", function () {
    it("emits an event after listing an item", async () => {
      expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit("ItemListed")
    })
    it("exclusively allows owners to list", async () => {
      nftMarketplace = nftMarketplaceContract.connect(user)
      await basicNft.approve(user.address, TOKEN_ID)
      await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.be.revertedWith("NotOwner")
    })
    it("needs approvals to list item", async () => {
      await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
      await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.be.revertedWith("NotApprovedForMarketplace")
    })
  })

})

