import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type UpcomingOrder = {
  orderName: string;
  orderType: string;
  status: string;
  orderedDate: string;
  orderedByProvider: string;
  facilityName: string;
}

type OrderResponse = {
  orderName?: string;
  orderType?: string;
  status?: string;
  orderedDate?: string;
  orderedByProvider?: string;
  facilityName?: string;
}

type GetUpcomingOrdersResponse = {
  orders?: OrderResponse[];
}

export async function getUpcomingOrders(mychartRequest: MyChartRequest): Promise<UpcomingOrder[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/upcoming-orders' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for upcoming orders');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/upcoming-orders/GetUpcomingOrders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: GetUpcomingOrdersResponse = await resp.json();

  return (json.orders || []).map((o: OrderResponse) => ({
    orderName: o.orderName || '',
    orderType: o.orderType || '',
    status: o.status || '',
    orderedDate: o.orderedDate || '',
    orderedByProvider: o.orderedByProvider || '',
    facilityName: o.facilityName || '',
  }));
}
