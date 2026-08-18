const unitName=x=>`${x.name} ${variantText(x.variant)}`;
function stepHtml(step){const d=state.droids.find(x=>x.name===step.unit?.name);return `<span class="step-thumb">${d?picture(d,step.unit.variant):''}</span><span class="step-text">${step.text}</span>`}
function normaliseProjectedForSteps(baseP,projected){const keyOf=x=>`${x.source}:${x.unit}`,groupOf=x=>`${x.name}:${x.variant}`,cloneRows=rows=>rows.map(x=>({...x})),placed=cloneRows(projected.placed),sell=cloneRows(projected.sell),overflow=cloneRows(projected.overflow);for(const group of [...new Set([...placed,...sell].map(groupOf))]){const current=baseP.placed.filter(x=>groupOf(x)===group),targets=placed.filter(x=>groupOf(x)===group),sells=sell.filter(x=>groupOf(x)===group);if(current.length<2||!sells.length)continue;const used=new Set(),take=picker=>{const row=current.find(x=>!used.has(keyOf(x))&&picker(x));if(row)used.add(keyOf(row));return row};for(const target of targets){const exact=take(x=>x.station===target.station&&x.slot===target.slot),sameStation=exact||take(x=>x.station===target.station),any=sameStation||take(()=>true);if(any){target.source=any.source;target.unit=any.unit}}for(const sold of sells){const any=take(()=>true);if(any){sold.source=any.source;sold.unit=any.unit}}}return{...projected,placed,sell,overflow}}

// ─── Route-aware step planner ───────────────────────────────────────────────
// In game you walk to the DROID and issue a command; the droid then routes
// itself to a slot. A step's travel cost is therefore where the droid currently
// stands, not where it ends up — so commands are grouped by source station and
// the visit order is searched for the fewest trips around the base.
//
// The command vocabulary is everything the game actually offers:
//   Work      — auto-routes: own type first, else the nearest credit slot,
//               Upgrade Chip last. Greyed out when no credit/chip slot is free.
//   Lounge    — its own option; never an auto-route destination.
//   Companion — swaps when the companion slots are full.
//   Sell
// Build slots are swap-only and optimisedPlacements never routes a droid *into*
// Build (see the BUILD guard in its fallback loop), so Build is exit-only here.
const ROSTER='ROSTER',SOLD='SOLD';
const WORK_STATIONS=[...PRODUCTIVE_STATIONS,'UPGRADE_CHIP'];
const STAGING_STATIONS=['LOUNGE','COMPANION'];
// A droid already sitting in a credit slot cannot be re-issued Work to land in a
// *different* credit station: auto-route puts it straight back into its own
// type. Relocating one means staging it in the Lounge or as a companion first.
// Set this true only if the game turns out to allow a direct credit-to-credit
// swap, in which case the planner will emit the shorter one-command version.
const ALLOW_DIRECT_RESTATION=false;
const ROUTE_SEARCH_LIMIT=40000;
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
  // The game's auto-route, resolved to a single station. When more than one
  // credit station is open and none of them is the droid's own type, "nearest"
  // decides — which depends on your base layout, so the planner refuses to
  // predict it and waits for a state where the answer is unambiguous instead.
  const landing=(i,st,counts)=>{
    const native=natives[i],pos=st[i];
    if(PRODUCTIVE_STATIONS.includes(native)&&roomIn(native,counts,pos))return native;
    const open=PRODUCTIVE_STATIONS.filter(station=>roomIn(station,counts,pos));
    if(open.length===1)return open[0];
    if(open.length)return null;
    return roomIn('UPGRADE_CHIP',counts,pos)?'UPGRADE_CHIP':null;
  };
  const satisfied=(i,st)=>sells[i]?st[i]===SOLD:st[i]===goals[i];
  const allDone=st=>{for(let i=0;i<st.length;i++)if(!satisfied(i,st))return false;return true};
  // Commands you can issue right now, standing at `here`. Roster droids are not
  // in the base, so they are reachable from anywhere.
  const actionsFor=(i,st,here,counts)=>{
    if(satisfied(i,st))return[];
    const pos=st[i];
    if(pos!==here&&pos!==ROSTER)return[];
    if(sells[i])return[{i,kind:'sell',to:SOLD}];
    const goal=goals[i];
    if(goal==='LOUNGE')return roomIn('LOUNGE',counts,pos)?[{i,kind:'lounge',to:'LOUNGE'}]:[];
    if(goal==='COMPANION')return roomIn('COMPANION',counts,pos)?[{i,kind:'companion',to:'COMPANION'}]:[];
    if(!WORK_STATIONS.includes(goal))return[];
    if((ALLOW_DIRECT_RESTATION||!PRODUCTIVE_STATIONS.includes(pos))&&landing(i,st,counts)===goal)return[{i,kind:'work',to:goal}];
    if(!PRODUCTIVE_STATIONS.includes(pos))return[];
    return STAGING_STATIONS.filter(station=>station!==pos&&roomIn(station,counts,pos)).map(station=>({i,kind:'stage',to:station}));
  };
  const stationsWithWork=(st,here)=>{const set=new Set();for(let i=0;i<st.length;i++){if(satisfied(i,st))continue;const pos=st[i];if(pos===ROSTER||pos===SOLD||pos===here)continue;set.add(pos)}return set};

  // Trips are the only cost, so this is A* over (droid positions, where you are
  // standing): issuing a command is free, walking to another station costs one.
  // The heuristic — how many other stations still hold work — never overshoots,
  // so the first complete plan found uses the fewest possible trips.
  const search=()=>{
    const buckets=[],seen=new Map(),push=node=>{const f=node.g+stationsWithWork(node.st,node.here).size;(buckets[f]||(buckets[f]=[])).push(node)};
    push({st:startState,here:null,g:0,parent:null,action:null});
    seen.set(startState.join('|')+'@null',0);
    let f=0,expansions=0;
    while(f<buckets.length){
      const bucket=buckets[f];
      if(!bucket||!bucket.length){f++;continue}
      const node=bucket.pop();
      if(++expansions>ROUTE_SEARCH_LIMIT)return null;
      if(seen.get(node.st.join('|')+'@'+node.here)<node.g)continue;
      if(allDone(node.st))return node;
      const counts=countsFor(node.st);
      for(let i=0;i<node.st.length;i++)for(const action of actionsFor(i,node.st,node.here,counts)){
        const st=node.st.slice();st[action.i]=action.to;
        const childKey=st.join('|')+'@'+node.here;
        if(seen.has(childKey)&&seen.get(childKey)<=node.g)continue;
        seen.set(childKey,node.g);
        push({st,here:node.here,g:node.g,parent:node,action});
      }
      for(const station of stationsWithWork(node.st,node.here)){
        const childKey=node.st.join('|')+'@'+station;
        if(seen.has(childKey)&&seen.get(childKey)<=node.g+1)continue;
        seen.set(childKey,node.g+1);
        push({st:node.st,here:station,g:node.g+1,parent:node,action:{kind:'travel',to:station}});
      }
    }
    return null;
  };
  // Used when the search is cut short on a very large base: same rules, but it
  // just clears whichever station has the most to do. Valid, occasionally a trip
  // or two longer than optimal.
  const greedy=()=>{
    let st=startState.slice(),here=null;const trail=[];
    for(let guard=0;guard<600&&!allDone(st);guard++){
      let acted=true;
      while(acted){
        acted=false;
        const counts=countsFor(st);
        for(let i=0;i<st.length;i++){
          const [action]=actionsFor(i,st,here,counts);
          if(!action)continue;
          st=st.slice();st[action.i]=action.to;trail.push(action);acted=true;break;
        }
      }
      if(allDone(st))break;
      const options=[...stationsWithWork(st,here)];
      if(!options.length)break;
      const workAt=station=>{const counts=countsFor(st);let n=0;for(let i=0;i<st.length;i++)if(st[i]===station&&actionsFor(i,st,station,counts).length)n++;return n};
      here=options.sort((a,b)=>workAt(b)-workAt(a))[0];
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
    const from=st[action.i];
    steps.push({...describe(action,units.get(tracked[action.i]),from),unit:units.get(tracked[action.i]),at:here??from,visit});
    st[action.i]=action.to;
  }
  if(!complete)steps.push({type:'note',text:'Some droids could not be routed automatically — free up a Lounge or credit slot and reopen Optimise.',unit:null,at:here??ROSTER,visit});
  return steps;
}
// Consecutive steps issued at the same station are one stop on the walk round.
function optimiseVisits(steps){
  const visits=[];
  for(const step of steps){
    const last=visits[visits.length-1];
    if(last&&last.at===step.at&&last.visit===step.visit)last.steps.push(step);
    else visits.push({at:step.at,visit:step.visit,steps:[step]});
  }
  return visits;
}
function safeOptimiseStepPlan(baseP,projected){try{return optimiseRoutePlan(baseP,projected)}catch(e){console.warn('Optimise step plan unavailable',e);return[]}}
