const fs = require('fs');
let html = fs.readFileSync('public/dashboard.html', 'utf8');

const regex = /(<div><label class="block text-sm font-medium text-slate-700 mb-1">Cek-ID Game: API Key<\/label><input class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" id="intGcKey" type="password" placeholder="\*\*\*\*\*\*" \/><\/div>\s*<\/div>)/;

const replacement = `$1

              <div class="col-span-1 md:col-span-2 border-t border-slate-100 my-2"></div>
              
              <div class="col-span-1 md:col-span-2 flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <h4 class="font-bold text-slate-800 flex items-center gap-2"><svg class="w-4 h-4" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Aktifkan Google Login</h4>
                  <p class="text-xs text-slate-500">Izinkan user login cepat pakai akun Google.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="intGoogleAuth" class="sr-only peer" checked>
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              
              <div class="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Google Client ID</label><input class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" id="intGoogleId" placeholder="xxx.apps.googleusercontent.com" /></div>
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Google Client Secret</label><input class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" id="intGoogleSecret" type="password" placeholder="GOCSPX-***" /></div>
              </div>`;

if (html.includes('id="intGoogleId"')) {
  console.log("Already patched");
} else {
  html = html.replace(regex, replacement);
  fs.writeFileSync('public/dashboard.html', html, 'utf8');
  console.log("Patched dashboard.html!");
}
