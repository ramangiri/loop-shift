import {weeklyInfo} from './weekly.js';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'}});
export const TITLE_BITS={'perfect-pilot':1,'shield-survivor':2,'six-ring-master':4};
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export async function community(db,id){
  const {week,resetsAt}=weeklyInfo();
  const total=(await db.prepare('SELECT COALESCE(SUM(sparks),0) AS total FROM social_runs WHERE week=? AND finished_at IS NOT NULL').bind(week).first()).total;
  const mine=id?(await db.prepare('SELECT COALESCE(SUM(sparks),0) AS total FROM social_runs WHERE week=? AND player_id=? AND finished_at IS NOT NULL').bind(week,id).first()).total:0;
  const unlocked=!!await db.prepare('SELECT week FROM social_runs WHERE finished_at IS NOT NULL GROUP BY week HAVING SUM(sparks)>=100000 LIMIT 1').first();
  return {week,resetsAt,total,mine,goal:100000,unlocked};
}
export async function socialState(db,id){
  const profile=id?await db.prepare('SELECT boss_trophies,player_titles,selected_title FROM players WHERE id=?').bind(id).first():null;
  return {collection:profile?{bosses:profile.boss_trophies,titles:profile.player_titles,title:profile.selected_title}:null,community:await community(db,id)};
}
async function limited(db,id,action,now,limit){
  const bucket=Math.floor(now/60000);
  const row=await db.prepare('INSERT INTO social_limits (player_id,action,bucket,count) VALUES (?,?,?,1) ON CONFLICT(player_id,action) DO UPDATE SET count=CASE WHEN bucket=excluded.bucket THEN count+1 ELSE 1 END,bucket=excluded.bucket WHERE bucket<>excluded.bucket OR count<? RETURNING count').bind(id,action,bucket,limit).first();
  return !!row;
}
export async function socialAction(path,db,id,data,now){
  if(path==='/api/social/title'){
    const bit=TITLE_BITS[data.title];
    if(data.title!==''&&!bit)return reply({error:'Choose a listed player title.'},400);
    const p=await db.prepare('UPDATE players SET selected_title=? WHERE id=? AND (?=0 OR (player_titles & ?)=?) RETURNING selected_title').bind(data.title,id,bit||0,bit||0,bit||0).first();
    return p?reply(await socialState(db,id)):reply({error:'Earn this title before equipping it.'},403);
  }
  if(path==='/api/social/start'){
    if(!['endless','daily','weekly'].includes(data.kind))return reply({error:'Only ranked game modes contribute.'},400);
    if(!await limited(db,id,'run',now,30))return reply({error:'Please wait a moment before starting another contribution.'},429);
    const token=crypto.randomUUID(),{week}=weeklyInfo(now);
    await db.prepare('DELETE FROM social_runs WHERE finished_at IS NULL AND started_at<?').bind(now-172800000).run();
    await db.prepare('INSERT INTO social_runs (token,player_id,kind,week,started_at) VALUES (?,?,?,?,?)').bind(token,id,data.kind,week,now).run();
    return reply({token,week});
  }
  const {token,sparks,chain,clean,cleared,bosses,duration}=data;
  if(typeof token!=='string'||token.length>64||!Number.isFinite(duration)||duration<0||duration>86400||!integer(sparks,0,2400)||sparks>duration*4+2||!integer(chain,0,1200)||!integer(clean,0,100)||!integer(cleared,0,100)||!integer(bosses,0,1023)||chain>duration*4+2||cleared*12>duration*4+2||clean>cleared||bosses&~((1<<Math.floor(cleared/10))-1))return reply({error:'Invalid run progress.'},400);
  const run=await db.prepare('SELECT * FROM social_runs WHERE token=? AND player_id=?').bind(token,id).first();
  if(!run)return reply({error:'This run is unavailable. Start a new run while connected.'},410);
  if(now-run.started_at>172800000)return reply({error:'This contribution expired after 48 hours.'},410);
  if(duration>(now-run.started_at)/1000+2||run.kind!=='endless'&&duration>120.01)return reply({error:'The submitted play time is invalid.'},400);
  const payload=JSON.stringify({sparks,chain,clean,cleared,bosses,duration:Math.round(duration*1000)});
  const accepted=await db.prepare('UPDATE social_runs SET payload=COALESCE(payload,?),sparks=CASE WHEN finished_at IS NULL THEN ? ELSE sparks END,finished_at=COALESCE(finished_at,?) WHERE token=? AND player_id=? RETURNING payload').bind(payload,sparks,now,token,id).first();
  if(accepted.payload!==payload)return reply({error:'This run has already submitted different progress.'},409);
  const earned=(chain>=5?1:0)|(clean>=5?2:0)|(cleared>=13?4:0);
  // Retrying can repair a failed profile update; OR never revokes earlier unlocks.
  await db.prepare('UPDATE players SET boss_trophies=boss_trophies | ?,player_titles=player_titles | ? WHERE id=?').bind(run.kind==='endless'?bosses:0,earned,id).run();
  return reply(await socialState(db,id));
}
export async function friendGroups(db,id){
  if(!id)return reply({error:'Save your nickname to open friend groups.'},401);
  const {results}=await db.prepare('SELECT g.id,g.name,g.invite FROM friend_groups g JOIN friend_members m ON m.group_id=g.id WHERE m.player_id=? ORDER BY g.created_at,g.id').bind(id).all();
  const groups=[];
  for(const group of results){
    const {results:members}=await db.prepare('SELECT p.id,p.name,p.avatar,p.best,p.selected_title,p.achieved_at FROM players p JOIN friend_members m ON m.player_id=p.id WHERE m.group_id=? ORDER BY p.best DESC,p.achieved_at,p.id').bind(group.id).all();
    let rank=0;groups.push({...group,members:members.length,entries:members.map(p=>({name:p.name,avatar:p.avatar,title:p.selected_title,score:p.best,rank:p.best>0?++rank:null,isYou:p.id===id}))});
  }
  return reply({groups});
}
export async function groupAction(path,db,id,data,now){
  if(!await limited(db,id,'groups',now,10))return reply({error:'Too many group requests. Try again in a minute.'},429);
  if(path==='/api/groups/leave'){
    if(typeof data.group!=='string'||data.group.length>64)return reply({error:'Choose a group.'},400);
    await db.prepare('DELETE FROM friend_members WHERE group_id=? AND player_id=?').bind(data.group,id).run();
    await db.prepare('DELETE FROM friend_groups WHERE id=? AND NOT EXISTS (SELECT 1 FROM friend_members WHERE group_id=?)').bind(data.group,data.group).run();
    return friendGroups(db,id);
  }
  const count=(await db.prepare('SELECT COUNT(*) AS n FROM friend_members WHERE player_id=?').bind(id).first()).n;
  if(count>=5)return reply({error:'You can join five groups. Leave one to add another.'},400);
  if(path==='/api/groups/create'){
    const name=typeof data.name==='string'?data.name.normalize('NFC').trim().replace(/\s+/g,' '):'';
    if(!/^[\p{L}\p{N}\p{M} ._'’-]+$/u.test(name)||Array.from(name).length>24||!/[\p{L}\p{N}]/u.test(name))return reply({error:'Use a group name of 1–24 letters or numbers.'},400);
    const group=crypto.randomUUID(),invite=Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
    await db.prepare('INSERT INTO friend_groups (id,name,invite,created_at) VALUES (?,?,?,?)').bind(group,name,invite,now).run();
    const added=await db.prepare('INSERT INTO friend_members (group_id,player_id) SELECT ?,? WHERE (SELECT COUNT(*) FROM friend_members WHERE player_id=?)<5 RETURNING group_id').bind(group,id,id).first();
    if(!added){await db.prepare('DELETE FROM friend_groups WHERE id=?').bind(group).run();return reply({error:'Group limit reached.'},400);}
    return friendGroups(db,id);
  }
  const code=typeof data.code==='string'?data.code.trim().toUpperCase():'';
  if(!/^[A-F0-9]{12}$/.test(code))return reply({error:'Enter the 12-character invite code.'},400);
  const group=await db.prepare('SELECT id FROM friend_groups WHERE invite=?').bind(code).first();
  if(!group)return reply({error:'Invite code not found.'},404);
  const existing=await db.prepare('SELECT group_id FROM friend_members WHERE group_id=? AND player_id=?').bind(group.id,id).first();
  if(existing)return friendGroups(db,id);
  const added=await db.prepare('INSERT OR IGNORE INTO friend_members (group_id,player_id) SELECT ?,? WHERE (SELECT COUNT(*) FROM friend_members WHERE group_id=?)<30 AND (SELECT COUNT(*) FROM friend_members WHERE player_id=?)<5 RETURNING group_id').bind(group.id,id,group.id,id).first();
  return added?friendGroups(db,id):reply({error:'This group is full or you reached your five-group limit.'},400);
}
