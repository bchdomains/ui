import { ethers } from 'ethers'
import Web3 from 'web3'
import { IFrameEthereumProvider } from '@ethvault/iframe-provider'
import {contracts} from "./ens"

let provider
let legacyProvider
let signer
let readOnly = false
let requested = false
let address

const defaultNetworkId = 10001
export const _getProvider = (networkId) => {
  switch (networkId) {
    case 10000:
      return new ethers.providers.JsonRpcProvider(getNetworkProviderUrl(networkId),
      {
        name: "smartbch",
        chainId: networkId,
        ensAddress: contracts[networkId].registry
      })
    // case 10001:
    //   return new ethers.providers.JsonRpcProvider(getNetworkProviderUrl(networkId),
    //   {
    //     name: "smartbch-amber",
    //     chainId: networkId,
    //     ensAddress: contracts[networkId].registry
    //   })
    case 10001:
      return new ethers.providers.JsonRpcProvider(getNetworkProviderUrl(networkId),
      {
        name: "ethpow",
        chainId: networkId,
        ensAddress: contracts[networkId].registry
      })
    case 2000:
      return new ethers.providers.JsonRpcProvider(getNetworkProviderUrl(networkId),
      {
        name: "dogechain",
        chainId: networkId,
        ensAddress: contracts[networkId].registry
      })
    case 568:
      return new ethers.providers.JsonRpcProvider(getNetworkProviderUrl(networkId),
      {
        name: "dogechain-testnet",
        chainId: networkId,
        ensAddress: contracts[networkId].registry
      })
    default:
      return new ethers.getDefaultProvider('homestead', 'any')
  }
}

function getDefaultProvider() {
  legacyProvider = new Web3(getNetworkProviderUrl(defaultNetworkId))
  return _getProvider(defaultNetworkId)
}

function getJsonRpcProvider(providerOrUrl) {
  legacyProvider = new Web3(providerOrUrl)
  return new ethers.providers.JsonRpcProvider(providerOrUrl, 'any')
}

function getWeb3Provider(providerOrUrl) {
  legacyProvider = new Web3(providerOrUrl)
  return new ethers.providers.Web3Provider(providerOrUrl, 'any')
}

function getInfuraProvider(infura) {
  legacyProvider = new Web3(`https://mainnet.infura.io/v3/${infura}`)
  return new ethers.providers.InfuraProvider('homestead', infura)
}

export async function setupWeb3({
  customProvider,
  reloadOnAccountsChange = false,
  enforceReadOnly = false,
  enforceReload = false,
  infura = false
}) {
  if(enforceReload){
    provider = null
    readOnly = false
    address = null
  }

  if(enforceReadOnly){
    readOnly = true
    address = null
    if(infura){
      provider = getInfuraProvider(infura)
    }else{
      provider = getDefaultProvider()
    }
    return { provider, signer:undefined }
  }

  if (provider) {
    return { provider, signer }
  }
  if (customProvider) {
    if (typeof customProvider === 'string') {
      // handle raw RPC endpoint URL
      provider = getJsonRpcProvider(customProvider)
      signer = provider.getSigner()
    } else {
      // handle EIP 1193 provider
      provider = getWeb3Provider(customProvider)
    }
    return { provider, signer }
  }

  // If the window is in an iframe, return the iframe provider IFF the iframe provider can be enabled
  if (window && window.parent && window.self && window.self !== window.parent) {
    try {
      const iframeProvider = new IFrameEthereumProvider({
        targetOrigin: 'https://myethvault.com'
      })

      await Promise.race([
        iframeProvider.enable(),
        // Race the enable with a promise that rejects after 1 second
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timed out after 1 second')), 1000)
        )
      ])

      window.web3 = iframeProvider
      window.ethereum = iframeProvider
    } catch (error) {
      console.error('Failed to create and enable iframe provider', error)
    }
  }

  if (window && window.ethereum) {
    provider = getWeb3Provider(window.ethereum)
    signer = provider.getSigner()
    if (window.ethereum.on && reloadOnAccountsChange) {
      address = await signer.getAddress()
      window.ethereum.on('accountsChanged', async function (accounts) {
        address = await signer.getAddress()
        if (accounts[0] !== address) {
          window.location.reload()
        }
      })
    }
    return { provider, signer }
  } else if (window.web3 && window.web3.currentProvider) {
    provider = getWeb3Provider(window.web3.currentProvider)
    const id = (await provider.getNetwork()).chainId
    signer = provider.getSigner()
    return { provider, signer }
  } else {
    try {
      const url = 'http://localhost:8545'
      await fetch(url)
      console.log('local node active')
      provider = getJsonRpcProvider(url)
    } catch (error) {
      if (
        error.readyState === 4 &&
        (error.status === 400 || error.status === 200)
      ) {
        // the endpoint is active
        console.log('Success')
      } else {
        console.log(
          'No web3 instance injected. Falling back to cloud provider.'
        )
        readOnly = true
        provider = getDefaultProvider()
        return { provider, signer }
      }
    }
  }
}

export async function getWeb3() {
  if (!provider) {
    throw new Error(
      'Ethers has not been instantiated, please call setupWeb3() first'
    )
  }
  return provider
}

export async function getWeb3Read() {
  if (!provider) {
    throw new Error(
      'Ethers has not been instantiated, please call setupWeb3() first'
    )
  }
  return provider
}

export function isReadOnly() {
  return readOnly
}

export function getNetworkProviderUrl(id) {
  switch (String(id)) {
    case '1':
      return `https://mainnet.infura.io/v3/90f210707d3c450f847659dc9a3436ea`
    case '3':
      return `https://ropsten.infura.io/v3/90f210707d3c450f847659dc9a3436ea`
    case '4':
      return `https://rinkeby.infura.io/v3/90f210707d3c450f847659dc9a3436ea`
    case '5':
      return `https://goerli.infura.io/v3/90f210707d3c450f847659dc9a3436ea`
    case '10000':
      return `https://smartbch.fountainhead.cash/mainnet`
    // case '10001':
    //   return `https://moeing.tech:9545`
    case '10001':
      return `https://uniwnode.com`
    case '2000':
      return `https://rpc.dogechain.dog`
    case '568':
      return `https://rpc-testnet.dogechain.dog`
    default:
      return `https://mainnet.infura.io/v3/90f210707d3c450f847659dc9a3436ea`
  }
}

export async function getProvider() {
  return getWeb3()
}

export async function getSigner() {
  const provider = await getWeb3()
  try {
    const signer = provider.getSigner()
    await signer.getAddress()
    return signer
  } catch (e) {
    if (window.ethereum) {
      try {
        if (requested === true) return provider
        await window.ethereum.enable()
        const signer = await provider.getSigner()
        await signer.getAddress()
        return signer
      } catch (e) {
        requested = true
        return provider
      }
    } else {
      return provider
    }
  }
}

export async function getAccount() {
  const provider = await getWeb3()
  try {
    const signer = await provider.getSigner()
    const address = await signer.getAddress()
    return address
  } catch (e) {
    return '0x0'
  }
}

export async function getAccounts() {
  try {
    const account = await getAccount()
    if (parseInt(account, 16) !== 0) {
      return [account]
    } else if (window.ethereum) {
      try {
        const accounts = await window.ethereum.enable()
        return accounts
      } catch (error) {
        console.warn('Did not allow app to access dapp browser')
        throw error
      }
    } else {
      return []
    }
  } catch (e) {
    return []
  }
}

export async function getNetworkId() {
  const provider = await getWeb3()
  const network = await provider.getNetwork()
  return network.chainId
}

export async function getNetwork() {
  const provider = await getWeb3()

  // patch networks not reporting their network name
  const network = {...await provider.getNetwork()}
  if (network.chainId === 10000) {
    network.name = "smartbch";
  } else if (network.chainId === 10001) {
    // network.name = "smartbch-amber";
    network.name = "ethpow";
  } else if (network.chainId === 2000) {
    network.name = "dogechain";
  } else if (network.chainId === 568) {
    network.name = "dogechain-testnet";
  }

  return network
}

export async function getBlock(number = 'latest') {
  try {
    const provider = await getWeb3()
    const blockDetails = await provider.getBlock(number)
    return {
      number: blockDetails.number,
      timestamp: blockDetails.timestamp
    }
  } catch (e) {
    console.log('error getting block details', e)
    return {
      number: 0,
      timestamp: 0
    }
  }
}

// This provider is used to pass to dnsprovejs which only supports web3js provider
export function getLegacyProvider(){
  return legacyProvider
}
