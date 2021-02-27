import Bottleneck from 'bottleneck'

import qs from 'qs'
import isofetch from 'isomorphic-unfetch'

import urls from './urls.js'
import parse from './parse.js'

import {
  RawAccount,
  Account,
  Order,
  Position,
  Asset,
  Watchlist,
  Calendar,
  Clock,
  AccountConfigurations,
  PortfolioHistory,
  RawOrder,
  RawPosition,
  RawActivity,
  Activity,
  DefaultCredentials,
  OAuthCredentials,
  OrderCancelation,
  RawOrderCancelation,
  PageOfTrades,
  PageOfQuotes,
  PageOfBars,
} from './entities.js'

import {
  GetOrder,
  GetOrders,
  PlaceOrder,
  ReplaceOrder,
  CancelOrder,
  GetPosition,
  ClosePosition,
  GetAsset,
  GetAssets,
  GetWatchList,
  CreateWatchList,
  UpdateWatchList,
  AddToWatchList,
  RemoveFromWatchList,
  DeleteWatchList,
  GetCalendar,
  UpdateAccountConfigurations,
  GetAccountActivities,
  GetPortfolioHistory,
  GetBars,
  GetTrades,
  GetQuotes,
} from './params.js'

const unifetch = typeof fetch !== 'undefined' ? fetch : isofetch
export class AlpacaClient {
  private limiter = new Bottleneck({
    reservoir: 200, // initial value
    reservoirRefreshAmount: 200,
    reservoirRefreshInterval: 60 * 1000, // must be divisible by 250
    // also use maxConcurrent and/or minTime for safety
    maxConcurrent: 1,
    minTime: 200,
  })

  constructor(
    public params: {
      credentials?: DefaultCredentials | OAuthCredentials
      rate_limit?: boolean
    },
  ) {
    if (
      // if not specified
      !('paper' in params.credentials) &&
      // and live key isn't already provided
      !('key' in params.credentials && params.credentials.key.startsWith('A'))
    ) {
      params.credentials['paper'] = true
    }

    if (
      'access_token' in params.credentials &&
      ('key' in params.credentials || 'secret' in params.credentials)
    ) {
      throw new Error(
        "can't create client with both default and oauth credentials",
      )
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getAccount()
      return true
    } catch {
      return false
    }
  }

  async getAccount(): Promise<Account> {
    return parse.account(
      await this.request<RawAccount>('GET', urls.rest.account, 'account'),
    )
  }

  async getOrder(params: GetOrder): Promise<Order> {
    return parse.order(
      await this.request<RawOrder>(
        'GET',
        urls.rest.account,
        `orders/${params.order_id || params.client_order_id}`,
        undefined,
        { nested: params.nested },
      ),
    )
  }

  async getOrders(params?: GetOrders): Promise<Order[]> {
    return parse.orders(
      await this.request<RawOrder[]>(
        'GET',
        urls.rest.account,
        `orders`,
        undefined,
        params,
      ),
    )
  }

  async placeOrder(params: PlaceOrder): Promise<Order> {
    return parse.order(
      await this.request<RawOrder>('POST', urls.rest.account, `orders`, params),
    )
  }

  async replaceOrder(params: ReplaceOrder): Promise<Order> {
    return parse.order(
      await this.request<RawOrder>(
        'PATCH',
        urls.rest.account,
        `orders/${params.order_id}`,
        params,
      ),
    )
  }

  cancelOrder(params: CancelOrder): Promise<Boolean> {
    return this.request<Boolean>(
      'DELETE',
      urls.rest.account,
      `orders/${params.order_id}`,
      undefined,
      undefined,
      false,
    )
  }

  async cancelOrders(): Promise<OrderCancelation[]> {
    return parse.canceled_orders(
      await this.request<RawOrderCancelation[]>(
        'DELETE',
        urls.rest.account,
        `orders`,
      ),
    )
  }

  async getPosition(params: GetPosition): Promise<Position> {
    return parse.position(
      await this.request<RawPosition>(
        'GET',
        urls.rest.account,
        `positions/${params.symbol}`,
      ),
    )
  }

  async getPositions(): Promise<Position[]> {
    return parse.positions(
      await this.request<RawPosition[]>('GET', urls.rest.account, `positions`),
    )
  }

  async closePosition(params: ClosePosition): Promise<Order> {
    return parse.order(
      await this.request<RawOrder>(
        'DELETE',
        urls.rest.account,
        `positions/${params.symbol}`,
      ),
    )
  }

  async closePositions(): Promise<Order[]> {
    return parse.orders(
      await this.request<RawOrder[]>('DELETE', urls.rest.account, `positions`),
    )
  }

  getAsset(params: GetAsset): Promise<Asset> {
    return this.request(
      'GET',
      urls.rest.account,
      `assets/${params.asset_id_or_symbol}`,
    )
  }

  getAssets(params?: GetAssets): Promise<Asset[]> {
    return this.request(
      'GET',
      urls.rest.account,
      `assets?${qs.stringify(params)}`,
    )
  }

  getWatchlist(params: GetWatchList): Promise<Watchlist> {
    return this.request('GET', urls.rest.account, `watchlists/${params.uuid}`)
  }

  getWatchlists(): Promise<Watchlist[]> {
    return this.request('GET', urls.rest.account, `watchlists`)
  }

  createWatchlist(params: CreateWatchList): Promise<Watchlist[]> {
    return this.request('POST', urls.rest.account, `watchlists`, params)
  }

  updateWatchlist(params: UpdateWatchList): Promise<Watchlist> {
    return this.request(
      'PUT',
      urls.rest.account,
      `watchlists/${params.uuid}`,
      params,
    )
  }

  addToWatchlist(params: AddToWatchList): Promise<Watchlist> {
    return this.request(
      'POST',
      urls.rest.account,
      `watchlists/${params.uuid}`,
      params,
    )
  }

  removeFromWatchlist(params: RemoveFromWatchList): Promise<Boolean> {
    return this.request<Boolean>(
      'DELETE',
      urls.rest.account,
      `watchlists/${params.uuid}/${params.symbol}`,
      undefined,
      undefined,
      false,
    )
  }

  deleteWatchlist(params: DeleteWatchList): Promise<Boolean> {
    return this.request<Boolean>(
      'DELETE',
      urls.rest.account,
      `watchlists/${params.uuid}`,
      undefined,
      undefined,
      false,
    )
  }

  getCalendar(params?: GetCalendar): Promise<Calendar[]> {
    return this.request('GET', urls.rest.account, `calendar`, undefined, params)
  }

  async getClock(): Promise<Clock> {
    return parse.clock(await this.request('GET', urls.rest.account, `clock`))
  }

  getAccountConfigurations(): Promise<AccountConfigurations> {
    return this.request('GET', urls.rest.account, `account/configurations`)
  }

  updateAccountConfigurations(
    params: UpdateAccountConfigurations,
  ): Promise<AccountConfigurations> {
    return this.request(
      'PATCH',
      urls.rest.account,
      `account/configurations`,
      params,
    )
  }

  async getAccountActivities(
    params: GetAccountActivities,
  ): Promise<Activity[]> {
    if (params.activity_types && Array.isArray(params.activity_types)) {
      params.activity_types = params.activity_types.join(',')
    }

    return parse.activities(
      await this.request<RawActivity[]>(
        'GET',
        urls.rest.account,
        `account/activities${
          params.activity_type ? '/'.concat(params.activity_type) : ''
        }`,
        undefined,
        params,
      ),
    )
  }

  getPortfolioHistory(params?: GetPortfolioHistory): Promise<PortfolioHistory> {
    return this.request(
      'GET',
      urls.rest.account,
      `account/portfolio/history`,
      undefined,
      params,
    )
  }

  async getTrades(params: GetTrades): Promise<PageOfTrades> {
    return parse.pageOfTrades(
      await this.request(
        'GET',
        urls.rest.market_data,
        `stocks/${params.symbol}/trades`,
        undefined,
        params,
      ),
    )
  }

  async getQuotes(params: GetQuotes): Promise<PageOfQuotes> {
    return parse.pageOfQuotes(
      await this.request(
        'GET',
        urls.rest.market_data,
        `stocks/${params.symbol}/quotes`,
        undefined,
        params,
      ),
    )
  }

  async getBars(params: GetBars): Promise<PageOfBars> {
    return parse.pageOfBars(
      await this.request(
        'GET',
        urls.rest.market_data,
        `stocks/${params.symbol}/bars`,
        undefined,
        params,
      ),
    )
  }

  private async request<T = any>(
    method: string,
    url: string,
    endpoint: string,
    body?: { [key: string]: any },
    query?: { [key: string]: any },
    isJson: boolean = true,
  ): Promise<T> {
    let headers: any = {}

    if ('access_token' in this.params.credentials) {
      headers[
        'Authorization'
      ] = `Bearer ${this.params.credentials.access_token}`
      url == urls.rest.account
    } else {
      headers['APCA-API-KEY-ID'] = this.params.credentials.key
      headers['APCA-API-SECRET-KEY'] = this.params.credentials.secret
      if (this.params.credentials.paper && url == urls.rest.account) {
        url = urls.rest.account.replace('api.', 'paper-api.')
      }
    }

    if (query) {
      // translate dates to ISO strings
      for (let [key, value] of Object.entries(query)) {
        if (value instanceof Date) {
          query[key] = (value as Date).toISOString()
        }
      }
    }

    const makeCall = () =>
      unifetch(
        `${url}/${endpoint}${query ? '?'.concat(qs.stringify(query)) : ''}`,
        {
          method: method,
          headers,
          body: JSON.stringify(body),
        },
      )
    const func = this.params.rate_limit
      ? () => this.limiter.schedule(makeCall)
      : makeCall

    let resp
    let result = {}
    try {
      resp = await func()

      if (!isJson) return resp.ok as any

      result = await resp.json()
    } catch (e) {
      console.error(e)
      throw result
    }

    if ('code' in result || 'message' in result) throw result

    return result as any
  }
}
