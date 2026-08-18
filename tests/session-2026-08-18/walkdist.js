// Total walking distance of a route, using the same station centres the planner
// uses. Stops alone do not measure "less running around" - distance does.
const {MAP_FLOORS,MAP_SPOTS}=require('./map-data');
const C=(()=>{const out={},add=(s,l)=>{if(!l||!l.length)return;const a=out[s]||(out[s]=[0,0,0]);for(const[x,y]of l){a[0]+=x;a[1]+=y;a[2]++}};
  for(const f of MAP_FLOORS){const sp=MAP_SPOTS[f]||{};
    add('WORKER',sp.WORKER);add('ASTROMECH',sp.ASTROMECH);add('BATTLE',sp.BATTLE);add('BUILD',sp.BUILD);
    add('UPGRADE_CHIP',sp.UPGRADE_CHIP);add('LOUNGE',sp.LOUNGE);add('LOUNGE',sp.LOUNGE_REBIRTH);add('LOUNGE',sp.LOUNGE_NOVA)}
  return Object.fromEntries(Object.entries(out).map(([k,[x,y,n]])=>[k,[x/n,y/n]]))})();
module.exports=stops=>{let d=0;for(let i=1;i<stops.length;i++){const p=C[stops[i-1]],q=C[stops[i]];if(p&&q)d+=Math.hypot(p[0]-q[0],p[1]-q[1])}return d};
