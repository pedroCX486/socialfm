import axios from "axios";

import twitter from 'twitter-lite';

import { lastFmKeys } from "./utils/auth/lastfm-auth-data"
import { twitterKeys, twitterUserData } from "./utils/auth/twitter-auth-data";
import { mastodonAuthData } from "./utils/auth/mastodon-auth-data";
import { misskeyAuthData } from "./utils/auth/misskey-auth-data";
import { pleromaAuthData } from "./utils/auth/pleroma-auth-data";

import { LastFMArtistChart } from "./utils/interfaces/ILastFmArtistChart";
import { Artist } from "./utils/interfaces/IArtist";
import { LastFMTrackChart } from "./utils/interfaces/ILastFmTrackChart";
import { Track } from "./utils/interfaces/ITrack";

import { generateUnixTimestamp, parseLastFmResponse, parseDayString } from "./utils/helpers";
import { settings } from "./utils/settings";
import { ChartType } from "./utils/interfaces/ChartType.enum";

const twitterClient = new twitter(twitterKeys);
import generator, { Entity, Response } from 'megalodon';

let lastFmErrorCount = 0;
let twitterErrorCount = 0;
let mastodonErrorCount = 0;
let misskeyErrorCount = 0;
let pleromaErrorCount = 0;

const getLastFMTrackChart = (): void => {
  axios.get('https://ws.audioscrobbler.com/2.0/', {
    params: {
      method: 'user.getWeeklyTrackChart',
      user: lastFmKeys.lastFmUsername,
      from: generateUnixTimestamp(settings.daysToGetChartFrom),
      to: generateUnixTimestamp(),
      api_key: lastFmKeys.lastFmApiKey,
      format: 'json'
    }
  }).then(response => {
    preparePost(parseLastFmResponse(response.data), ChartType.Tracks);
    lastFmErrorCount = 0;
  }).catch(error => {
    console.error('\nError when fetching data from Last.FM:', error);
    lastFmErrorCount++;

    // Retry or else exit.
    if (lastFmErrorCount < settings.retries) {
      console.log(`\nRetrying in ${settings.retryAfterHowManySeconds} seconds...`);
      setTimeout(() => {
        getLastFMTrackChart();
      }, settings.retryAfterHowManySeconds * 1000);
    } else {
      return
    }
  });
}

const getLastFMArtistChart = (): void => {
  axios.get('https://ws.audioscrobbler.com/2.0/', {
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

    // Retry or else exit.
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
    (lastFmData as LastFMArtistChart).weeklyartistchart.artist!.forEach(artist => {
      artists.push({ artistName: artist.name, artistPlayCount: artist.playcount });
    });
  } else {
    (lastFmData as LastFMTrackChart).weeklytrackchart.track!.forEach(track => {
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
      generatedContent += ') #socialfm';
    }
  }

  if (settings.postOnTwitter) {
    await postToTwitter(generatedContent);
  } else if (settings.postOnMastodon) {
    await postToMastodon(generatedContent);
  } else if (settings.postOnMisskey) {
    await postToMisskey(generatedContent);
  } else if (settings.postOnPleroma) {
    await postToPleroma(generatedContent);
  } else {
    console.error('No social network is enabled to post on!');
    process.exit();
  }
}

const postToTwitter = async (tweetContent: string): Promise<void> => {
  if (tweetContent.length > 280) {
    console.error(`\nTwitter: Tweet exceeds maximum allowed length of 180 characters. Not tweetin' this one.`);
    return
  }

  await twitterClient.post('statuses/update', { status: tweetContent }).then(response => {
    console.log('\nPosted to Twitter: ', `https://twitter.com/${twitterUserData.username}/status/${response.id_str}`);
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
  const client = generator('mastodon', mastodonAuthData.base_url, mastodonAuthData.access_token);
  client.postStatus(postContent).then((res: Response<Entity.Status>) => {
    console.log('\nPosted to Mastodon: ', `${res.data.uri}`);
    mastodonErrorCount = 0;
  }).catch((error: any) => {
    console.error('\nError when posting to Mastodon: ', error);
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

const postToMisskey = async (postContent: string): Promise<void> => {
  const client = generator('misskey', misskeyAuthData.base_url, misskeyAuthData.access_token);
  client.postStatus(postContent).then((res: Response<Entity.Status>) => {
    console.log('\nPosted to Misskey: ', `${misskeyAuthData.base_url}/notes/${res.data.id}`);
    misskeyErrorCount = 0;
  }).catch((error: any) => {
    console.error('\nError when posting to Misskey: ', error);
    misskeyErrorCount++;

    // Retry.
    if (misskeyErrorCount < settings.retries) {
      console.log(`\nRetrying in ${settings.retryAfterHowManySeconds} seconds...`);
      setTimeout(() => {
        postToMisskey(postContent);
      }, settings.retryAfterHowManySeconds * 1000);
    }
  })
}

const postToPleroma = async (postContent: string): Promise<void> => {
  const client = generator('pleroma', pleromaAuthData.base_url, pleromaAuthData.access_token);
  client.postStatus(postContent).then((res: Response<Entity.Status>) => {
    console.log('\nPosted to Pleroma: ', `${res.data.url}`);
    pleromaErrorCount = 0;
  }).catch((error: any) => {
    console.error('\nError when posting to Pleroma: ', error);
    pleromaErrorCount++;

    // Retry.
    if (pleromaErrorCount < settings.retries) {
      console.log(`\nRetrying in ${settings.retryAfterHowManySeconds} seconds...`);
      setTimeout(() => {
        postToPleroma(postContent);
      }, settings.retryAfterHowManySeconds * 1000);
    }
  })
}

((): void => {
  console.log('\n#SocialFM by @pedrocx486 - WTFPL');
  console.log('\nStarting...');

  switch (settings.chartContentType) {
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
      console.error('Probable invalid setting detected for the ChartType. Exiting.');
      process.exit();
    }
  }
})();