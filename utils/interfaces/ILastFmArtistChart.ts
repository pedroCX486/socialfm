export interface LastFMArtistChart {
  weeklyartistchart: Weeklyartistchart;
}

export interface Weeklyartistchart {
  artist?: (ArtistEntity)[] | null;
  attr: Attr;
}

export interface ArtistEntity {
  mbid: string;
  url: string;
  name: string;
  attr: Attr1;
  playcount: string;
}

export interface Attr1 {
  rank: string;
}

export interface Attr {
  from: string;
  user: string;
  to: string;
}
