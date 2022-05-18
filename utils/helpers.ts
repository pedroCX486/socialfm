import { DateTime } from "luxon";

export function parseLastFmResponse(response: Object): Object {
  return JSON.parse(
    JSON.stringify(
      response
    ).replace(/[@#]/gi, '')
  );
}

export function generateUnixTimestamp(howManyDaysAgo?: number): string {
  if (!!howManyDaysAgo) {
    return DateTime.now().minus({days: howManyDaysAgo}).toUnixInteger().toString()
  } else {
    return DateTime.now().toUnixInteger().toString()
  }
}

export function parseDayString(howManyDays: number): string {
  if (howManyDays === 1) {
    return 'day'
  } else {
    return `${howManyDays} days`
  }
}

// Why this: The standard JavaScript setTimeout function is limited to 32-bit integers.
export function setTimeoutPlus(callback: Function, days: number) {
  let msInDay = 86400 * 1000;

  let dayCount = 0;
  let timer = setInterval(function () {
    dayCount++;

    if (dayCount === days) {
      clearInterval(timer);
      callback.apply(this, []);
    }
  }, msInDay);
}