export interface LastFMTrackChart {
  weeklytrackchart: Weeklytrackchart;
}

export interface Weeklytrackchart {
  track?: (TrackEntity)[] | null;
  attr: Attr;
}

export interface TrackEntity {
  artist: Artist;
  image?: (ImageEntity)[] | null;
  mbid: string;
  url: string;
  name: string;
  attr: Attr1;
  playcount: string;
}

export interface Artist {
  mbid: string;
  text: string;
}

export interface ImageEntity {
  size: string;
  text: string;
}

export interface Attr1 {
  rank: string;
}

export interface Attr {
  from: string;
  user: string;
  to: string;
}
