/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AssetClass } from "./AssetClass";
import type { OrderClass } from "./OrderClass";
import type { OrderSide } from "./OrderSide";
import type { OrderStatus } from "./OrderStatus";
import type { OrderType } from "./OrderType";
import type { TimeInForce } from "./TimeInForce";

/**
 * The Orders API allows a user to monitor, place and cancel their orders with Alpaca.
 *
 * Each order has a unique identifier provided by the client. This client-side unique order ID will be automatically generated by the system if not provided by the client, and will be returned as part of the order object along with the rest of the fields described below. Once an order is placed, it can be queried using the client-side order ID to check the status.
 *
 * Updates on open orders at Alpaca will also be sent over the streaming interface, which is the recommended method of maintaining order state.
 */
export type Order = {
  /**
   * Order ID
   */
  id?: string;
  /**
   * Client unique order ID
   */
  client_order_id?: string;
  created_at?: string;
  updated_at?: string | null;
  submitted_at?: string | null;
  filled_at?: string | null;
  expired_at?: string | null;
  canceled_at?: string | null;
  failed_at?: string | null;
  replaced_at?: string | null;
  /**
   * The order ID that this order was replaced by
   */
  replaced_by?: string | null;
  /**
   * The order ID that this order replaces
   */
  replaces?: string | null;
  /**
   * Asset ID
   */
  asset_id?: string;
  /**
   * Asset symbol
   */
  symbol: string;
  asset_class?: AssetClass;
  /**
   * Ordered notional amount. If entered, qty will be null. Can take up to 9 decimal points.
   */
  notional: string | null;
  /**
   * Ordered quantity. If entered, notional will be null. Can take up to 9 decimal points.
   */
  qty: string | null;
  /**
   * Filled quantity
   */
  filled_qty?: string;
  /**
   * Filled average price
   */
  filled_avg_price?: string | null;
  order_class?: OrderClass;
  /**
   * Deprecated in favour of the field "type"
   * @deprecated
   */
  order_type?: string;
  type: OrderType;
  side: OrderSide;
  time_in_force: TimeInForce;
  /**
   * Limit price
   */
  limit_price?: string | null;
  /**
   * Stop price
   */
  stop_price?: string | null;
  status?: OrderStatus;
  /**
   * If true, eligible for execution outside regular trading hours.
   */
  extended_hours?: boolean;
  /**
   * When querying non-simple order_class orders in a nested style, an array of Order entities associated with this order. Otherwise, null.
   */
  legs?: Array<Order> | null;
  /**
   * The percent value away from the high water mark for trailing stop orders.
   */
  trail_percent?: string;
  /**
   * The dollar value away from the high water mark for trailing stop orders.
   */
  trail_price?: string;
  /**
   * The highest (lowest) market price seen since the trailing stop order was submitted.
   */
  hwm?: string;
};
