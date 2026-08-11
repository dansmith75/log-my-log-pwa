import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';

import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('app.js'), html=read('index.html'), sw=read('sw.js'), manifest=JSON.parse(read('manifest.webmanifest'));
const results=[];
function test(name,fn){try{fn();results.push({status:'PASS',name});}catch(e){results.push({status:'FAIL',name,detail:e.message});}}
function assert(v,msg='Assertion failed'){if(!v)throw new Error(msg)}

for(const file of ['app.js','db.js','sw.js']) test(`JavaScript syntax: ${file}`,()=>execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'}));

test('Manifest is valid and installable-shaped',()=>{
  assert(manifest.name && manifest.short_name,'Missing manifest names');
  assert(manifest.start_url,'Missing start_url');
  assert(['standalone','fullscreen','minimal-ui'].includes(manifest.display),'Unexpected display mode');
  assert(Array.isArray(manifest.icons)&&manifest.icons.length>=2,'Need app icons');
  for(const i of manifest.icons)assert(fs.existsSync(path.join(root,i.src.replace(/^\.\//,''))),`Missing icon ${i.src}`);
});

test('Service worker core cache files exist',()=>{
  const core=[...sw.matchAll(/['"](\.\/[^'"]+)['"]/g)].map(m=>m[1]).filter(x=>!x.includes('SKIP_WAITING'));
  for(const asset of core){const f=asset.split('?')[0].replace(/^\.\//,'')||'index.html'; assert(fs.existsSync(path.join(root,f)),`Missing cached asset ${asset}`)}
});

test('Service worker bypasses third-party traffic',()=>{
  assert(sw.includes("if(url.origin!==self.location.origin) return"),'Third-party requests are not explicitly bypassed');
});

test('No Supabase secret/service-role key embedded',()=>{
  assert(!/service[_-]?role/i.test(app),'Possible service-role credential/reference in app.js');
  assert(!/sb_secret_/i.test(app),'Secret Supabase key embedded');
  assert(/sb_publishable_/.test(app),'Publishable key missing');
});

test('All explicit #id selectors used by app.js exist in index.html',()=>{
  const ids=new Set([...app.matchAll(/\$\(['"]#([A-Za-z0-9_-]+)['"]\)/g)].map(m=>m[1]));
  const missing=[...ids].filter(id=>!new RegExp(`id=["']${id}["']`).test(html));
  assert(missing.length===0,`Missing HTML ids: ${missing.join(', ')}`);
});

test('Account & sync controls are wired',()=>{
  for(const id of ['signInBtn','signUpBtn','signOutBtn','syncNowBtn','saveDeviceNameBtn','exportEncryptedBtn','importEncryptedInput']){
    assert(app.includes(`$('#${id}')?.addEventListener`),`${id} not wired`);
    assert(new RegExp(`id=["']${id}["']`).test(html),`${id} missing in HTML`);
  }
});

test('Local CRUD database exports exist',()=>{
  const db=read('db.js');
  for(const fn of ['getEntries','saveEntry','deleteEntry','clearEntries','bulkSave']) assert(new RegExp(`export async function ${fn}\\b`).test(db),`${fn} missing`);
});

test('Encrypted backup uses PBKDF2 SHA-256 + AES-GCM',()=>{
  assert(app.includes("iterations:250000"),'PBKDF2 iteration count changed/missing');
  assert(app.includes("hash:'SHA-256'"),'PBKDF2 hash changed/missing');
  assert(app.includes("name:'AES-GCM'"),'AES-GCM missing');
});

test('Encrypted backup algorithm round-trip',()=>{
  const password='QA-Backup-Pass!123';
  const salt=crypto.randomBytes(16), iv=crypto.randomBytes(12);
  const key=crypto.pbkdf2Sync(password,salt,250000,32,'sha256');
  const payload=Buffer.from(JSON.stringify({format:'log-my-log-encrypted-backup',version:1,entries:[{id:'qa'}]}));
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv); const enc=Buffer.concat([cipher.update(payload),cipher.final()]); const tag=cipher.getAuthTag();
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv); decipher.setAuthTag(tag); const dec=Buffer.concat([decipher.update(enc),decipher.final()]);
  assert(dec.equals(payload),'Crypto round-trip failed');
});

test('Sync conflict rule prefers newer updated timestamp',()=>{
  function decide(local,cloud){const lt=new Date(local.updatedAt||local.timestamp).getTime(),ct=new Date(cloud.updated_at||cloud.timestamp).getTime();if(lt>ct+500)return'upload';if(ct>lt+500)return'download';return'none'}
  assert(decide({updatedAt:'2026-08-11T10:00:02Z'},{updated_at:'2026-08-11T10:00:00Z'})==='upload','Newer local should upload');
  assert(decide({updatedAt:'2026-08-11T10:00:00Z'},{updated_at:'2026-08-11T10:00:02Z'})==='download','Newer cloud should download');
  assert(decide({updatedAt:'2026-08-11T10:00:00.200Z'},{updated_at:'2026-08-11T10:00:00Z'})==='none','Sub-500ms drift should not conflict');
});

test('Cloud deletion queue is owner-scoped',()=>{
  assert(app.includes("x.userId===state.cloudUser.id"),'Deletion queue is not scoped to signed-in user');
  assert(app.includes("localStorage.getItem(CLOUD_LAST_USER_KEY)"),'Offline deletion cannot associate prior cloud user');
});

test('Cloud fetch paginates beyond 1000 rows',()=>{
  assert(app.includes('const pageSize=1000'),'Cloud pagination page size missing');
  assert(app.includes('.range(from,from+pageSize-1)'),'Cloud pagination range missing');
});

test('Local logging remains available without Supabase library',()=>{
  assert(app.includes("Cloud library is unavailable. Local logging still works."),'Missing graceful cloud-library failure path');
  assert(app.includes('refresh().then'),'Local app startup does not independently refresh local state');
});

test('Backup import validates Bristol type bounds',()=>{
  assert(app.includes('Number(e.bristolType)>=1&&Number(e.bristolType)<=7'),'JSON import type validation missing');
});

const failed=results.filter(r=>r.status==='FAIL');
console.log('\nLog My Log QA — automated static/logic suite\n');
for(const r of results) console.log(`${r.status==='PASS'?'✓':'✗'} ${r.name}${r.detail?` — ${r.detail}`:''}`);
console.log(`\n${results.length-failed.length}/${results.length} passed; ${failed.length} failed.`);
process.exitCode=failed.length?1:0;
