import { expect, it, vi } from 'vitest';
import { createAskService } from './ask';
import { createAskHandler } from './ask-api';
import { currentConditionsIntent } from './conditions-answer';
import { ROAD_SOURCE, miles, type Conditions } from './conditions';
const point={lat:26.69,lon:-80.18};
const window={startDate:'2026-10-25',endDate:'2026-10-29',datum:'MLLW' as const};
const at='2026-11-24T18:00:00Z';const now=()=>Date.parse(at);
function fixture():Conditions {return {point,checkedAt:at,alerts:{state:'ok',url:`https://api.weather.gov/alerts/active?point=${point.lat},${point.lon}`,items:[{title:'Flood Watch',description:'Heavy rain',expires:'2026-11-24T22:00:00Z'}]},observation:{state:'ok',url:'https://api.weather.gov/stations/KPBI/observations/latest',station:'Palm Beach Airport',distanceMiles:5,timestamp:'2026-11-24T17:45:00Z',description:'Light Rain',temperatureF:75,rainLastHourInches:null},roads:{state:'ok',url:ROAD_SOURCE,items:[]},cameras:{state:'ok',items:[{name:'Test road camera',lat:point.lat,lon:point.lon,distanceMiles:0,url:'https://pbctrafficstreams.pbc.gov/portal/index.php?test'}]}};}
function service(d=fixture()){const fema={lookup:vi.fn()};const noaa={lookup:vi.fn()};const lookup=vi.fn(async()=>d);return {fema,noaa,lookup,ask:createAskService({fema,noaa,conditions:lookup,now})};}
it('retrieves current evidence server-side without FEMA/NOAA tide lookup and cites the selected point',async()=>{
 const s=service();const a=await s.ask.answer(point,3,'What weather alerts apply here?',window);
 expect(s.lookup).toHaveBeenCalledWith(point);expect(s.fema.lookup).not.toHaveBeenCalled();expect(s.noaa.lookup).not.toHaveBeenCalled();expect(a.intent).toBe('conditions');expect(a.findings[0]).toMatchObject({evidenceClass:'weather_alert',citations:['C1']});expect(a.findings[0].text).toContain('Flood Watch');expect(a.sources[0].url).toContain('point=26.69,-80.18');
});
it('retains observed timestamp, units and missing rainfall without substituting historical tide dates',async()=>{
 const s=service();const a=await s.ask.answer(point,1,'What is the weather now?',window);expect(a.findings[0].text).toContain('75°F');expect(a.findings[0].text).toContain('Past-hour rainfall was not reported');expect(a.findings[0].text).not.toContain('2026-10');expect(a.limitations.join(' ')).toContain('not the historical tide-date controls');
 const d=fixture();d.observation.timestamp='2026-11-24T12:00:00Z';expect((await service(d).ask.answer(point,1,'What is the weather now?',window)).findings[0].text).toContain('more than two hours old');
});
it('keeps no nearby road reports distinct from road source failure',async()=>{
 const a=await service().ask.answer(point,1,'Are any road problems reported nearby?',window);expect(a.findings[0].text).toContain('Roads have not been confirmed clear');
 const d=fixture();d.roads.state='unavailable';const failed=await service(d).ask.answer(point,1,'Are any road problems reported nearby?',window);expect(failed.supported).toBe(false);expect(failed.findings).toEqual([]);expect(failed.limitations.join(' ')).toContain('reports are unavailable');
});
it('recomputes incident distances and retains source remarks and received time',async()=>{
 const d=fixture();d.roads.items=[{kind:'Travel advisory',received:'11/24/2026 12:00:00',county:'PALM BEACH',location:'Test road',remarks:'ROADWAY FLOODED',lat:26.70,lon:-80.18,distanceMiles:miles(point,{lat:26.70,lon:-80.18})}];const a=await service(d).ask.answer(point,1,'Any road incidents nearby?',window);expect(a.findings[0].text).toContain('ROADWAY FLOODED');expect(a.findings[0].text).toContain('11/24/2026 12:00:00');d.roads.items[0].distanceMiles=0;await expect(service(d).ask.answer(point,1,'Any road incidents nearby?',window)).rejects.toThrow('Invalid road evidence');
});
it('keeps camera-list coverage and camera imagery separate',async()=>{
 const a=await service().ask.answer(point,1,'Where is the closest traffic camera?',window);expect(a.findings[0].text).toContain('listed public traffic camera');expect(a.limitations.join(' ')).toContain('not verified live images');const d=fixture();d.cameras={state:'outside_coverage',items:[]};const other=await service(d).ask.answer(point,1,'Where is the closest traffic camera?',window);expect(other.supported).toBe(false);expect(other.limitations.join(' ')).toContain('Use FL511');
});
it.each(['wrong point','old check','wrong alert scope','wrong camera host'])('rejects %s instead of generating a sourced claim',async(which)=>{
 const d=fixture();let q='What weather alerts apply here?';if(which==='wrong point')d.point={lat:30,lon:-84};if(which==='old check')d.checkedAt='2026-11-23T18:00:00Z';if(which==='wrong alert scope')d.alerts.url='https://api.weather.gov/alerts/active?point=30,-84';if(which==='wrong camera host'){d.cameras.items[0].url='https://evil.example/camera';q='Where is the closest camera?';}await expect(service(d).ask.answer(point,1,q,window)).rejects.toThrow();
});
it('does not repeat expired alerts and never treats failed alerts as no alerts',async()=>{
 const d=fixture();d.alerts.items[0].expires='2026-11-24T17:00:00Z';const a=await service(d).ask.answer(point,1,'Any alerts here?',window);expect(a.findings[0].text).toContain('No active NWS alerts');d.alerts.state='unavailable';const b=await service(d).ask.answer(point,1,'Any alerts here?',window);expect(b.supported).toBe(false);expect(b.findings).toEqual([]);
});
it.each(['Will this road flood tomorrow?','Is this road safe?','Give me a safe route','What weather did we have in 2025?'])('does not route unsupported question %s to current evidence',q=>expect(currentConditionsIntent(q)).toBeNull());
it('routes the HTTP Ask API through the same current evidence service',async()=>{
 const response=await createAskHandler(service().ask)(new Request('https://example.com/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...point,selectionId:1,...window,question:'Are any road problems reported nearby?'})}));expect(response.status).toBe(200);expect(await response.json()).toMatchObject({intent:'conditions',supported:true});
});
