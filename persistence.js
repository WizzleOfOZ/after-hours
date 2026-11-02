/** Persistence adapter. Default: atomic JSON file. Optional: Supabase PostgREST cloud storage.
 * Keep SUPABASE_SERVICE_ROLE_KEY on the server ONLY; never in public/ or Git.
 */
import fs from 'node:fs';
import path from 'node:path';

export function createPersistence({dataFile, supabaseUrl=process.env.SUPABASE_URL, serviceKey=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl=globalThis.fetch}={}){
  const cloud=Boolean(supabaseUrl || serviceKey);
  if(cloud && !(supabaseUrl && serviceKey)) throw new Error('Cloud saves require both SUPABASE_URL and SUPABASE_SECRET_KEY.');
  if(cloud && !/^https:\/\//.test(supabaseUrl) && !/^http:\/\/127\.0\.0\.1(:\d+)?\/?$/.test(supabaseUrl)) throw new Error('SUPABASE_URL must use HTTPS.');
  const base=cloud ? supabaseUrl.replace(/\/$/,'')+'/rest/v1/after_hours_rooms' : null;
  // Modern sb_secret_ keys are NOT JWTs: sending one in Authorization causes Invalid JWT.
  // Legacy service_role JWTs still accept Authorization: Bearer, for migration.
  const headers=cloud ? {apikey:serviceKey,...(serviceKey.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${serviceKey}`})} : null;
  const mode=cloud ? 'supabase' : 'local';

  async function cloudRequest(url,opts={}){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try {
      const res=await fetchImpl(url,{...opts,signal:controller.signal,headers:{...headers,...opts.headers}});
      if(!res.ok){const body=(await res.text()).slice(0,260);throw new Error(`Cloud save HTTP ${res.status}: ${body}`)}
      return res;
    } finally {clearTimeout(timeout)}
  }

  return {
    mode,
    async load(){
      if(!cloud){try{return JSON.parse(fs.readFileSync(dataFile,'utf8'))}catch(e){if(e.code==='ENOENT')return [];throw e}}
      const rooms=[];
      // Supabase's default 1000-row limit: request in pages so old rooms aren't skipped.
      for(let offset=0;offset<100000;offset+=500){
        const res=await cloudRequest(`${base}?select=payload&order=code.asc&limit=500&offset=${offset}`);
        const rows=await res.json();if(!Array.isArray(rows))throw new Error('Invalid response from cloud storage.');
        rooms.push(...rows.map(row=>row.payload));if(rows.length<500)break;
      }
      return rooms;
    },
    async save(rooms){
      const snapshot=rooms.map(r=>({...r,players:(r.players||[]).map(p=>({...p,connected:false}))}));
      if(!cloud){
        fs.mkdirSync(path.dirname(dataFile),{recursive:true});
        const tmp=`${dataFile}.${process.pid}.tmp`;
        fs.writeFileSync(tmp,JSON.stringify(snapshot),'utf8');
        fs.renameSync(tmp,dataFile);
        return;
      }
      // In a single-process deployment we send snapshots in one batch. Changes to room
      // objects are serialized by the caller, avoiding stale async writes overwriting newer ones.
      for(let offset=0;offset<snapshot.length;offset+=100){
        const chunk=snapshot.slice(offset,offset+100).map(r=>({code:r.code,payload:r,updated_at:new Date().toISOString()}));
        await cloudRequest(`${base}?on_conflict=code`,{
          method:'POST', headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(chunk)
        });
      }
    }
  };
}
