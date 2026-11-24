import { createHash } from 'node:crypto';
import { checkPoint, type LatLon } from '../src/config/bounds.ts';
import type { TideRequest } from '../src/noaa/types.ts';
import type { AskResponse } from '../src/ask/types.ts';
import { handleConditionsRequest, miles, ROAD_SOURCE, CAMERA_SOURCE, type Conditions } from './conditions.ts';
import { CLAIM_RULES, validateClaim, immutable, type AnswerSource, type Claim, type Value } from './claim-validation.ts';

export type CurrentTopic = 'alerts' | 'roads' | 'cameras' | 'weather' | 'summary';
export function currentConditionsIntent(question: string): CurrentTopic | null {
  const q=question.toLowerCase();
  // Future/historical comparisons, route planning and passability require other evidence.
  if (/\b(tomorrow|yesterday|last|next|will|forecast|route|directions|safe|safest|drive|driving|passable|depth|deep|cause|caused|why|insurance|previous|historical|ago)\b|\b\d{4}\b|\b\d{1,2}[/-]\d{1,2}\b|\b(jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)\s+\d/.test(q)) return null;
  if (/\b(camera|cameras|webcam|webcams)\b/.test(q)) return 'cameras';
  if (/\b(road|roads|traffic|closure|closures|incident|incidents)\b/.test(q)) return 'roads';
  if (/\b(alert|alerts|warning|warnings|watch|watches)\b/.test(q)) return 'alerts';
  if (/\b(weather|raining|rainfall|temperature)\b/.test(q)) return 'weather';
  if (/\b(current|now|today|tonight)\b/.test(q) && /\b(condition|conditions|rain|flood|flooding|happening)\b/.test(q)) return 'summary';
  return null;
}
const timestamp = (s: unknown): s is string => typeof s === 'string' && Number.isFinite(Date.parse(s));
const text = (s: unknown): s is string => typeof s === 'string' && s.length>0 && s.length<=1000;
const number = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const when = (s: string) => new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(s));
const validUrl = (value: string, host: string, path?: string) => { try { const u=new URL(value); return u.origin===`https://${host}` && !u.username && !u.password && (!path || u.pathname===path); } catch { return false; } };
export async function retrieveCurrentConditions(point: LatLon): Promise<Conditions> {
  const response=await handleConditionsRequest(new Request('https://florida-explorer.internal/api/conditions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(point)}));
  if (!response.ok) throw new Error('Current evidence unavailable');
  return response.json() as Promise<Conditions>;
}
function render(c: Claim, source: AnswerSource): string | null {
  if (!validateClaim(c,[source])) return null;
  const f=source.fields;
  switch(c.type) {
    case 'current_alert': return `NWS reports this alert for your selected spot: ${f.title}${f.expires ? ` (alert message expires ${when(String(f.expires))})` : ''}.`;
    case 'current_alerts_empty': return `No active NWS alerts were returned for your selected spot when checked ${when(String(f.checkedAt))}. This does not establish that conditions are safe.`;
    case 'current_station': return `The latest available report from ${f.station}, ${Number(f.distanceMiles).toFixed(1)} mi from your spot, was ${String(f.description||'weather not described').toLowerCase()}${f.temperatureF!==null?` at ${Math.round(Number(f.temperatureF))}°F`:''} at ${when(String(f.timestamp))}.${f.stale==='yes'?' This report is more than two hours old.':''}${f.rainLastHourInches!==null?` Past-hour rainfall at that station was ${Number(f.rainLastHourInches).toFixed(2)} inches.`:' Past-hour rainfall was not reported.'}`;
    case 'current_road': return `FHP lists ${f.kind} at ${f.location}, about ${Number(f.distanceMiles).toFixed(1)} mi from your spot. Reported status: ${f.remarks || 'not supplied'}. Received ${f.received} (time as published by FHP); feed checked ${when(String(f.checkedAt))}.`;
    case 'current_roads_empty': return `No FHP incidents were returned within ${f.radiusMiles} mi when checked ${when(String(f.checkedAt))}. Roads have not been confirmed clear.`;
    case 'current_camera': return `${f.name} is a listed public traffic camera about ${Number(f.distanceMiles).toFixed(1)} mi from your spot. Its listing was retrieved ${when(String(f.checkedAt))}; open the source viewer to check the image and its time.`;
    case 'current_cameras_empty': return `No connected county cameras were found within ${f.radiusMiles} mi when checked ${when(String(f.checkedAt))}. This is not a complete statewide camera inventory.`;
    default: return null;
  }
}
export function createConditionsAnswerService(options: {lookup?: (point:LatLon)=>Promise<Conditions>; now?:()=>number}={}) {
  const lookup=options.lookup??retrieveCurrentConditions; const now=options.now??Date.now;
  return {async answer(point: LatLon, selectionId:number, question:string, window:TideRequest, topic:CurrentTopic):Promise<AskResponse & {sources: AnswerSource[]}> {
    const findings: AskResponse['findings']=[]; const sources: AnswerSource[]=[]; const limitations:string[]=['Current conditions use recent source checks, not the historical tide-date controls.','Reports near a spot cannot establish water depth, a dry road, a safe route or the cause of flooding. Never drive through floodwater.'];
    const statuses: AskResponse['statuses']=[];
    const add=(type:Claim['type'],label:string,url:string,fields:Record<string,Value>,checkedAt:string) => {
      const ref=`C${sources.length+1}`; const rule=CLAIM_RULES[type];
      const source:AnswerSource={ref,label,url,retrievedAtUtc:checkedAt,kind:rule.kind,fields};
      const c:Claim={type,evidenceClass:rule.kind,citations:[ref],facts:rule.fields.map(field=>({ref,field,value:fields[field]}))};
      const rendered=render(c,source); if (!rendered) throw new Error('Invalid current claim');
      sources.push(source);findings.push({id:`C${findings.length+1}`,text:rendered,evidenceClass:rule.kind,citations:[ref],facts:c.facts});
    };
    let d:Conditions|undefined;
    try { d=await lookup(point); } catch { limitations.push('Current-condition sources could not be retrieved.'); }
    if (d) {
      if (d.point?.lat!==point.lat || d.point?.lon!==point.lon || !timestamp(d.checkedAt) || now()-Date.parse(d.checkedAt)>300000 || Date.parse(d.checkedAt)>now()+30000) throw new Error('Wrong point or stale current evidence');
      const at=d.checkedAt;
      if (['alerts','summary'].includes(topic)) {
        statuses.push({source:'NWS current alerts',state:d.alerts.state});
        if (d.alerts.state==='ok') {
          const expected=`https://api.weather.gov/alerts/active?point=${point.lat},${point.lon}`;
          if (d.alerts.url!==expected || !Array.isArray(d.alerts.items) || d.alerts.items.length>12) throw new Error('Wrong alert source');
          for (const a of d.alerts.items) if (!text(a.title) || (a.expires!==null && !timestamp(a.expires))) throw new Error('Malformed alert');
          const active=d.alerts.items.filter(a=>!a.expires || Date.parse(a.expires)>now());
          if (!active.length) add('current_alerts_empty','NWS current alerts',expected,{count:0,checkedAt:at},at);
          for (const a of active) add('current_alert','NWS current alerts',expected,{title:a.title,expires:a.expires,checkedAt:at},at);
        } else limitations.push('NWS alerts are unavailable; no absence-of-alerts finding can be made.');
      }
      if (['weather','summary'].includes(topic)) {
        const o=d.observation;statuses.push({source:'Nearby weather station',state:o.state});
        if (o.state==='ok') {
          if (!text(o.station) || typeof o.description!=='string' || o.description.length>1000 || !timestamp(o.timestamp) || Date.parse(o.timestamp)>now()+300000 || !number(o.distanceMiles) || o.distanceMiles<0 || o.distanceMiles>50 || !o.url || !validUrl(o.url,'api.weather.gov') || !/^\/stations\/[A-Z0-9]{3,12}\/observations\/latest$/.test(new URL(o.url).pathname) || (o.temperatureF!=null && !number(o.temperatureF)) || (o.rainLastHourInches!=null && (!number(o.rainLastHourInches) || o.rainLastHourInches<0))) throw new Error('Invalid station evidence');
          add('current_station',`NWS station report · ${o.station}`,o.url,{station:o.station,description:o.description,timestamp:o.timestamp,distanceMiles:o.distanceMiles,temperatureF:o.temperatureF??null,rainLastHourInches:o.rainLastHourInches??null,stale:now()-Date.parse(o.timestamp)>7200000?'yes':'no'},at);
          limitations.push('Station weather and rainfall describe the station, not measured water in the selected street.');
        } else limitations.push('A nearby station observation is unavailable.');
      }
      if (['roads','summary'].includes(topic)) {
        statuses.push({source:'FHP nearby road reports',state:d.roads.state});
        if (d.roads.state==='ok') {
          if (d.roads.url!==ROAD_SOURCE || !Array.isArray(d.roads.items) || d.roads.items.length>8) throw new Error('Wrong road source');
          if (!d.roads.items.length) add('current_roads_empty','FHP live road report',ROAD_SOURCE,{count:0,radiusMiles:15,checkedAt:at},at);
          for (const r of d.roads.items) {
            const distance=miles(point,r);
            if (!checkPoint(r).ok || !number(r.lat) || !number(r.lon) || !number(r.distanceMiles) || !Number.isFinite(distance) || distance>15 || Math.abs(distance-r.distanceMiles)>0.00001 || !text(r.kind) || !text(r.location) || typeof r.remarks!=='string' || r.remarks.length>1000 || !text(r.received)) throw new Error('Invalid road evidence');
            add('current_road','FHP live road report',ROAD_SOURCE,{kind:r.kind,location:r.location,remarks:r.remarks,received:r.received,distanceMiles:distance,checkedAt:at},at);
          }
        } else limitations.push('FHP road reports are unavailable; this does not establish that nearby roads are clear.');
        limitations.push('Nearby reports are within 15 straight-line miles, not incidents checked along a driving route. FHP may not list every flooded local road.');
      }
      if (topic==='cameras') {
        statuses.push({source:'Palm Beach County camera listings',state:d.cameras.state});
        if (d.cameras.state==='ok') {
          if (!Array.isArray(d.cameras.items) || d.cameras.items.length>4) throw new Error('Invalid camera list');
          if (!d.cameras.items.length) add('current_cameras_empty','Palm Beach County camera catalogue',CAMERA_SOURCE,{count:0,radiusMiles:15,checkedAt:at},at);
          for (const c of [...d.cameras.items].sort((a,b)=>a.distanceMiles-b.distanceMiles)) {
            const distance=miles(point,c);
            if (!checkPoint(c).ok || !number(c.lat) || !number(c.lon) || !number(c.distanceMiles) || !Number.isFinite(distance) || distance>15 || Math.abs(distance-c.distanceMiles)>0.00001 || !text(c.name) || !validUrl(c.url,'pbctrafficstreams.pbc.gov','/portal/index.php')) throw new Error('Invalid camera evidence');
            add('current_camera','Palm Beach County camera viewer',c.url,{name:c.name,distanceMiles:distance,checkedAt:at},at);
          }
        } else limitations.push(d.cameras.state==='outside_coverage'?'Direct camera listings are connected only around Palm Beach County. Use FL511 for statewide cameras.':'The county camera catalogue is unavailable. Use FL511 to check its camera viewer.');
        limitations.push('These are nearby listed cameras, not verified live images. Camera availability does not establish that a road is dry.');
      }
    } else statuses.push({source:'Current-condition sources',state:'unavailable'});
    const pack=immutable({point,selectionId,sources,findings,statuses});
    const packId=createHash('sha256').update(JSON.stringify(pack)).digest('hex');
    return immutable({domain:'water',point:structuredClone(point),selectionId,question,window:structuredClone(window),createdAtUtc:new Date(now()).toISOString(),packId,mode:'template',intent:'conditions',supported:findings.length>0,findings,sources,limitations,statuses});
  }};
}
