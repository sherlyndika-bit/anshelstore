const https = require('https');

const queries = [
  "ShopeePay logo svg",
  "ShopeePay logo"
];

async function searchLogo(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json&gsrlimit=1`;
  
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js Bot' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            resolve(pages[pageId].imageinfo[0].url);
          } else {
            resolve('Not found');
          }
        } catch(e) {
          resolve('Error');
        }
      });
    }).on('error', () => resolve('Network Error'));
  });
}

async function run() {
  for (const q of queries) {
    const url = await searchLogo(q);
    console.log(`${q}: ${url}`);
  }
}

run();
