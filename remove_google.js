const fs = require('fs');
let html = fs.readFileSync('public/dashboard.html', 'utf8');

const regex = /      <!-- Google -->\s*<div id="googleWrap" style="display:none">[\s\S]*?Lanjut dengan Google\s*<\/button>\s*<\/div>/;

if (regex.test(html)) {
  html = html.replace(regex, '');
  fs.writeFileSync('public/dashboard.html', html, 'utf8');
  console.log("Removed Google Login from dashboard.html");
} else {
  console.log("Could not find Google Login section");
}
