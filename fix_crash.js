const fs = require('fs');

// Fix dashboard.html ID
let html = fs.readFileSync('public/dashboard.html', 'utf8');
if (html.includes('id="topTitle"')) {
  html = html.replace('id="topTitle"', 'id="pageTitle"');
  fs.writeFileSync('public/dashboard.html', html, 'utf8');
  console.log("Fixed pageTitle in dashboard.html");
}

// Fix dashboard.js db.settings crash
let js = fs.readFileSync('public/js/dashboard.js', 'utf8');

// 1. Fix loadSettings db crash
const badDiscLogic = `const disc = db.settings && db.settings.newMemberDiscount ? db.settings.newMemberDiscount : 0;
  if(document.getElementById("nmDiscount")) $("nmDiscount").value = disc || "";

  const d = await api("/api/admin/settings");`;

const goodDiscLogic = `const d = await api("/api/admin/settings");
  const disc = d.settings && d.settings.newMemberDiscount ? d.settings.newMemberDiscount : 0;
  if(document.getElementById("nmDiscount")) $("nmDiscount").value = disc || "";`;

if (js.includes('const disc = db.settings')) {
  js = js.replace(badDiscLogic, goodDiscLogic);
  console.log("Fixed db.settings crash in dashboard.js");
}

fs.writeFileSync('public/js/dashboard.js', js, 'utf8');
