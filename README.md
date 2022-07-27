# #mastweetfm
A tool to post your most listened tracks and/or artists from Last.FM on Twitter and/or Mastodon.
  
# Setup
To setup the whole thing you **WILL NEED** an Last.FM API Key, Mastodon Access Token (only if you're gonna use Mastodon) and/or Twitter's Consumer Key and Secret and Twitter's Access Key and Secret, from an Twitter App with **Elevated Access to the v2 API** (good luck, twitter makes it hell to get it) if you're gonna use Twitter.
  
After that put the required info in the files located in the `utils/auth` folder, then configure tootweetfm to your preference on the `utils\settings.ts` file to have it run the way you want.
  
**You won't need to touch the `index.ts` and other files not mentioned here to have it running.**
  
# Installing and Running
Run `npm i` to install and `npm start` to compile and run the thing.
  
# Hacking at it
Your main point of interest would be `index.ts` file, where the main code resides. There's some extra code (and dirty hacks) in the `utils` folder, make sure to check it out if you like having nightmares at night.
  
# License
[WTFPL](http://www.wtfpl.net/txt/copying)
  
# Contributing
Don't. If you want to change anything, fork it. Issues and PRs will be promptly closed because I don't have enough shits to give.
