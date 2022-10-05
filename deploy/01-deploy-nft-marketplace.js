const { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const {deploy,log}=deployments
    const {deployer}=await getNamedAccounts()
    const waitBlockConfirmations = 
}
