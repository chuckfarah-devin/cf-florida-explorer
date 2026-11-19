import { expect, it, vi } from 'vitest';
import { createConditionsHandler, parseIncidents, parseCameras, miles } from './conditions';
const stamp = Date.parse('2026-11-19T16:00:00Z');
const road = '<h1>FLORIDA HIGHWAY PATROL</h1>Latitude Longitude<table><tr>'+['Travel advisory','11/19/2026 10:00:00','','','PALM BEACH','Belvedere Rd','ROADWAY FLOODED','26.69','-80.18'].map(v=>`<td>${v}</td>`).join('')+'</tr></table>';
const camera = '<wink_mediarouter><stream state="active" title="Belvedere &amp; Sansburys" guid="WF01-9020-2035-6937-1DE8" lat="26.6917" lng="-80.1843"></stream></wink_mediarouter>';
const req = (lat=26.69,lon=-80.18) => new Request('https://example.com/api/conditions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat,lon})});
function source(input: RequestInfo | URL) {
 const url=String(input);
 if(url.includes('CadView'))return new Response(road);
 if(url.includes('loader.php'))return new Response(camera);
 if(url.includes('/alerts/'))return Response.json({features:[{properties:{headline:'Flood Watch',description:'Heavy rain',expires:'2026-11-20T00:00:00Z'}},{properties:{headline:'Expired',expires:'2026-11-18T00:00:00Z'}}]});
 if(url.includes('/points/'))return Response.json({properties:{observationStations:'https://api.weather.gov/gridpoints/MFL/1,1/stations'}});
 if(url.endsWith('/stations'))return Response.json({features:[{geometry:{coordinates:[-80.18,26.69]},properties:{stationIdentifier:'KPBI',name:'Palm Beach Airport'}}]});
 return Response.json({properties:{timestamp:'2026-11-19T15:55:00Z',textDescription:'Rain',temperature:{unitCode:'wmoUnit:degC',value:25},precipitationLastHour:{unitCode:'wmoUnit:m',value:0.0254}}});
}
it('binds live results to any Florida point, filters expired alerts and preserves station units',async()=>{
 const fetcher=vi.fn(async(input:RequestInfo|URL)=>source(input));const handler=createConditionsHandler(fetcher,()=>stamp);
 const j=await(await handler(req())).json();expect(j.point).toEqual({lat:26.69,lon:-80.18});expect(j.alerts.items).toHaveLength(1);expect(j.observation).toMatchObject({temperatureF:77,rainLastHourInches:1,stale:false});expect(j.roads.items[0].remarks).toBe('ROADWAY FLOODED');expect(j.cameras.items[0].name).toBe('Belvedere & Sansburys');
 const before=fetcher.mock.calls.length;await handler(req());expect(fetcher).toHaveBeenCalledTimes(before);
});
it('works outside the example area and never reuses Briny data for another point',async()=>{
 const handler=createConditionsHandler(async(input)=>source(input),()=>stamp);const j=await(await handler(req(30.44,-84.28))).json();expect(j.point.lat).toBe(30.44);expect(j.cameras.state).toBe('outside_coverage');expect(j.roads.items).toEqual([]);expect(j.observation.state).toBe('unavailable');
});
it('separates source failure from empty results and rejects outside Florida without any request',async()=>{
 const fetcher=vi.fn().mockRejectedValue(new Error());const handler=createConditionsHandler(fetcher,()=>stamp);expect((await handler(req(40,-80))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();const j=await(await handler(req())).json();expect(j.alerts.state).toBe('unavailable');expect(j.roads.state).toBe('unavailable');
});
it('rejects an upstream metadata URL pointing outside approved source hosts',async()=>{
 const fetcher=vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/points/')?Response.json({properties:{observationStations:'https://evil.example/stations'}}):source(input));const j=await(await createConditionsHandler(fetcher,()=>stamp)(req())).json();expect(j.observation.state).toBe('unavailable');expect(fetcher.mock.calls.every(c=>!String(c[0]).includes('evil.example'))).toBe(true);
});
it('parses public source records without executing markup and rejects changed formats',()=>{
 expect(parseIncidents(road)[0].location).toBe('Belvedere Rd');expect(()=>parseIncidents('Unavailable')).toThrow();expect(parseCameras(camera)[0].url).toContain('https://pbctrafficstreams.pbc.gov/portal/');expect(()=>parseCameras('<html>failure</html>')).toThrow();expect(miles({lat:26,lon:-80},{lat:26,lon:-80})).toBe(0);
});
