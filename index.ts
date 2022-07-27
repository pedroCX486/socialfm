import axios from "axios";

import twitter from 'twitter-lite';
import Mastodon from 'mastodon';

import { lastFmKeys } from "./utils/auth/lastfm-auth-data"
import { twitterKeys, twitterUserData } from "./utils/auth/twitter-auth-data";
import { mastodonAuthData } from "./utils/auth/mastodon-auth-data";

import { LastFMArtistChart } from "./utils/interfaces/ILastFmArtistChart";
import { Artist } from "./utils/interfaces/IArtist";
import { LastFMTrackChart } from "./utils/interfaces/ILastFmTrackChart";
import { Track } from "./utils/interfaces/ITrack";

import { generateUnixTimestamp, parseLastFmResponse, parseDayString, setTimeoutPlus } from "./utils/helpers";
import { settings } from "./utils/settings";
import { ChartType } from "./utils/interfaces/ChartType.enum";

const twitterClient = new twitter(twitterKeys);
const mastodonClient = new Mastodon(mastodonAuthData);

let lastFmErrorCount = 0;
let twitterErrorCount = 0;
let mastodonErrorCount = 0;

const init = (): void => {
  console.log('\nStarting...');

  createNextSchedule();

  switch (settings.artistsInsteadOfSongs) {
    case ChartType.Artists: {
      getLastFMArtistChart();
      break;
    }
    case ChartType.Tracks: {
      getLastFMTrackChart();
      break;
    }
    case ChartType.Both: {
      getLastFMArtistChart();
      getLastFMTrackChart();
      break;
    }
    default: {
      console.error('Probable invalid setting detected. Exiting.');
      process.exit();
    }
  }
}

const getLastFMTrackChart = (): void => {
  axios.get('http://ws.audioscrobbler.com/2.0/', {
    params: {
      method: 'user.getWeeklyTrackChart',
      user: lastFmKeys.lastFmUsername,
      from: generateUnixTimestamp(settings.daysToGetChartFrom),
      to: generateUnixTimestamp(),
      api_key: lastFmKeys.lastFmApiKey,
      format: 'json'
    }
  }).then(response => {
    prepareTootweet(parseLastFmResponse(response.data), ChartType.Tracks);
    lastFmErrorCount = 0;
  }).catch(error => {
    console.error('\nError when fetching data from Last.FM:', error);
    lastFmErrorCount++;

    // Retry or else exit this cycle and try next scheduled cycle if it keeps failing.
    if (lastFmErrorCount < settings.retries) {
      console.log(`\nRetrying in ${settings.retryAfterHowManySeconds / 1000} seconds...`);
      setTimeout(() => {
        getLastFMTrackChart();
      }, settings.retryAfterHowManySeconds);
    } else {
      return
    }
  });
}

const getLastFMArtistChart = (): void => {
  axios.get('http://ws.audioscrobbler.com/2.0/', {
    params: {
      method: 'user.getWeeklyArtistChart',
      user: lastFmKeys.lastFmUsername,
      from: generateUnixTimestamp(settings.daysToGetChartFrom),
      to: generateUnixTimestamp(),
      api_key: lastFmKeys.lastFmApiKey,
      format: 'json'
    }
  }).then(response => {
    preparePost(parseLastFmResponse(response.data), ChartType.Artists);
    lastFmErrorCount = 0;
  }).catch(error => {
    console.error('\nError when fetching data from Last.FM:', error);
    lastFmErrorCount++;

    // Retry or else exit this cycle and try next scheduled cycle if it keeps failing.
    if (lastFmErrorCount < settings.retries) {
      console.log(`\nRetrying in ${settings.retryAfterHowManySeconds} seconds...`);
      setTimeout(() => {
        getLastFMArtistChart();
      }, settings.retryAfterHowManySeconds * 1000);
    } else {
      return
    }
  });
}

const preparePost = async (lastFmData: Object, chartType: ChartType): Promise<void> => {
  let generatedContent =
    `My top ${settings.topRankedCount} #lastfm ${chartType === ChartType.Artists ? 'artists' : 'songs'} `
    + `from the last ${parseDayString(settings.daysToGetChartFrom)}: `;

  let tracks: Track[] = [];
  let artists: Artist[] = [];

  if (chartType === ChartType.Artists) {
    (lastFmData as LastFMArtistChart).weeklyartistchart.artist.forEach(artist => {
      artists.push({ artistName: artist.name, artistPlayCount: artist.playcount });
    });
  } else {
    (lastFmData as LastFMTrackChart).weeklytrackchart.track.forEach(track => {
      tracks.push({ trackArtist: track.artist.text, trackName: track.name, trackPlayCount: track.playcount });
    });
  }

  for (let i = 0; i < settings.topRankedCount; i++) {
    if (chartType === ChartType.Artists) {
      generatedContent += artists[i].artistName + ' (' + artists[i].artistPlayCount + ' plays';
    } else {
      generatedContent += tracks[i].trackName + ' - ' + tracks[i].trackArtist + ' (' + tracks[i].trackPlayCount + ' plays';
    }

    if (i < (settings.topRankedCount - 1)) {
      generatedContent += ') | ';
    } else {
      generatedContent += ') #mastweetfm';
    }
  }

  if (settings.postOnTwitter) {
    await postToTwitter(generatedContent);
  }

  if (settings.postOnMastodon) {
    await postToMastodon(generatedContent);
  }
}

const postToTwitter = async (tweetContent: string): Promise<void> => {
  if (tweetContent.length > 280) {
    console.error(`\nTwitter: Tweet exceeds maximum allowed length of 180 characters. Not tweetin' this one.`);
    return
  }

  await twitterClient.post('statuses/update', { status: tweetContent }).then(response => {
    console.log('\nTweeted: ', `https://twitter.com/${twitterUserData.username}/status/${response.id_str}`);
    twitterErrorCount = 0;
  }).catch(error => {
    console.error('\nError when posting to Twitter:', error.errors[0].message);
    twitterErrorCount++;

    // Retry.
    if (twitterErrorCount < settings.retries) {
      console.log(`\nRetrying in ${settings.retryAfterHowManySeconds} seconds...`);
      setTimeout(() => {
        postToTwitter(tweetContent);
      }, settings.retryAfterHowManySeconds * 1000);
    }
  });
}

const postToMastodon = async (postContent: string): Promise<void> => {
  await mastodonClient.post('statuses', { status: postContent }).then((response: any) => {
    console.log('\nPosted: ', response.data.url);
    mastodonErrorCount = 0;
  }).catch((error: any) => {
    console.error('\nError when posting to Mastodon:', error);
    mastodonErrorCount++;

    // Retry.
    if (mastodonErrorCount < settings.retries) {
      console.log(`\nRetrying in ${settings.retryAfterHowManySeconds} seconds...`);
      setTimeout(() => {
        postToMastodon(postContent);
      }, settings.retryAfterHowManySeconds * 1000);
    }
  });
}

const createNextSchedule = (): void => {
  console.info(`\nScheduled set, running again in ${settings.scheduleEveryHowManyDays} days.`);

  setTimeoutPlus(() => {
    init();
  }, settings.scheduleEveryHowManyDays);
}

console.log('\n#mastweetfm by @pedrocx486 - WTFPL');
init();
