# QuickReply Chrome Extension

## Installation (Development)
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this `extension/` folder
4. The extension icon appears in your toolbar

## Configuration
- By default, the extension points to `https://quick-reply.vercel.app`
- For local development, click the ⚙️ gear in the popup and set the URL to `http://localhost:3000`
- You can also edit `extension/config.js` to change the default

## Publishing to Chrome Web Store
1. Run `node generate-icons.js` to create icon PNGs (requires `canvas` or use pre-made icons)
2. Zip the extension folder: `cd extension && zip -r quickreply-extension.zip . -x "*.DS_Store" "README.md" "generate-icons.js"`
3. Go to https://chrome.google.com/webstore/devconsole/
4. Click "New Item" → upload the zip
5. Fill in the store listing (use screenshots from the dashboard)
6. Submit for review

## Features
- Overlay on YouTube Studio showing QuickReply-processed comments
- Quick stats (pending replies, sentiment, replies today)
- Channel selection
- One-click approve/reject for comments in review queue
- Backend URL configuration for dev/production
