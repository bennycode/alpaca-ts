import Bottleneck from 'bottleneck';
import qs from 'qs';
import isofetch from 'isomorphic-unfetch';
import urls from './urls.js';
import parse from './parse.js';
const unifetch = typeof fetch !== 'undefined' ? fetch : isofetch;
export class AlpacaClient {
    constructor(params) {
        this.params = params;
        this.limiter = new Bottleneck({
            reservoir: 200,
            reservoirRefreshAmount: 200,
            reservoirRefreshInterval: 60 * 1000,
            // also use maxConcurrent and/or minTime for safety
            maxConcurrent: 1,
            minTime: 200,
        });
        if (
        // if not specified
        !('paper' in params.credentials) &&
            // and live key isn't already provided
            !('key' in params.credentials && params.credentials.key.startsWith('A'))) {
            params.credentials['paper'] = true;
        }
        if ('access_token' in params.credentials &&
            ('key' in params.credentials || 'secret' in params.credentials)) {
            throw new Error("can't create client with both default and oauth credentials");
        }
    }
    async isAuthenticated() {
        try {
            await this.getAccount();
            return true;
        }
        catch {
            return false;
        }
    }
    async getAccount() {
        return parse.account(await this.request('GET', urls.rest.account, 'account'));
    }
    async getOrder(params) {
        return parse.order(await this.request('GET', urls.rest.account, `orders/${params.order_id || params.client_order_id}`, undefined, { nested: params.nested }));
    }
    async getOrders(params) {
        return parse.orders(await this.request('GET', urls.rest.account, `orders`, undefined, params));
    }
    async placeOrder(params) {
        return parse.order(await this.request('POST', urls.rest.account, `orders`, params));
    }
    async replaceOrder(params) {
        return parse.order(await this.request('PATCH', urls.rest.account, `orders/${params.order_id}`, params));
    }
    cancelOrder(params) {
        return this.request('DELETE', urls.rest.account, `orders/${params.order_id}`, undefined, undefined, false);
    }
    async cancelOrders() {
        return parse.canceled_orders(await this.request('DELETE', urls.rest.account, `orders`));
    }
    async getPosition(params) {
        return parse.position(await this.request('GET', urls.rest.account, `positions/${params.symbol}`));
    }
    async getPositions() {
        return parse.positions(await this.request('GET', urls.rest.account, `positions`));
    }
    async closePosition(params) {
        return parse.order(await this.request('DELETE', urls.rest.account, `positions/${params.symbol}`));
    }
    async closePositions() {
        return parse.orders(await this.request('DELETE', urls.rest.account, `positions`));
    }
    getAsset(params) {
        return this.request('GET', urls.rest.account, `assets/${params.asset_id_or_symbol}`);
    }
    getAssets(params) {
        return this.request('GET', urls.rest.account, `assets?${qs.stringify(params)}`);
    }
    getWatchlist(params) {
        return this.request('GET', urls.rest.account, `watchlists/${params.uuid}`);
    }
    getWatchlists() {
        return this.request('GET', urls.rest.account, `watchlists`);
    }
    createWatchlist(params) {
        return this.request('POST', urls.rest.account, `watchlists`, params);
    }
    updateWatchlist(params) {
        return this.request('PUT', urls.rest.account, `watchlists/${params.uuid}`, params);
    }
    addToWatchlist(params) {
        return this.request('POST', urls.rest.account, `watchlists/${params.uuid}`, params);
    }
    removeFromWatchlist(params) {
        return this.request('DELETE', urls.rest.account, `watchlists/${params.uuid}/${params.symbol}`, undefined, undefined, false);
    }
    deleteWatchlist(params) {
        return this.request('DELETE', urls.rest.account, `watchlists/${params.uuid}`, undefined, undefined, false);
    }
    getCalendar(params) {
        return this.request('GET', urls.rest.account, `calendar`, undefined, params);
    }
    async getClock() {
        return parse.clock(await this.request('GET', urls.rest.account, `clock`));
    }
    getAccountConfigurations() {
        return this.request('GET', urls.rest.account, `account/configurations`);
    }
    updateAccountConfigurations(params) {
        return this.request('PATCH', urls.rest.account, `account/configurations`, params);
    }
    async getAccountActivities(params) {
        if (params.activity_types && Array.isArray(params.activity_types)) {
            params.activity_types = params.activity_types.join(',');
        }
        return parse.activities(await this.request('GET', urls.rest.account, `account/activities${params.activity_type ? '/'.concat(params.activity_type) : ''}`, undefined, params));
    }
    getPortfolioHistory(params) {
        return this.request('GET', urls.rest.account, `account/portfolio/history`, undefined, params);
    }
    async getTrades(params) {
        return parse.pageOfTrades(await this.request('GET', urls.rest.market_data, `stocks/${params.symbol}/trades`, undefined, params));
    }
    async getQuotes(params) {
        return parse.pageOfQuotes(await this.request('GET', urls.rest.market_data, `stocks/${params.symbol}/quotes`, undefined, params));
    }
    async getBars(params) {
        return parse.pageOfBars(await this.request('GET', urls.rest.market_data, `stocks/${params.symbol}/bars`, undefined, params));
    }
    async request(method, url, endpoint, body, query, isJson = true) {
        let headers = {};
        if ('access_token' in this.params.credentials) {
            headers['Authorization'] = `Bearer ${this.params.credentials.access_token}`;
            url == urls.rest.account;
        }
        else {
            headers['APCA-API-KEY-ID'] = this.params.credentials.key;
            headers['APCA-API-SECRET-KEY'] = this.params.credentials.secret;
            if (this.params.credentials.paper && url == urls.rest.account) {
                url = urls.rest.account.replace('api.', 'paper-api.');
            }
        }
        if (query) {
            // translate dates to ISO strings
            for (let [key, value] of Object.entries(query)) {
                if (value instanceof Date) {
                    query[key] = value.toISOString();
                }
            }
        }
        const makeCall = () => unifetch(`${url}/${endpoint}${query ? '?'.concat(qs.stringify(query)) : ''}`, {
            method: method,
            headers,
            body: JSON.stringify(body),
        });
        const func = this.params.rate_limit
            ? () => this.limiter.schedule(makeCall)
            : makeCall;
        let resp;
        let result = {};
        try {
            resp = await func();
            if (!isJson)
                return resp.ok;
            result = await resp.json();
        }
        catch (e) {
            console.error(e);
            throw result;
        }
        if ('code' in result || 'message' in result)
            throw result;
        return result;
    }
}
