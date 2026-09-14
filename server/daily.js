const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'}});
export function dailyInfo(now=Date.now()){
  const day=new Date(now).toISOString().slice(0,10);
  let seed=2166136261;
  for(const c of 'loopshift-daily-v2:'+day)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  return {day,seed,duration:120,resetsAt:new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString()};
}
export async function dailyBoard(db,id,day=dailyInfo().day){
  const {results}=await db.prepare('SELECT s.player_id, p.name, s.best FROM daily_scores s JOIN players p ON p.id=s.player_id WHERE s.day=? AND s.best>0 ORDER BY s.best DESC, s.achieved_at, s.player_id LIMIT 10').bind(day).all();
  const profile=id?await db.prepare('SELECT name,highest_level,furthest_pass,achievements,best_chain,best_clean FROM players WHERE id=?').bind(id).first():null;
  const mine=id?await db.prepare('SELECT best,achieved_at FROM daily_scores WHERE day=? AND player_id=?').bind(day,id).first():null;
  const rank=mine?.best>0?(await db.prepare('SELECT COUNT(*)+1 AS rank FROM daily_scores WHERE day=? AND (best>? OR (best=? AND (achieved_at<? OR (achieved_at=? AND player_id<?))))').bind(day,mine.best,mine.best,mine.achieved_at,mine.achieved_at,id).first()).rank:null;
  return {challenge:dailyInfo(Date.parse(day+'T12:00:00Z')),entries:results.map((p,i)=>({rank:i+1,name:p.name,score:p.best,isYou:p.player_id===id})),me:profile?{key:id,name:profile.name,best:mine?.best||0,rank,progress:{highest:profile.highest_level,distance:profile.furthest_pass,badges:profile.achievements,chain:profile.best_chain,clean:profile.best_clean}}:null};
}
export async function dailyAction(path,db,id,data,now){
  if(path==='/api/daily/start'){
    const current=await db.prepare('SELECT started_at FROM daily_runs WHERE player_id=?').bind(id).first();
    if(current&&now-current.started_at<1000)return reply({error:'Wait a moment before starting again.'},429);
    const challenge=dailyInfo(now),token=crypto.randomUUID();
    await db.prepare('INSERT INTO daily_runs (player_id,token,day,started_at) VALUES (?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET token=excluded.token,day=excluded.day,started_at=excluded.started_at,finish_score=NULL,finish_duration=NULL,finished_at=NULL').bind(id,token,challenge.day,now).run();
    return reply({...challenge,token,board:await dailyBoard(db,id,challenge.day)});
  }
  if(typeof data.token!=='string'||data.token.length>64||!Number.isSafeInteger(data.score)||data.score<0||data.score>72100||!Number.isFinite(data.duration)||data.duration<0||data.duration>120.01||data.score>data.duration*600+100)return reply({error:'This daily score could not be accepted.'},400);
  const run=await db.prepare('SELECT * FROM daily_runs WHERE player_id=? AND token=?').bind(id,data.token).first();
  if(!run)return reply({error:'This daily attempt was replaced. Start a new daily challenge.'},409);
  if(now-run.started_at>1800000)return reply({error:'This daily attempt expired after 30 minutes. Start a new challenge.'},410);
  if(data.duration>(now-run.started_at)/1000+2)return reply({error:'The submitted play time is invalid.'},400);
  const milliseconds=Math.round(data.duration*1000);
  const finished=await db.prepare('UPDATE daily_runs SET finish_score=COALESCE(finish_score,?),finish_duration=COALESCE(finish_duration,?),finished_at=COALESCE(finished_at,?) WHERE player_id=? AND token=? RETURNING finish_score,finish_duration,finished_at').bind(data.score,milliseconds,now,id,data.token).first();
  if(!finished||finished.finish_score!==data.score||finished.finish_duration!==milliseconds)return reply({error:'This attempt has already submitted a different score.'},409);
  // Retrying after a network failure is safe, including a failure between these statements.
  await db.prepare('INSERT INTO daily_scores (day,player_id,best,achieved_at) VALUES (?,?,?,?) ON CONFLICT(day,player_id) DO UPDATE SET achieved_at=CASE WHEN excluded.best>daily_scores.best THEN excluded.achieved_at ELSE daily_scores.achieved_at END,best=MAX(daily_scores.best,excluded.best)').bind(run.day,id,data.score,finished.finished_at).run();
  return reply(await dailyBoard(db,id,run.day));
}
