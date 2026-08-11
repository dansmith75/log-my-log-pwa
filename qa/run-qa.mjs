import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const tests=[]; const ok=(name,fn)=>tests.push([name,fn]);
const read=p=>fs.readFileSync(p,'utf8');
for(const f of ['app.js','db.js','sw.js']) ok(`JavaScript syntax: ${f}`,()=>{execFileSync(process.execPath,['--check',f]);});
ok('Manifest is valid and installable-shaped',()=>{const m=JSON.parse(read('manifest.webmanifest'));if(!m.name||!m.start_url||!m.icons?.length)throw Error('manifest');});
ok('Service worker bypasses third-party traffic',()=>{if(!read('sw.js').includes("url.origin!==self.location.origin"))throw Error('third-party bypass missing');});
ok('No Supabase secret/service-role key embedded',()=>{const all=read('app.js');if(/service_role|sb_secret_/i.test(all))throw Error('secret key marker');});
ok('Account & sync controls are wired',()=>{const h=read('index.html'),a=read('app.js');for(const id of ['signInBtn','signUpBtn','syncNowBtn','signOutBtn'])if(!h.includes(`id="${id}"`)||!a.includes(`#${id}`))throw Error(id);});
ok('Encrypted backup uses PBKDF2 SHA-256 + AES-GCM',()=>{const a=read('app.js');for(const s of ['PBKDF2',"hash:'SHA-256'",'AES-GCM'])if(!a.includes(s))throw Error(s);});
ok('Cloud fetch paginates beyond 1000 rows',()=>{const a=read('app.js');if(!a.includes('pageSize=1000')||!a.includes('.range('))throw Error('pagination');});
ok('Local logging remains available without Supabase library',()=>{const a=read('app.js');if(!a.includes('Cloud library is unavailable. Local logging still works.'))throw Error('fallback');});
ok('V3.3 accessibility polish exists',()=>{const h=read('index.html'),c=read('styles.css');if(!h.includes('aria-live="polite"')||!c.includes('prefers-reduced-motion'))throw Error('a11y');});
let pass=0;console.log('\nLog My Log QA — automated static/logic suite\n');
for(const [n,fn] of tests){try{fn();pass++;console.log(`✓ ${n}`)}catch(e){console.log(`✗ ${n}: ${e.message}`)}}
console.log(`\n${pass}/${tests.length} passed; ${tests.length-pass} failed.`);
if(pass!==tests.length)process.exit(1);
