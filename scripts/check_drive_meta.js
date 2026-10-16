const https = require('https');

const id = '1mGYaGi6083nwDNElZg0ke-It7pei7gQE';
https.get('https://drive.google.com/file/d/' + id + '/view', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const fn = data.match(/"title":"(.*?)"/);
    const og = data.match(/property="og:title" content="(.*?)"/);
    const metaTitle = data.match(/<meta property="twitter:title" content="(.*?)"/);
    console.log('fn:', fn ? fn[1] : null);
    console.log('og:', og ? og[1] : null);
    console.log('metaTitle:', metaTitle ? metaTitle[1] : null);
  });
});
