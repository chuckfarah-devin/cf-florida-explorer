import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ConditionsCard } from './ConditionsCard';
const selection={selectionId:1,point:{lat:26.69,lon:-80.18},source:'typed' as const};
const result={point:selection.point,checkedAt:'2026-11-19T16:00:00Z',alerts:{state:'ok',items:[]},observation:{state:'unavailable'},roads:{state:'ok',items:[]},cameras:{state:'outside_coverage',items:[]}};
afterEach(()=>vi.unstubAllGlobals());
it('keeps no reports distinct from a clear-road claim and names statewide source links',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(result)));render(<ConditionsCard selection={selection}/>);
 expect(await screen.findByText(/No nearby incidents returned/)).toHaveTextContent('Roads have not been confirmed clear');expect(screen.getByText('Current station report unavailable.')).toBeInTheDocument();expect(screen.getByRole('link',{name:'Open statewide traffic cameras'})).toHaveAttribute('href','https://www.fl511.com/');
});
it('discards a response from the previous selected point',async()=>{
 let finish:(r:Response)=>void=()=>{};const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;})).mockResolvedValue(Response.json({...result,point:{lat:30.44,lon:-84.28},alerts:{state:'unavailable',items:[]}}));vi.stubGlobal('fetch',fetcher);
 const view=render(<ConditionsCard selection={selection}/>);view.rerender(<ConditionsCard selection={{...selection,selectionId:2,point:{lat:30.44,lon:-84.28}}}/>);expect(await screen.findByText('Alerts unavailable.')).toBeInTheDocument();finish(Response.json(result));await waitFor(()=>expect(screen.queryByText('No active NWS alerts returned for this spot.')).not.toBeInTheDocument());
});
