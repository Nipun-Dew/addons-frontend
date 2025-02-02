#!/usr/bin/env node
/* eslint-disable global-require, no-console, no-shadow */

require('@babel/register');

const fs = require('fs');
const path = require('path');

const QRCode = require('qrcode');
const config = require('config');

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const destDir = path.join(distDir, 'qrcodes');
const lang = 'en-US';
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

(async () => {
  const res = await fetch(
    `https://addons.mozilla.org/api/v5/addons/search/?app=android&promoted=recommended&type=extension&lang=${lang}`,
  );
  const { results: addons } = await res.json();

  await Promise.all(
    addons.map(({ id, url }) => {
      const filePath = path.join(destDir, `${id}.png`);
      let content = url.replace(`/${lang}`, '');
      content = [
        `${content}?utm_campaign=amo-fenix-qr-code`,
        `utm_content=${id}`,
        `utm_medium=referral&utm_source=addons.mozilla.org`,
      ].join('&');
      return QRCode.toFile(filePath, content, { margin: 1 });
    }),
  );

  console.log(addons.length, ' QR codes created');

  const knownIds = config.get('addonIdsWithQRCodes');
  const addonIdsFromAPI = [...new Set(addons.map(({ id }) => id))];
  const differences = [
    ...addonIdsFromAPI.filter((x) => !knownIds.includes(x)),
    ...knownIds.filter((x) => !addonIdsFromAPI.includes(x)),
  ];

  if (differences.length > 0) {
    console.log(`'addonIdsWithQRCodes' might be outdated:`);
    console.log(`  addonIdsWithQRCodes: ${[...knownIds].sort()}`);
    console.log(`  IDs from API       : ${addonIdsFromAPI.sort()}`);
    process.exit(1);
  }
})();
