import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type ActivityFeedItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  isRead: boolean;
}

type FeedItemResponse = {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  type?: string;
  isRead?: boolean;
}

type FetchItemFeedResponse = {
  items?: FeedItemResponse[];
}

export async function getActivityFeed(mychartRequest: MyChartRequest): Promise<ActivityFeedItem[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/home' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for activity feed');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/item-feed/FetchItemFeed',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({ maxItems: 50, offset: 0 }),
  });

  const json: FetchItemFeedResponse = await resp.json();

  return (json.items || []).map((item: FeedItemResponse) => ({
    id: item.id || '',
    title: item.title || '',
    description: item.description || '',
    date: item.date || '',
    type: item.type || '',
    isRead: item.isRead || false,
  }));
}
