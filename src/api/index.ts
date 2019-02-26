import currencyToSymbolMap from 'currency-symbol-map/map'

class Api {

  public path = 'https://api.exchangeratesapi.io/'
  private _rates: string

  get endpoint(): string {
    return this.path + 'latest'
  }

  currencyToSymbolMap: object = currencyToSymbolMap

  countryToCurrencyMap: object = Object.keys(currencyToSymbolMap).reduce((map, currency) => {
    const country = currency.substr(0, currency.length - 1 )
    map[country] = currency
    return map
  }, {})

  async rates() {
    if (this._rates) return this._rates
    const req = await fetch(this.endpoint)
    const json = await req.json()
    this._rates = json.rates
    return json.rates
  }

  async convert(from: string, to: string, amount: number = 1): Promise<number> {
    const rates = await this.rates()
    const euros = 1/rates[from]
    return euros * rates[to] * amount
  }

}

export default Api