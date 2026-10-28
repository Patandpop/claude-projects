const fs=require('fs');let h=fs.readFileSync('src.html','utf8');
for(const [k,f] of [['D1','d1.js'],['DATA','data.js'],['SIGILS','sigils.js'],['PANES','panes.js'],['ROSE','rose.js'],['ORX','glassx.js']]){const s=fs.readFileSync(f,'utf8');if(/<\/script/i.test(s))throw f;h=h.replace('/*'+k+'*/',()=>s);}
fs.writeFileSync('oracle.html',h);
fs.writeFileSync('preview.html','<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>'+h+'</body></html>');
console.log(h.length, /—/.test(h.replace(/<script>[\s\S]*?<\/script>/g,''))?'EMDASH':'ok');
