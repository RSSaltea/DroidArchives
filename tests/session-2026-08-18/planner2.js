const ROSTER='ROSTER',SOLD='SOLD';
const WORK_STATIONS=[...PRODUCTIVE_STATIONS,'UPGRADE_CHIP'];
const STAGING_STATIONS=['LOUNGE','COMPANION'];
// When a droid cannot reach its own type of slot, the game sends it to the
// "nearest" credit slot — which depends on how your base is laid out. This is
// that tie-break. Steps that actually depend on it are flagged in the plan so
// you can sanity-check them; put the stations in your own walking order and the
// flags go away.
const NEAREST_ORDER=['WORKER','ASTROMECH','BATTLE'];
// A droid already sitting in a credit slot cannot be re-issued Work to land in a
// *different* credit station: auto-route puts it straight back into its own
// type. Relocating one means staging it in the Lounge or as a companion first.
// Set this true only if the game turns out to allow a direct credit-to-credit
// swap, in which case the planner will emit the shorter one-command version.
const ALLOW_DIRECT_RESTATION=false;
const ROUTE_SEARCH_LIMIT=60000,ROUTE_SEARCH_MS=120;
const placeName=station=>station===ROSTER?'Roster':stationName(station);

function optimiseRoutePlan(baseP,rawProjected){
  const projected=normaliseProjectedForSteps(baseP,rawProjected),keyOf=x=>`${x.source}:${x.unit}`;
  const units=new Map([...baseP.placed,...projected.placed,...projected.sell,...projected.overflow].map(x=>[keyOf(x),x]));
  const startAt=new Map([...units.keys()].map(key=>[key,ROSTER]));
  for(const x of baseP.placed)startAt.set(keyOf(x),x.station);
  const goalAt=new Map(projected.placed.map(x=>[keyOf(x),x.station])),sellKeys=new Set(projected.sell.map(keyOf)),lockedKeys=new Set(baseP.placed.filter(x=>x.lockedSlot).map(keyOf));
  const capacityOf=Object.fromEntries(Object.keys(SLOT_RULES).map(type=>[type,stationSlotIndices(type).length]));
  // Only droids that actually need a command are tracked. Everything else holds
  // its slot for the whole plan, so its occupancy is a constant.
  const tracked=[...units.keys()].filter(key=>{
    if(lockedKeys.has(key))return false;
    if(sellKeys.has(key))return true;
    const goal=goalAt.get(key),start=startAt.get(key);
    if(goal==='BUILD'&&start!=='BUILD'){console.warn('Optimise: no command can move a droid into Build',key);return false}
    return Boolean(goal)&&goal!==start;
  });
  const trackedSet=new Set(tracked),staticOccupancy={};
  for(const [key,station] of startAt)if(!trackedSet.has(key)&&station!==ROSTER)staticOccupancy[station]=(staticOccupancy[station]||0)+1;
  const nativeOf=key=>state.droids.find(d=>d.name===units.get(key)?.name)?.type||'';
  const natives=tracked.map(nativeOf),goals=tracked.map(key=>goalAt.get(key)),sells=tracked.map(key=>sellKeys.has(key));
  const startState=tracked.map(key=>startAt.get(key));

  const countsFor=st=>{const counts={...staticOccupancy};for(const pos of st)if(pos&&pos!==SOLD&&pos!==ROSTER)counts[pos]=(counts[pos]||0)+1;return counts};
  // A droid vacates its own slot as it leaves, so that slot does not count
  // against the space it is moving into.
  const roomIn=(station,counts,pos)=>((counts[station]||0)-(pos===station?1:0))<(capacityOf[station]||0);
  // The game's auto-route: own type first, else nearest credit slot, Upgrade
  // Chip last. `assumed` marks the case where more than one credit station was
  // open and NEAREST_ORDER had to break the tie.
  const landing=(i,st,counts)=>{
    const native=natives[i],pos=st[i];
    if(PRODUCTIVE_STATIONS.includes(native)&&roomIn(native,counts,pos))return{to:native,assumed:false};
    const open=NEAREST_ORDER.filter(station=>roomIn(station,counts,pos));
    if(open.length)return{to:open[0],assumed:open.length>1};
    return roomIn('UPGRADE_CHIP',counts,pos)?{to:'UPGRADE_CHIP',assumed:false}:null;
  };
  const satisfied=(i,st)=>sells[i]?st[i]===SOLD:st[i]===goals[i];
  const allDone=st=>{for(let i=0;i<st.length;i++)if(!satisfied(i,st))return false;return true};
  // Commands you can issue right now, standing at `here`. Roster droids are not
  // in the base, so they are reachable from anywhere.
  const actionsFor=(i,st,here,counts)=>{
    if(satisfied(i,st))return[];
    const pos=st[i];
    if(pos!==here&&pos!==ROSTER)return[];
    if(sells[i])return[{i,kind:'sell',to:SOLD,assumed:false}];
    const goal=goals[i];
    if(goal==='LOUNGE')return roomIn('LOUNGE',counts,pos)?[{i,kind:'lounge',to:'LOUNGE',assumed:false}]:[];
    if(goal==='COMPANION')return roomIn('COMPANION',counts,pos)?[{i,kind:'companion',to:'COMPANION',assumed:false}]:[];
    if(!WORK_STATIONS.includes(goal))return[];
    if(ALLOW_DIRECT_RESTATION||!PRODUCTIVE_STATIONS.includes(pos)){
      const land=landing(i,st,counts);
      // Auto-route would drop it somewhere else; wait for a state where it lands
      // on target rather than emitting a step that misfires in game.
      return land&&land.to===goal?[{i,kind:'work',to:goal,assumed:land.assumed}]:[];
    }
    return STAGING_STATIONS.filter(station=>station!==pos&&roomIn(station,counts,pos)).map(station=>({i,kind:'stage',to:station,assumed:false}));
  };
  const stationsWithWork=(st,here)=>{const set=new Set();for(let i=0;i<st.length;i++){if(satisfied(i,st))continue;const pos=st[i];if(pos===ROSTER||pos===SOLD||pos===here)continue;set.add(pos)}return set};

  // Trips are the only cost, so this is A* over (droid positions, where you are
  // standing): issuing a command is free, walking to another station costs one.
  // The heuristic — how many other stations still hold work — never overshoots,
  // so the first complete plan found uses the fewest possible trips. Plans that
  // lean on the NEAREST_ORDER guess are held back behind clean ones at the same
  // cost. Big shuffles can outrun the budget, in which case greedy() takes over.
  const search=()=>{
    const clean=[],dirty=[],seen=new Map(),started=Date.now();
    const push=node=>{const f=node.g+stationsWithWork(node.st,node.here).size,into=node.assumed?dirty:clean;(into[f]||(into[f]=[])).push(node)};
    push({st:startState,here:null,g:0,assumed:0,parent:null,action:null});
    seen.set(startState.join('|')+'@null',0);
    let f=0,expansions=0;
    while(f<Math.max(clean.length,dirty.length)){
      const bucket=(clean[f]&&clean[f].length)?clean[f]:dirty[f];
      if(!bucket||!bucket.length){f++;continue}
      const node=bucket.pop();
      if(++expansions>ROUTE_SEARCH_LIMIT)return null;
      if(!(expansions&255)&&Date.now()-started>ROUTE_SEARCH_MS)return null;
      if(seen.get(node.st.join('|')+'@'+node.here)<node.g)continue;
      if(allDone(node.st))return node;
      const counts=countsFor(node.st);
      for(let i=0;i<node.st.length;i++)for(const action of actionsFor(i,node.st,node.here,counts)){
        const st=node.st.slice();st[action.i]=action.to;
        const childKey=st.join('|')+'@'+node.here;
        if(seen.has(childKey)&&seen.get(childKey)<=node.g)continue;
        seen.set(childKey,node.g);
        push({st,here:node.here,g:node.g,assumed:node.assumed+(action.assumed?1:0),parent:node,action});
      }
      for(const station of stationsWithWork(node.st,node.here)){
        const childKey=node.st.join('|')+'@'+station;
        if(seen.has(childKey)&&seen.get(childKey)<=node.g+1)continue;
        seen.set(childKey,node.g+1);
        push({st:node.st,here:station,g:node.g+1,assumed:node.assumed,parent:node,action:{kind:'travel',to:station}});
      }
    }
    return null;
  };
  // Used when the search outruns its budget on a big shuffle. Same rules, but it
  // just clears whichever station has the most to do, finishing droids off in
  // preference to staging more of them so the Lounge cannot silt up.
  const rank={sell:0,work:1,lounge:2,companion:2,stage:3};
  const greedy=()=>{
    let st=startState.slice(),here=null;const trail=[];
    for(let guard=0;guard<800&&!allDone(st);guard++){
      for(let acted=true;acted;){
        acted=false;
        const counts=countsFor(st);let best=null;
        for(let i=0;i<st.length;i++)for(const action of actionsFor(i,st,here,counts))if(!best||rank[action.kind]<rank[best.kind])best=action;
        if(best){st=st.slice();st[best.i]=best.to;trail.push(best);acted=true}
      }
      if(allDone(st))break;
      const options=[...stationsWithWork(st,here)];
      if(!options.length)break;
      const workAt=station=>{const counts=countsFor(st);let n=0;for(let i=0;i<st.length;i++)if(actionsFor(i,st,station,counts).length)n++;return n};
      const scored=options.map(station=>[station,workAt(station)]).sort((a,b)=>b[1]-a[1]);
      here=scored[0][0];
      trail.push({kind:'travel',to:here});
    }
    return{trail,complete:allDone(st)};
  };

  const found=search();
  let trail,complete;
  if(found){trail=[];for(let node=found;node&&node.action;node=node.parent)trail.unshift(node.action);complete=true}
  else({trail,complete}=greedy());

  const describe=(action,unit,from)=>{
    const name=unitName(unit);
    if(action.kind==='sell')return{type:'sell',text:from===ROSTER?`Sell ${name}.`:`Sell ${name} from ${placeName(from)}.`};
    if(action.kind==='work')return{type:'move',text:`Tell ${name} to go to work — it will take a ${placeName(action.to)} slot.`};
    if(action.kind==='lounge')return{type:'move',text:`Send ${name} to the Lounge.`};
    if(action.kind==='companion')return{type:'move',text:`Make ${name} your companion.`};
    if(action.to==='COMPANION')return{type:'move',text:`Make ${name} your companion to free its ${placeName(from)} slot — you will put it to work from there.`};
    return{type:'move',text:`Send ${name} to the Lounge to free its ${placeName(from)} slot — you will put it to work from there.`};
  };
  const steps=[];let st=startState.slice(),here=null,visit=0;
  for(const action of trail){
    if(action.kind==='travel'){here=action.to;visit++;continue}
    const from=st[action.i],unit=units.get(tracked[action.i]);
    steps.push({...describe(action,unit,from),unit,at:here??from,visit,assumed:Boolean(action.assumed)});
    st[action.i]=action.to;
  }
  if(!complete){
    const stuck=tracked.filter((key,i)=>!satisfied(i,st)).map(key=>unitName(units.get(key)));
    steps.push({type:'note',unit:null,at:here??ROSTER,visit,assumed:false,
      text:`Could not route ${stuck.slice(0,4).join(', ')}${stuck.length>4?` and ${stuck.length-4} more`:''} automatically — free a Lounge or credit slot and reopen Optimise.`});
  }
  return steps;
}
