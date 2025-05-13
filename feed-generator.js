// feed-generator.js
// Holen des WordPress-Feeds und Umwandlung in Zappter-kompatibles XML mit <enclosure>

const https = require('https');
const { parseStringPromise } = require('xml2js');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const WORDPRESS_FEED_URL = 'https://tacheles6.wordpress.com/feed/';

function extractFirstImage(html) {
  const dom = new JSDOM(html);
  const img = dom.window.document.querySelector('img');
  return img ? img.src : null;
}

async function generateFeed() {
  try {
    const xmlData = await fetchFeed(WORDPRESS_FEED_URL);
    const parsed = await parseStringPromise(xmlData);
    const items = parsed.rss.channel[0].item.slice(0, 10); // max. 10 Artikel

    const feedItems = items.map(item => {
      const title = item.title[0];
      const link = item.link[0];
      const description = item.description[0];
      const pubDate = item.pubDate[0];
      const image = extractFirstImage(description);

      return {
        title,
        link,
        description,
        pubDate,
        image,
      };
    });

    const feedXml = buildFeedXml(feedItems);
    fs.writeFileSync('feed.xml', feedXml);
    console.log('✅ feed.xml wurde erstellt.');
  } catch (err) {
    console.error('❌ Fehler beim Erzeugen des Feeds:', err);
  }
}

function fetchFeed(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function buildFeedXml(items) {
  const now = new Date().toUTCString();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tacheles News (AutoFeed)</title>
    <link>https://tacheles6.wordpress.com/</link>
    <description>Automatischer Feed für Zappter</description>
    <pubDate>${now}</pubDate>
`;

  items.forEach(item => {
    xml += `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      ${item.image ? `<enclosure url="${item.image}" type="image/jpeg" />` : ''}
    </item>`;
  });

  xml += '
  </channel>\n</rss>';
  return xml;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&"']/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c];
  });
}

generateFeed();
