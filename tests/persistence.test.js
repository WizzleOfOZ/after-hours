import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersistence } from '../persistence.js';

test('cloud adapter saves multiple room snapshots and restores them without connection state', async()=>{
  const database=new Map();const calls=[];
  const mockFetch=async(url,options={})=>{
    calls.push({url,options});
    assert.equal(options.headers.apikey,'sb_secret_TEST-ONLY');
    assert.equal(options.headers.Authorization,undefined);
    if(options.method==='POST'){
      for(const row of JSON.parse(options.body))database.set(row.code,row);
      return new Response(null,{status:204});
    }
    const params=new URL(url).searchParams,offset=Number(params.get('offset'))||0,limit=Number(params.get('limit'))||500;
    const sorted=[...database.values()].sort((a,b)=>a.code.localeCompare(b.code));
    return new Response(JSON.stringify(sorted.slice(offset,offset+limit).map(({payload})=>({payload}))),{status:200});
  };
  const storage=createPersistence({dataFile:'/unused',supabaseUrl:'http://127.0.0.1:34567',serviceKey:'sb_secret_TEST-ONLY',fetchImpl:mockFetch});
  assert.equal(storage.mode,'supabase');
  const initial=[{code:'A1B2C3',players:[{name:'Wizzle',connected:true}],phase:'rooftop',rooftop:{stars:[{x:200,y:100}]}}];
  await storage.save(initial);const loaded=await storage.load();
  assert.equal(loaded.length,1);assert.equal(loaded[0].players[0].connected,false);
  assert.equal(loaded[0].rooftop.stars.length,1);
  await storage.save([{...initial[0],phase:'finale',finale:{done:true}}]);
  assert.equal((await storage.load())[0].phase,'finale');
  assert.ok(calls.find(c=>c.options.method==='POST'&&c.options.headers.Prefer.includes('merge-duplicates')));
});

test('cloud adapter fails closed when the database is unavailable, rather than silently losing rooms', async()=>{
  const storage=createPersistence({dataFile:'/unused',supabaseUrl:'http://127.0.0.1:34567',serviceKey:'SECRET-FOR-TESTS',fetchImpl:async()=>{throw new Error('offline')}});
  await assert.rejects(storage.load(),/offline/);
  await assert.rejects(storage.save([{code:'A1B2C3',players:[]}]),/offline/);
  assert.throws(()=>createPersistence({dataFile:'/unused',supabaseUrl:'https://example.supabase.co'}),/both/);
});
