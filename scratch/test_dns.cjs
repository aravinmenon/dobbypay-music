const dns = require('dns');

const domains = [
  'dobbypay.rf.gd',
  'dobbhypay.rf.gd',
  'dobbypay.infinityfreeapp.com',
  'dobbhypay.infinityfreeapp.com',
  'dobbypay.epizy.com',
  'dobbhypay.epizy.com',
  'dobbypay.great-site.net',
  'dobbhypay.great-site.net',
  'dobbypay.42web.io',
  'dobbhypay.42web.io'
];

dns.setServers(['8.8.8.8', '1.1.1.1']);

domains.forEach(d => {
  dns.resolve4(d, (err, addrs) => {
    if (err) {
      console.log(`${d} -> FAILED: ${err.code}`);
    } else {
      console.log(`${d} -> OK: ${addrs.join(', ')}`);
    }
  });
});
