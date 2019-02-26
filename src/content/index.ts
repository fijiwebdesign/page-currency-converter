import Api from '../api'
const debug = require('debug')('pcc-extension:content')

const newNodeClassName = 'currency-converted'

const api = new Api()
const symbols = Object.values(api.currencyToSymbolMap)
const currencies = Object.keys(api.currencyToSymbolMap)
const countries = Object.keys(api.countryToCurrencyMap)

const matchCurrency = matchArray(currencies)
const matchSymbol = matchArray(symbols.map(symbol => escapeRegex(symbol)))
const matchCountry = matchArray(countries)
const matchCurrencyOrCountry = '(' + matchCurrency + '|' + matchCountry + ')'
const matchAnySpaces = '([ ]+)?'
const matchAmount = '([0-9]+[0-9,. ]*)'
const regexCurrencyValues = new RegExp(matchCurrencyOrCountry + matchAnySpaces + matchSymbol + matchAmount, 'g')

debug('Loaded content script!!')

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchArray(list: string[]) {
  return '(' + list.join('|') + ')'
}

async function convertStringCurrency(text: string, currencyTo: string = 'USD') {
  const country = text.match(new RegExp(matchCountry)).pop()
  const currencyFrom = api.countryToCurrencyMap[country]
  const amount = text.match(new RegExp(matchAmount)).pop().replace(',', '')
  return await api.convert(currencyFrom, currencyTo, parseFloat(amount))
}

async function convertNodeCurrency(node: HTMLElement, rates: object, regexCurrencyValues: RegExp) {
  const matches = node.textContent.match(regexCurrencyValues)
  debug('convert', { matches, text: node.textContent, node })
  if (!matches) return
  debug('matched', { node, matches, parent: node.parentNode })
  let currText = node.textContent
  const conversions = matches.map(async match => {
    const convertedCurrency = await convertStringCurrency(match)
    const fixedCurrency = convertedCurrency.toFixed(2).toString()
    debug('matched convert', { node, match, fixedCurrency, currText })
    currText = currText.replace(match, '$' + fixedCurrency)
    debug('matched converted', { node, match, fixedCurrency, currText })
  })
  await Promise.all(conversions)
  debug('matched appending', { node, currText })
  const newNode = document.createElement('a')
  newNode.textContent = currText
  newNode.className = newNodeClassName
  node.parentNode.appendChild(newNode)
}

function getTextNodes(node: HTMLElement = document.body) {
  const walker = document.createTreeWalker(
      node, 
      NodeFilter.SHOW_TEXT, 
      null, 
      false
  )
  let textNode, textNodes = []
  while(textNode = walker.nextNode()) {
      textNodes.push(textNode)
  }
  return textNodes
}

async function convertPageCurrencies() {
  const rates = await api.rates()
  const createdNodes = Array.from(document.getElementsByClassName(newNodeClassName))
  createdNodes.forEach(node => node.parentNode.removeChild(node))
  const textNodes = getTextNodes()
  textNodes.forEach(node => convertNodeCurrency(node, rates, regexCurrencyValues))

}

const mutationTimeout = 500
let mutationTimer = null
function onDomMutation(mutationsList, observer) {
  debug('mutation', { mutationsList, observer })
  const changedNodes = [ 
    ...mutationsList.map(item => [...item.addedNodes]).flat(), 
    ...mutationsList.map(item => [...item.removedNodes]).flat()
  ]
  if (changedNodes.length > 0) {
    const nodeNotCreated = changedNodes.find(node => node.className !== newNodeClassName)
    if (nodeNotCreated) {
      debug('found a change in a node we did not create', { changedNodes, nodeNotCreated, className: nodeNotCreated.className, newNodeClassName })
      clearTimeout(mutationTimer)
      mutationTimer = setTimeout(() => convertPageCurrencies(), mutationTimeout)
    }
  }
}

window.addEventListener('load', () => {
  convertPageCurrencies()
})

const observer = new MutationObserver(onDomMutation)
observer.observe(document.body, { attributes: true, childList: true, subtree: true })
