import { ChartType } from "./interfaces/ChartType.enum";

export const settings = {
  retries: 3,
  retryAfterHowManySeconds: 5,
  topRankedCount: 3,
  daysToGetChartFrom: 30,
  chartContentType: ChartType.Both, // Artists, Tracks or Both
  postOnTwitter: false,
  postOnMastodon: false,
  postOnMisskey: false,
  postOnPleroma: false
}