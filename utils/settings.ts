import { ChartType } from "./interfaces/ChartType.enum";

export const settings = {
  retries: 3,
  retryAfterHowManySeconds: 5,
  topRankedCount: 3,
  daysToGetChartFrom: 30,
  artistsInsteadOfSongs: ChartType.Both,
  postOnTwitter: true,
  postOnMastodon: true,
  scheduleEveryHowManyDays: 30
}