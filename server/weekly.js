const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'}});
export const WEEKLY_RULES=[
  {id:'no-fever',name:'No Fever',description:'Perfect combos still score. Fever and its invincibility are disabled.'},
  {id:'double-sparks',name:'Double Spark Points',description:'Gold sparks score 20 base points. Shield charge and collection goals stay the same.'},
  {id:'one-shield',name:'One Shield Maximum',description:'Only one shield slot, even with five or six rings.'}
];
export function weeklyInfo(now=Date.now()){
  const date=new Date(now);date.setUTCHours(0,0,0,0);date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
  const week=date.toISOString().slice(0,10),number=Math.floor((date.getTime()-Date.UTC(2026,8,14))/604800000);
  const rule=WEEKLY_RULES[((number%3)+3)%3];let seed=2166136261;
  for(const c of 'loopshift-weekly-v1:'+week)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  return {kind:'weekly',week,seed,rule,duration:120,resetsAt:new Date(date.getTime()+604800000).toISOString()};
}
export async function weeklyBoard(db,id,week=weeklyInfo().week){
  const {results}=await db.prepare('SELECT s.player_id,p.name,p.avatar,p.selected_title,s.best FROM weekly_scores s JOIN players p ON p.id=s.player_id WHERE s.week=? AND s.best>0 ORDER BY s.best DESC,s.achieved_at,s.player_id LIMIT 10').bind(week).all();
  const profile=id?await db.prepare('SELECT name,avatar,best,selected_title FROM players WHERE id=?').bind(id).first():null;
  const mine=id?await db.prepare('SELECT best,achieved_at FROM weekly_scores WHERE week=? AND player_id=?').bind(week,id).first():null;
  const rank=mine?.best>0?(await db.prepare('SELECT COUNT(*)+1 AS rank FROM weekly_scores WHERE week=? AND (best>? OR (best=? AND (achieved_at<? OR (achieved_at=? AND player_id<?))))').bind(week,mine.best,mine.best,mine.achieved_at,mine.achieved_at,id).first()).rank:null;
  return {challenge:weeklyInfo(Date.parse(week+'T12:00:00Z')),entries:results.map((p,i)=>({rank:i+1,name:p.name,avatar:p.avatar,title:p.selected_title,score:p.best,isYou:p.player_id===id})),me:profile?{key:id,name:profile.name,avatar:profile.avatar,title:profile.selected_title,best:mine?.best||0,mainBest:profile.best,rank}:null};
}
export async function weeklyAction(path,db,id,data,now){
  if(path==='/api/weekly/start'){
    const current=await db.prepare('SELECT started_at FROM weekly_runs WHERE player_id=? ORDER BY started_at DESC LIMIT 1').bind(id).first();
    if(current&&now-current.started_at<1000)return reply({error:'Wait a moment before starting again.'},429);
    const challenge=weeklyInfo(now),token=crypto.randomUUID();
    await db.prepare('DELETE FROM weekly_runs WHERE started_at<?').bind(now-172800000).run();
    await db.prepare('INSERT INTO weekly_runs (token,player_id,week,started_at) VALUES (?,?,?,?)').bind(token,id,challenge.week,now).run();
    return reply({...challenge,token,board:await weeklyBoard(db,id,challenge.week)});
  }
  if(typeof data.token!=='string'||data.token.length>64||!Number.isSafeInteger(data.score)||data.score<0||data.score>72100||!Number.isFinite(data.duration)||data.duration<0||data.duration>120.01||data.score>data.duration*600+100)return reply({error:'This weekly score could not be accepted.'},400);
  const run=await db.prepare('SELECT * FROM weekly_runs WHERE player_id=? AND token=?').bind(id,data.token).first();
  if(!run)return reply({error:'This weekly attempt is unavailable. Start a new weekly run.'},410);
  if(now-run.started_at>172800000)return reply({error:'This weekly attempt expired after 48 hours.'},410);
  if(data.duration>(now-run.started_at)/1000+2)return reply({error:'The submitted play time is invalid.'},400);
  const ms=Math.round(data.duration*1000);
  const result=await db.prepare('UPDATE weekly_runs SET finish_score=COALESCE(finish_score,?),finish_duration=COALESCE(finish_duration,?),finished_at=COALESCE(finished_at,?) WHERE token=? AND player_id=? RETURNING finish_score,finish_duration,finished_at').bind(data.score,ms,now,data.token,id).first();
  if(result.finish_score!==data.score||result.finish_duration!==ms)return reply({error:'This attempt already submitted a different score.'},409);
  await db.prepare('INSERT INTO weekly_scores (week,player_id,best,achieved_at) VALUES (?,?,?,?) ON CONFLICT(week,player_id) DO UPDATE SET achieved_at=CASE WHEN excluded.best>weekly_scores.best THEN excluded.achieved_at ELSE weekly_scores.achieved_at END,best=MAX(weekly_scores.best,excluded.best)').bind(run.week,id,data.score,result.finished_at).run();
  return reply(await weeklyBoard(db,id,run.week));
}
