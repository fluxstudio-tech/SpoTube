const fs = require('fs');
let f = fs.readFileSync('client-desktop/src/renderer/App.jsx', 'utf8');
f = f.replaceAll('bg-black', 'bg-av-prussian');
f = f.replaceAll('bg-[#111111]', 'bg-av-oxford');
f = f.replaceAll('bg-[#0a0a0a]/80', 'bg-av-oxford/90');
f = f.replaceAll('text-green-400', 'text-av-powder');
f = f.replaceAll('text-green-500', 'text-av-powder');
f = f.replaceAll('bg-green-500', 'bg-av-powder');
f = f.replaceAll('bg-green-400', 'bg-av-powder');
f = f.replaceAll('border-green-500', 'border-av-powder');
f = f.replaceAll('border-l-green-500', 'border-l-av-powder');
f = f.replaceAll('from-green-400', 'from-av-powder');
f = f.replaceAll('to-emerald-500', 'to-av-mint');
f = f.replaceAll('from-green-900', 'from-av-yale');
f = f.replaceAll('bg-green-900', 'bg-av-yale');
f = f.replaceAll('bg-emerald-900', 'bg-av-oxford');
f = f.replaceAll('ring-green-400', 'ring-av-powder');
f = f.replaceAll('text-transparent bg-clip-text bg-gradient-to-r from-av-powder to-av-mint mb-2 tracking-tighter', 'font-logo text-transparent bg-clip-text bg-gradient-to-r from-av-powder to-av-mint mb-2 tracking-tighter');
f = f.replaceAll('AuralVault <span className="text-[10px] text-av-powder', 'AuralVault <span className="text-[10px] text-av-mint');
f = f.replaceAll('bg-av-powder/10 px-2 py-0.5', 'bg-av-powder/20 text-white px-2 py-0.5'); // Clean the premium badge

fs.writeFileSync('client-desktop/src/renderer/App.jsx', f);
console.log('done');
