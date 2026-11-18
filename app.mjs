
// MODULE: plant-equipment
/** OTS equipment and conservative training interlocks; not ABB CMPT executable logic.
 * Topology labels: REQUIREDED_SNAP. Command structure: SY SH010/011 / SH020+.
 * Travel times and conservative DS/ES rules are explicit training assumptions.
 */
const EQUIPMENT_COLORS={on:'#ff0000',off:'#00df00',bad:'#ff00ff',moving:'#ffff00',dead:'#666666',live:'#e71919'};
const GRID_DEVICES=[];
const gridAdd=(id,kind,a,b,closed=true,cb=null)=>GRID_DEVICES.push({id,kind,a,b,initial:closed,cb,seconds:kind==='CB'?1:5});
// Two external line sources and buses shown by the switchyard drawing.
gridAdd('DS273-7','DS','L1','X273');gridAdd('DS272-7','DS','L2','X272');
for(const [num,a,b] of [[271,'C22','C21'],[273,'X273','C21'],[274,'C23','C24'],[272,'X272','C24'],[275,'C23','C25']]){
 const ds={271:['271-2','271-1'],273:['273-3','273-1'],274:['274-3','274-4'],272:['272-2','272-4'],275:['275-3','275-5']}[num];
 gridAdd('DS'+ds[0],'DS',a,'A'+num,true,'CB'+num);gridAdd('CB'+num,'CB','A'+num,'B'+num,true);gridAdd('DS'+ds[1],'DS','B'+num,b,true,'CB'+num);
 for(const [tail,node]of [[{271:'25',273:'55',274:'35',272:'25',275:'35'}[num],'A'+num],[{271:'15',273:'15',274:'45',272:'45',275:'55'}[num],'B'+num]])gridAdd('ES'+num+'-'+tail,'ES',node,null,false,'CB'+num);
}
// Drawing shows shared line/bus connections. These remain labelled training topology.
// HMI crossings are bridges, not junctions: L1 feeds C25; L2 feeds C22.
gridAdd('LINK-L1-C23','WIRE','X273','C25');gridAdd('LINK-L2-C22','WIRE','X272','C22');
// Keep the legacy internal LINK id so saved sessions retain their equipment keys.
for(const [id,node]of [['ES273-76','L1'],['ES273-74','X273'],['ES272-76','L2'],['ES272-74','X272']])gridAdd(id,'ES',node,null,false);
gridAdd('DS275-7','DS','C25','SB4A',true,'CB275');gridAdd('ES275-74','ES','C25',null,false,'CB275');gridAdd('ES275-76','ES','SB4A',null,false,'CB275');
for(let i=0;i<2;i++){
 const n=i+1,cb=901+i;
 gridAdd('DS23'+n+'-3','DS',i?'C24':'C21','T'+n,true,'CB'+cb);
 gridAdd('DS'+cb+'-3','DS','T'+n,'B'+cb,true,'CB'+cb);
 gridAdd('ES23'+n+'-34','ES',i?'C24':'C21',null,false,'CB'+cb);gridAdd('ES23'+n+'-38','ES','T'+n,null,false,'CB'+cb);gridAdd('ES'+cb+'-38','ES','T'+n,null,false,'CB'+cb);
 gridAdd('DS'+cb+'-0','DS','G'+n,'N'+n,false,'CB'+cb);gridAdd('ES'+cb+'-05','ES','N'+n,null,false,'CB'+cb);
 gridAdd('DS94'+n+'-3','DS','T'+n,'AUX'+n,true,'CB'+cb);gridAdd('ES94'+n+'-38','ES','AUX'+n,null,false,'CB'+cb);
}
for(const [id,a,b,on]of [['ACB-1','ST1','MDB1',true],['ACB-2','ST2','MDB2',true],['ACB-3','ST3','MDB3',true],['ACB-4','DGOUT','MDB3',false],['ACB-5','MDB3','DB1',true],['ACB-6','MDB3','DB2',true],['ACB-7','DB1','MDB1',false],['ACB-8','DB2','MDB2',false],['ACB-BT','MDB1','MDB2',false]])gridAdd(id,'CB',a,b,on);

// 04.8: additional station-service indications, with individual feedback.
// New labels retain the original equipment keys; no inferred DI/DO addresses.
const REAL_EXTRA_SERVICE_DEVICES=[
 ['CB-22KV','ST3IN','ST3',true],['52DG','DG','DGOUT',false],
 ['ACB-9','MDB1','MCC1',true],['ACB-10','MDB2','MCC1',false],
 ['ACB-11','MDB1','MCC2',false],['ACB-12','MDB2','MCC2',true],
 ['ACB-13','MDB1','DB1A',true],['ACB-14','MDB2','DB1B',true],
 ['ACB-BT-1','DB1A','DB1B',false],
 ['ACB-15','MDB1','DB2F',true],['ACB-16','MDB2','DB2F',false],
 ['ACB-17','MDB1','DB3',true],['ACB-18','MDB2','DB3',false],
 ['ACB-19','MDB1','DB4',true],['ACB-20','MDB2','DB4',false],
 ['ACB-21','DB1A','UPSAC',false],['ACB-22','DB1B','UPSAC',false],
 ['ACB-23','UPS1','AC1',false],['ACB-24','UPS2','AC2',false],
 ['DCB-1','CH1','DC1',true],['DCB-2','BAT1','DC1',false],
 ['DCB-3','CH2','DC2',true],['DCB-4','BAT2','DC2',false],
 ['DCB-5','DC1','DC3',true],['DCB-6','DC2','DC3',false],
 ['DCB-7','DC1','DC5',false],['DCB-8','DC2','DC5',true],
 ['DCB-9','DC1','DC4',false],['DCB-10','DC2','DC4',true],
 ['DCB-11','CH3','DC6',false],['DCB-12','BAT3','DC6',false],
 ['DCB-13','CH4','DC7',false],['DCB-14','BAT4','DC7',false],
 ['DCB-15','DC6','DC8',false],['DCB-16','DC7','DC8',false]
];
for(const [id,a,b,on]of REAL_EXTRA_SERVICE_DEVICES)gridAdd(id,'CB',a,b,on);

const gridSpec=id=>GRID_DEVICES.find(d=>d.id===id);
function equipmentColor({bad=false,moving=false,on=false}={}){return bad?EQUIPMENT_COLORS.bad:moving?EQUIPMENT_COLORS.moving:on?EQUIPMENT_COLORS.on:EQUIPMENT_COLORS.off;}
function machineRunning(unit){return unit.s.rpm>0.1;}
// Output and feedback addresses are independent for each CMPT_CB instance.
// PLC SY-LCU, SY_SH010..013, PDF pages 34..37. CB275 is HMI-only here.
const YARD_CB_IO={
 CB271:{sheet:'SY_SH010',close:'SYV_5DO0193',open:'SYV_5DO0194',closed:'SYV_5DI0129',opened:'SYV_5DI0130'},
 CB273:{sheet:'SY_SH011',close:'SYV_5DO0195',open:'SYV_5DO0196',closed:'SYV_5DI0140',opened:'SYV_5DI0141'},
 CB274:{sheet:'SY_SH012',close:'SYV_5DO0197',open:'SYV_5DO0198',closed:'SYV_5DI0151',opened:'SYV_5DI0152'},
 CB272:{sheet:'SY_SH013',close:'SYV_5DO0199',open:'SYV_5DO0200',closed:'SYV_5DI0161',opened:'SYV_5DI0162'}
};
function equipmentActions(id){
 const a=/^(DG|NK-1MB[123]|H[12]:(lift|pumpA|pumpB))$/.test(id);
 const valve=id==='PENSTOCK'||/^H[12]:/.test(id)&&!a&&!id.endsWith(':field');
 return a?['DỪNG / STOP','CHẠY / START']:valve?['ĐÓNG / CLOSE','MỞ / OPEN']:['MỞ / OPEN','ĐÓNG / CLOSE'];
}
class PlantEquipment {
 constructor(plant){this.plant=plant;this.reset();}
 reset(){this.control43='OPS';this.stationSync={mode:'OFF',id:'CB273',df:.16,angle:38,du:4,quality:true,stable:0,armed:false,token:0};this.taps=[{value:3,target:3,elapsed:0,moving:false},{value:3,target:3,elapsed:0,moving:false}];this.selected=null;this.selectionAt=0;this.selectionToken=0;this.remote=true;this.owner='A VUONG';this.sources={L1:true,L2:true,SB4A:true};this.sb4a={pMW:40,qMvar:0};this.items={};this.auxOverrides={};this.auxWatches={};
  for(const d of GRID_DEVICES)this.items[d.id]={value:+d.initial,target:+d.initial,elapsed:0,moving:false,failed:false,bad:false,ready:true,timeout:false};
 }
 get(id){
  if(Object.hasOwn(this.items,id)){const d=this.items[id];return {...d,bad:d.bad||!this.plant.communicationOK};}
  const m=/^CB(901|902)$/.exec(id);if(!m)return null;
  const u=this.plant.units[+m[1]-901],d=u.devices.breaker;
  return {value:+u.s.breaker,target:d.target,elapsed:d.elapsed,moving:d.moving,failed:d.failed,bad:!u.qualityGood,ready:!u.s.lockout,timeout:d.moving&&d.elapsed>=15};
 }
 authority(){const p=this.plant,a=[];if(this.control43==='SYMDU')a.push('43 O/S đang SYMDU · OPS chỉ giám sát');if(p.role==='AVGuest')a.push('Vai trò chỉ giám sát');if(!p.communicationOK)a.push('Mất truyền thông DCS');if(!p.cnetOK)a.push('CNET không sẵn sàng');if(p.station==='UMDU'||p.station!==p.activeOps)a.push('Cần OPS đang giữ quyền');if(!this.remote)a.push('143R chưa REMOTE');if(this.owner!=='A VUONG')a.push('43RR trạm chưa giao A VUONG');return a;}
 select(id){if(!this.get(id)&&!this.auxDevice(id))return {ok:false,message:'Không có thiết bị '+id};const a=this.authority();if(a.length)return this.reject(id,a);if(this.selected&&this.selected!==id)return this.reject(id,['Thiết bị '+this.selected+' đang được chọn; CANCEL trước']);this.selected=id;this.selectionAt=this.plant.t;this.selectionToken++;this.plant.record('SELECT',id+' SELECT','SWITCHYARD');return {ok:true,message:'Đã SELECT '+id+'; chọn lệnh và xác nhận.'};}
 cancel(){const id=this.selected;this.selected=null;this.selectionToken++;if(id)this.plant.record('CANCEL',id+' CANCEL','SWITCHYARD');return {ok:true,message:'Đã hủy chọn thiết bị.'};}
 edges(skip=null,extra=null,potential=false){
  const e=GRID_DEVICES.filter(d=>d.kind!=='ES'&&d.a&&d.b&&d.id!==skip&&(d.kind==='WIRE'||(this.get(d.id)?.value===1&&!this.get(d.id)?.bad)||(potential&&(this.get(d.id)?.bad||this.get(d.id)?.moving)))).map(d=>[d.a,d.b]);
  for(let i=0;i<2;i++){const id='CB'+(901+i),d=this.get(id);if(id!==skip&&((d.value===1&&!d.bad)||(potential&&(d.bad||d.moving))))e.push(['B'+(901+i),'G'+(i+1)]);}
  if(extra)e.push(extra);return e;
 }
 connected(start,skip=null,extra=null,potential=false){
  const found=new Set([start]),adj=new Map();for(const [a,b]of this.edges(skip,extra,potential)){if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);}
  const q=[start];for(let i=0;i<q.length;i++)for(const n of adj.get(q[i])||[])if(!found.has(n)){found.add(n);q.push(n);}return found;
 }
 live(node,skip=null,potential=false){
  const reach=this.connected(node,skip,null,potential);
  return Object.entries({...this.sources,...this.serviceSources()}).some(([k,v])=>v&&reach.has(k))||this.plant.units.some((u,i)=>u.s.excited&&reach.has('G'+(i+1)));
 }
 pathState(i){const reach=this.connected('B'+(901+i)),possible=this.connected('B'+(901+i),null,null,true),sources=['L1','L2'].filter(k=>this.sources[k]);return sources.some(k=>reach.has(k))?'CONNECTED':sources.some(k=>possible.has(k))?'UNKNOWN':'ISOLATED';}
 branchDevices(i){return ['DS23'+(i+1)+'-3','DS'+(901+i)+'-3'];}
 branchMoving(i){const nodes=this.connected('B'+(901+i),null,null,true);return GRID_DEVICES.some(x=>!x.id.startsWith('ACB')&&this.get(x.id).moving&&(nodes.has(x.a)||nodes.has(x.b)));}
 serviceSources(){
  const p=this.plant,ac={ST1:p.service.available[0],ST2:p.service.available[1],ST3IN:p.service.available[2],DG:p.diesel};
  // A charger is a directed source. DC batteries must never energize an AC bus backwards.
  const fed=(node,sources)=>{const reach=this.connected(node);return Object.entries(sources).some(([key,on])=>on&&reach.has(key));};
  const dc={CH1:fed('DB1A',ac),CH2:fed('DB1B',ac),CH3:fed('DB4',ac),CH4:fed('MCC1',ac),BAT1:true,BAT2:true,BAT3:true,BAT4:true};
  const ups={UPS1:fed('DB1A',ac)||fed('DC5',dc),UPS2:fed('DB1B',ac)||fed('DC5',dc)};
  return {...ac,...dc,...ups};
 }
 gridPath(i){return this.pathState(i)==='CONNECTED';}
 earthsIn(nodes){return GRID_DEVICES.filter(d=>d.kind==='ES'&&(this.get(d.id).value||this.get(d.id).moving&&this.get(d.id).target===1)&&nodes.has(d.a));}
 syncReady(i){return this.gridPath(i)&&!this.branchMoving(i)&&!this.groupEarths('DS'+(901+i)+'-3').length&&this.branchDevices(i).every(id=>!this.get(id).bad&&this.get(id).value===1);}
 relatedBreakers(id){
  if(id==='DS273-7')return ['CB273','CB275'];
  if(id==='DS272-7')return ['CB271','CB272'];
  const cb=gridSpec(id)?.cb;return cb?[cb]:[];
 }
 groupEarths(id){const spec=gridSpec(id);if(!spec)return [];const nodes=this.connected(spec.a,null,null,true);if(spec.b)for(const n of this.connected(spec.b,null,null,true))nodes.add(n);if(spec.cb?.startsWith('CB9'))for(const n of this.connected('G'+(+spec.cb.slice(2)-900)))nodes.add(n);return this.earthsIn(nodes);}
 blockers(id,target){const a=this.authority(),d=this.get(id),spec=gridSpec(id);if(!d)return [...a,'Thiết bị không hợp lệ'];if(![0,1].includes(target))return [...a,'Lệnh không hợp lệ'];if(this.selected!==id)a.push('Cần SELECT thiết bị');if(d.bad)a.push('Phản hồi BQ / không xác định');if(target&&!d.ready)a.push('Thiết bị chưa READY');if(d.moving)a.push('Đang chờ phản hồi');if(d.value===target&&!d.moving)a.push('Đã ở vị trí yêu cầu');
  const unitMatch=/^CB(901|902)$/.exec(id);
  if(unitMatch){const u=this.plant.units[+unitMatch[1]-901];a.push(...u.controlBlockers());if(target){if(u.s.lockout)a.push('Khóa 86');if(u.s.stage!==5||u.s.syncMode!=='MANUAL')a.push('Cần PARALLEL IN / hòa MANUAL');if(!u.syncWindow())a.push('Chưa đạt cửa sổ ΔU/Δf/góc OTS');if(!this.gridPath(u.unit-1)||!this.plant.yard.gridPath)a.push('Nhánh đấu nối chưa có nguồn');if(this.groupEarths('DS'+unitMatch[1]+'-3').length)a.push('Có tiếp địa liên quan đang đóng');}else{if(u.s.stopping)a.push('Đang thực hiện dừng bình thường');if(u.s.workingMode!=='G'||u.s.scReturning)a.push('Chế độ SC/chuyển chế độ: dùng trình tự STOP; chưa mô hình cắt CB độc lập khi bù');}return [...new Set(a)];}
  if(!spec)return [...a,'Không có đặc tính thiết bị'];
  if(spec.kind==='WIRE')a.push('Liên kết sơ đồ, không nhận lệnh');
  if(target&&spec.kind!=='ES'){
   const nodes=this.connected(spec.a,null,null,true);for(const n of this.connected(spec.b,null,null,true))nodes.add(n);if(this.earthsIn(nodes).length)a.push('Tiếp địa liên quan chưa mở');if(GRID_DEVICES.some(x=>x.kind==='ES'&&nodes.has(x.a)&&this.get(x.id).bad))a.push('Tiếp địa liên quan mất phản hồi');
  }
  if(spec.kind==='DS'){
   for(const cb of this.relatedBreakers(id)){const b=this.get(cb);if(b?.bad)a.push(cb+' mất phản hồi');if(b?.moving)a.push(cb+' đang chuyển trạng thái');if(b?.value)a.push(cb+' phải mở trước khi thao tác DS');}
   if(spec.cb?.startsWith('CB9')){const u=this.plant.units[+spec.cb.slice(2)-901];if(u.s.rpm>.1||u.s.excited)a.push('Tổ máy phải dừng và cắt kích từ');}
   if(target&&this.live(spec.a,id)&&this.live(spec.b,id))a.push('Chặn ghép hai phần đang có điện bằng DS (quy tắc OTS)');
  }
  if(spec.kind==='ES'&&target){if(this.live(spec.a))a.push('Phần cần tiếp địa đang có điện');if(this.live(spec.a,null,true)&&!this.live(spec.a))a.push('Chưa xác minh mất điện: có đường cấp nguồn qua phản hồi BQ/đang chuyển');if(GRID_DEVICES.some(x=>x.kind!=='ES'&&this.connected(spec.a).has(x.a)&&this.get(x.id).bad))a.push('Chưa xác nhận cách ly: phản hồi thiết bị liên quan BQ');const reach=this.connected(spec.a);if(this.plant.units.some((u,i)=>reach.has('G'+(i+1))&&(u.s.rpm>.1||u.s.excited)))a.push('Tổ máy liên quan còn quay / còn kích từ');}
  if(spec.kind==='CB'&&target){
   if(['ACB-4','52DG'].includes(id)&&!this.plant.diesel)a.push('DG chưa có phản hồi chạy: không đóng cấp điện ngược vào máy phát dừng');
   if(id==='ACB-4'&&(!this.get('52DG').value||this.get('52DG').bad||this.get('52DG').moving))a.push('52DG phải đóng và có phản hồi tốt trước khi đóng ACB-33');
   const incoming={'ACB-1':0,'ACB-2':1,'ACB-3':2};
   if(Object.hasOwn(incoming,id)&&!this.plant.service.available[incoming[id]])a.push('Nguồn tự dùng đầu vào chưa sẵn sàng');
   const related=GRID_DEVICES.filter(x=>x.cb===id&&x.kind==='DS'&&x.id!=='DS275-7');if(related.some(x=>!this.get(x.id)?.value||this.get(x.id)?.bad))a.push('DS liên quan chưa đóng hoặc BQ');if(this.live(spec.a,id)&&this.live(spec.b,id)&&!this.connected(spec.a,id).has(spec.b)){if(/^CB27[1-5]$/.test(id)){if(!this.syncPermit(id))a.push('25 · Chưa đủ điều kiện hòa: chọn đúng CB, 43-25 AUTO/MANUAL, ΔU≤5%, |Δf|≤0,10 Hz, |góc|≤10° ổn định 1 s (OTS)');}else a.push('Chặn ghép hai nguồn AC/DC tự dùng đang có điện; bộ hòa 25 trạm chỉ dùng CB 220 kV.');}if(this.plant.units.some(u=>u.devices.breaker.moving))a.push('Đang thao tác máy cắt tổ máy');}
  return [...new Set(a)];
 }
 reject(id,a){const message=id+': '+a.join('; ');this.plant.record('REJECT',message,'SWITCHYARD');return {ok:false,message};}
 command(id,target){
  const aux=this.auxDevice(id);if(aux)return this.commandAux(id,target);
  const a=this.blockers(id,target);if(a.length)return this.reject(id,a);
  if(/^CB90[12]$/.test(id)){
   const u=this.plant.units[+id.slice(2)-901],r=target?u.manualSync():u.manualOpenBreaker();if(r.ok)this.cancel();return r;
  }
  // A transaction mutates only the item addressed by id. Topology never emits trips.
  const d=this.items[id],io=YARD_CB_IO[id];d.target=target;d.elapsed=0;d.moving=true;d.timeout=false;
  this.plant.record('OUTPUT',id+' '+(target?'CLOSE':'OPEN')+' COMMAND'+(io?' · '+(target?io.close:io.open)+' · '+io.sheet:' · OTS'),'SWITCHYARD');
  this.cancel();return {ok:true,message:'Đã phát lệnh riêng '+id+'; đang chờ phản hồi.'};
 }
 auxDevice(id){const p=this.plant;if(id==='DG')return {dg:true,kind:'motor'};if(id==='PENSTOCK')return {penstock:true,kind:'valve'};const m=/^H([12]):(inlet|bypass|seal|waterValve|lift|field|gate|air|vent|pumpA|pumpB)$/.exec(id);if(m){const u=p.units[+m[1]-1],key=m[2];return {u,key,device:u.devices[key],kind:['lift','field','pumpA','pumpB'].includes(key)?'motor':'valve'};}if(/^NK-1MB[123]$/.test(id))return {pump:+id.at(-1)-1,device:p.cooling.pumps[+id.at(-1)-1],kind:'motor'};return null;}
 auxState(id){const a=this.auxDevice(id);if(!a)return null;if(a.dg)return {on:this.plant.diesel,position:+this.plant.diesel,moving:this.plant.service.dgCommand!==this.plant.diesel,bad:!this.plant.communicationOK};if(a.penstock)return {on:this.plant.penstock.actual>=99,position:this.plant.penstock.actual,moving:Math.abs(this.plant.penstock.actual-this.plant.penstock.target)>.1,bad:!this.plant.penstock.signal||!this.plant.communicationOK};if(a.device)return {on:a.device.on,position:a.device.value,moving:a.device.moving,bad:a.u?!a.u.qualityGood:!this.plant.communicationOK,failed:a.device.failed};return {on:!!a.u.s[a.key],position:+a.u.s[a.key],moving:!!this.auxOverrides[id],bad:!a.u.qualityGood};}
 auxBlockers(id,target){const a=this.authority(),x=this.auxDevice(id);if(!x)return [...a,'Thiết bị không hợp lệ'];if(this.selected!==id)a.push('Cần SELECT thiết bị');if(![0,1].includes(target))a.push('Lệnh không hợp lệ');const state=this.auxState(id);if(state.bad)a.push('Mất phản hồi / BQ');if(state.moving)a.push('Thiết bị đang chuyển động');if(Object.keys(this.auxWatches).some(k=>k!==id))a.push('Có thiết bị phụ trợ khác đang chờ phản hồi');if(x.dg&&!target&&this.get('ACB-4').value)a.push('Cần mở ACB-4 trước khi dừng DG');if(x.penstock){const p=this.plant.penstock;if(!p.signal||!p.remote||!p.oilOK||!p.observer||!p.locked)a.push('Cần PAUZ9 REMOTE, dầu tốt, người giám sát, án động hai van tuabin và tín hiệu tốt (Điều 28)');if(this.plant.units.some(u=>u.s.rpm>1||u.s.inlet>1||u.s.breaker))a.push('Phải dừng cả H1/H2, CB mở và đóng hai van tuabin');}if(x.u){const u=x.u,s=u.s;a.push(...u.controlBlockers());if(s.stopping||s.scReturning||!s.stageDone&&s.stage>0)a.push('Trình tự tự động đang điều khiển thiết bị');
   if(['inlet','bypass','seal','gate','field','air','vent'].includes(x.key)&&(s.rpm>.1||s.breaker||s.excited))a.push('Cần tổ máy dừng, CB mở và cắt kích từ; khi chạy dùng trình tự');
   if(['inlet','gate','bypass'].includes(x.key)&&target&&s.oil<3.5)a.push('Áp lực dầu chưa sẵn sàng (mốc OTS)');
   if(x.key==='inlet'&&target&&(u.devices.bypass.value<99||s.deltaP>10))a.push('Cần mở bypass và cân bằng áp trước (mốc OTS)');
   if(x.key==='waterValve'&&!target&&(s.rpm>.1||s.excited))a.push('Tổ máy còn nhu cầu làm mát');
   if(x.key==='lift'&&!target&&s.rpm>0.1&&s.rpm<100)a.push('Không dừng nâng trục khi máy quay thấp tốc (mốc OTS)');
   if(['pumpA','pumpB'].includes(x.key)&&!target&&(s.rpm>.1||s.breaker)&&!s[x.key==='pumpA'?'pumpB':'pumpA'])a.push('Không dừng bơm dầu cuối cùng khi tổ máy đang chạy');
  }
  if(x.pump!==undefined){if(this.plant.units.some(u=>u.s.stopping||!u.s.stageDone&&u.s.stage>0))a.push('Trình tự tự động đang giữ quyền bơm NKT');if(target&&(!this.plant.cooling.source||this.plant.cooling.fault))a.push('Nguồn NKT chưa sẵn sàng');if(!target&&this.plant.units.some(u=>u.s.rpm>.1)&&this.plant.cooling.pumps.filter((d,i)=>i!==x.pump&&d.on).length===0)a.push('Không dừng bơm nguồn cuối cùng khi còn tổ máy chạy');}
  return [...new Set(a)];
 }
 commandAux(id,target){const a=this.auxBlockers(id,target);if(a.length)return this.reject(id,a);const x=this.auxDevice(id);if(x.dg){this.plant.service.dgCommand=!!target;this.auxWatches[id]={elapsed:0,limit:20};this.plant.record('OUTPUT','DG '+(target?'START':'STOP'),'AUXILIARY');this.cancel();return {ok:true,message:'Đã phát lệnh DG; chờ phản hồi 8 s (OTS).'};}if(x.penstock){const r=this.plant.setPenstock(target*100);if(r.ok)this.cancel();return r;}this.auxWatches[id]={elapsed:0,limit:Math.max(15,(x.device?.openTime||2)+10)};if(x.pump!==undefined){this.auxOverrides[id]=target;x.device.command(target);}else if(x.device)x.device.command(x.kind==='motor'?target:target*100);else{this.auxOverrides[id]={target,elapsed:0};}this.plant.record('OUTPUT',id+' '+(target?'START / OPEN':'STOP / CLOSE'),'AUXILIARY');this.cancel();return {ok:true,message:'Đã nhận lệnh '+id+' — chờ phản hồi.'};}
 syncRequired(id){const spec=gridSpec(id);return !!spec&&/^CB27[1-5]$/.test(id)&&this.live(spec.a,id)&&this.live(spec.b,id)&&!this.connected(spec.a,id).has(spec.b);}
 syncPermit(id){const x=this.stationSync;return x.id===id&&['AUTO','MANUAL'].includes(x.mode)&&x.quality&&Number.isFinite(x.df)&&Number.isFinite(x.angle)&&Number.isFinite(x.du)&&Math.abs(x.df)<=.1&&Math.abs(x.angle)<=10&&Math.abs(x.du)<=5&&x.stable>=1;}
 setSb4a(online,pMW,qMvar){const a=this.authority();if(this.plant.session?.method==='exam')a.push('Không đổi nguồn trong bài kiểm tra');if(typeof online!=='boolean'||!Number.isFinite(pMW)||pMW<0||pMW>200||!Number.isFinite(qMvar)||Math.abs(qMvar)>100)a.push('Thông số nguồn mô phỏng không hợp lệ');if(a.length)return this.reject('SB4A',a);this.sources.SB4A=online;this.sb4a={pMW,qMvar};this.stationSync.armed=false;this.cancel();this.plant.record('INSTRUCTOR','SB4A '+(online?'ON':'OFF')+' · P đặt '+pMW+' MW · Q đặt '+qMvar+' MVAr (nguồn hữu hạn OTS)','SWITCHYARD');return {ok:true,message:'Đã cập nhật nguồn Sông Bung 4A trong mô phỏng.'};}
 setStationControl(value){if(!['OPS','SYMDU'].includes(value))return {ok:false,message:'Khóa 43 O/S không hợp lệ'};if(this.plant.role==='AVGuest'||!this.plant.communicationOK||this.plant.station!==this.plant.activeOps)return this.reject('43 O/S',['Cần OPS giữ quyền và truyền thông tốt']);this.control43=value;this.stationSync.armed=false;this.cancel();this.plant.record('SELECTOR','43 O/S → '+value,'SWITCHYARD');return {ok:true,message:'43 O/S → '+value};}
 setStationSync(mode,id){const a=this.authority();if(a.length)return this.reject('43-25',a);if(!['OFF','AUTO','MANUAL'].includes(mode)||!/^CB27[1-5]$/.test(id))return this.reject('43-25',['Khóa hoặc CB không hợp lệ']);Object.assign(this.stationSync,{mode,id,stable:0,armed:false});this.cancel();this.plant.record('SELECTOR','43-25 '+mode+' · '+id,'SWITCHYARD');return {ok:true,message:'Đã chọn bộ hòa '+mode+' cho '+id};}
 armStationSync(){const x=this.stationSync;const a=this.blockers(x.id,1).filter(v=>!v.startsWith('25 ·'));if(x.mode!=='AUTO')a.push('43-25 phải AUTO');if(!x.quality)a.push('Tín hiệu hòa BQ');if(a.length)return this.reject(x.id,a);x.armed=true;x.token=this.selectionToken;this.plant.record('COMMAND','AUTO SYNCHRONIZE → '+x.id,'SWITCHYARD');return {ok:true,message:'Đã nhận lệnh hòa AUTO '+x.id+'; chờ kiểm tra 25 và phản hồi riêng.'};}
 tapBlockers(i){const a=this.authority(),u=this.plant.units[i],t=this.taps[i];if(!u||!t)return ['MBA không hợp lệ'];if(t.moving)a.push('Đang đổi nấc');if(u.s.rpm>.1||u.s.excited||u.s.breaker)a.push('Tổ máy phải dừng, cắt kích từ và CB đầu cực mở');if(this.live('T'+(i+1),null,true))a.push('MBA còn điện: cần cách ly DS23'+(i+1)+'-3, DS94'+(i+1)+'-3 và xác nhận mất điện');return a;}
 changeTap(i,delta){if(![0,1].includes(i)||![-1,1].includes(delta))return this.reject('TAP',['Lệnh không hợp lệ']);const a=this.tapBlockers(i),t=this.taps[i];if(t.value+delta<1||t.value+delta>5)a.push('Giới hạn mô hình 1…5');if(a.length)return this.reject('T'+(i+1),a);t.target=t.value+delta;t.elapsed=0;t.moving=true;this.plant.record('COMMAND','T'+(i+1)+' TAP → '+t.target+' · mô phỏng không điện','SWITCHYARD');return {ok:true,message:'Đang đổi nấc T'+(i+1)+' trong mô hình, chờ 5 s.'};}
 tick(dt){
  const x=this.stationSync;
  if(x.armed&&(this.selected!==x.id||this.selectionToken!==x.token||this.authority().length||!x.quality)){x.armed=false;this.plant.record('CANCEL','Hủy hòa trạm: mất SELECT/quyền/tín hiệu','SWITCHYARD');}
  if(x.mode==='AUTO'&&x.armed&&x.quality){x.df=approach(x.df,0,.025,dt);x.angle=approach(x.angle,0,6,dt);x.du=approach(x.du,0,1,dt);}
  const good=x.quality&&Math.abs(x.df)<=.1&&Math.abs(x.angle)<=10&&Math.abs(x.du)<=5;
  x.stable=good?Math.min(2,x.stable+dt):0;
  if(x.armed&&this.syncPermit(x.id)){x.armed=false;this.command(x.id,1);}
  for(let i=0;i<2;i++){const t=this.taps[i];if(t.moving){if(this.authority().length||this.live('T'+(i+1),null,true)){t.moving=false;t.target=t.value;this.plant.record('CANCEL','TAP T'+(i+1)+' mất điều kiện','SWITCHYARD');}else{t.elapsed+=dt;if(t.elapsed>=5){t.value=t.target;t.moving=false;this.plant.record('FEEDBACK','T'+(i+1)+' TAP POSITION '+t.value,'SWITCHYARD');}}}}
  if(this.selected&&this.plant.t-this.selectionAt>=30){this.plant.record('CANCEL',this.selected+' SELECT TIMEOUT 30 s (OTS)','SWITCHYARD');this.cancel();}
  for(const spec of GRID_DEVICES){const d=this.items[spec.id];if(!d.moving)continue;d.elapsed+=dt;
   if(d.target===1&&(this.authority().length||spec.kind!=='ES'&&this.groupEarths(spec.id).length||spec.kind==='ES'&&this.live(spec.a,null,true)||this.syncRequired(spec.id)&&!this.syncPermit(spec.id)||spec.kind==='CB'&&!/^CB27[1-5]$/.test(spec.id)&&this.live(spec.a,spec.id)&&this.live(spec.b,spec.id)&&!this.connected(spec.a,spec.id).has(spec.b))){d.moving=false;d.target=d.value;this.plant.record('CANCEL',spec.id+' CLOSE mất liên động trước phản hồi','SWITCHYARD');continue;}if(!d.failed&&!d.bad&&d.elapsed+1e-8>=spec.seconds){d.value=d.target;d.moving=false;this.plant.record('FEEDBACK',spec.id+' '+(d.value?'CLOSE':'OPEN')+' POSITION','SWITCHYARD');}
   const timed=d.moving&&d.elapsed>=15;d.timeout=timed;this.plant.alarm('EQ_'+spec.id+'_TIMEOUT',timed,spec.id+' không nhận phản hồi trong 15 s (OTS).');
  }
  for(const [id,w]of Object.entries(this.auxWatches)){w.elapsed+=dt;const state=this.auxState(id);const timed=!!state?.moving&&w.elapsed>=w.limit;this.plant.alarm('AUX_'+id+'_TIMEOUT',timed,id+' chờ phản hồi quá '+w.limit+' s (OTS).');if(!state?.moving)delete this.auxWatches[id];}
  for(const u of this.plant.units)if(u.s.stage===0&&u.devices.bypass.on&&!u.s.faults.deltaP)u.s.deltaP=Math.max(0,u.s.deltaP-100/this.plant.profile.dynamics.equalize*dt);
  for(const [id,v]of Object.entries(this.auxOverrides)){if(typeof v!=='object')continue;v.elapsed+=dt;if(v.elapsed>=2){const x=this.auxDevice(id);if(x?.u)x.u.s[x.key]=!!v.target;delete this.auxOverrides[id];this.plant.record('FEEDBACK',id+' '+(v.target?'RUN':'STOP'),'AUXILIARY');}}
  // Training loss-of-grid action: operate only on the isolated unit, never on a
  // count of open breakers. This is a model event, not a claimed real relay mapping.
  for(let i=0;i<2;i++){
   const u=this.plant.units[i],state=this.pathState(i),st=u.s;
   this.plant.alarm('EQ_GRID_PATH_H'+(i+1),st.breaker&&state!=='CONNECTED','H'+(i+1)+': '+(state==='UNKNOWN'?'chưa xác minh đường nối lưới (BQ/đang chuyển); chặn hòa, không suy diễn sa thải':'mất toàn bộ đường nối lưới; xử lý sa thải phụ tải theo mô hình OTS'));
   if(state==='ISOLATED'&&st.breaker&&!st.lockout&&!st.rejection.active&&(st.stage>=5||Math.abs(st.p)>.1))u.beginLoadRejection('MẤT LƯỚI QUA TRẠM · H'+(i+1),true);
  }
  for(const id of ['CB901','CB902']){const d=this.get(id);this.plant.alarm('EQ_'+id+'_TIMEOUT',d.timeout,id+' chưa nhận phản hồi trong 15 s (OTS).');}
 }
 snapshot(){return {sb4a:{...this.sb4a},control43:this.control43,stationSync:{...this.stationSync,armed:false},taps:structuredClone(this.taps),schema:3,topology:'AVC-SY-HMI-C25-SS-v3',selectionToken:this.selectionToken,selected:this.selected,selectionAt:this.selectionAt,remote:this.remote,owner:this.owner,sources:{...this.sources},items:structuredClone(this.items),auxWatches:structuredClone(this.auxWatches),auxOverrides:structuredClone(this.auxOverrides)};}
 static validate(x){if(x?.sb4a&&(!Number.isFinite(x.sb4a.pMW)||x.sb4a.pMW<0||x.sb4a.pMW>200||!Number.isFinite(x.sb4a.qMvar)||Math.abs(x.sb4a.qMvar)>100))throw Error('Thông số nguồn Sông Bung 4A không hợp lệ');if(!x||![1,2,3].includes(x.schema)||!['A VUONG','DA NANG','A0/A3'].includes(x.owner)||typeof x.remote!=='boolean'||!Number.isFinite(x.selectionAt)||x.selectionAt<0||typeof x.sources!=='object')throw Error('Cấu hình thiết bị trạm không hợp lệ');for(const key of ['L1','L2','SB4A'])if(typeof x.sources[key]!=='boolean')throw Error('Nguồn trạm không hợp lệ');if(!x.items||Object.keys(x.items).length!==GRID_DEVICES.length)throw Error('Thiếu thiết bị trạm');for(const spec of GRID_DEVICES){const d=x.items[spec.id];if(!d||![0,1].includes(d.value)||![0,1].includes(d.target)||!Number.isFinite(d.elapsed)||d.elapsed<0||d.elapsed>1e9||['moving','failed','bad','ready','timeout'].some(k=>typeof d[k]!=='boolean'))throw Error('Phản hồi thiết bị không hợp lệ: '+spec.id);}if(x.selected!==null&&(typeof x.selected!=='string'||!(/^CB90[12]$|^DG$|^PENSTOCK$|^NK-1MB[123]$|^H[12]:(inlet|bypass|seal|waterValve|lift|field|gate|air|vent|pumpA|pumpB)$/.test(x.selected)||GRID_DEVICES.some(d=>d.id===x.selected))))throw Error('SELECT không hợp lệ');if(!x.auxWatches||typeof x.auxWatches!=='object'||Array.isArray(x.auxWatches)||Object.keys(x.auxWatches).length>30)throw Error('Giám sát phụ trợ không hợp lệ');for(const [id,w]of Object.entries(x.auxWatches)){if(!/^DG$|^NK-1MB[123]$|^H[12]:(inlet|bypass|seal|waterValve|lift|field|gate|air|vent|pumpA|pumpB)$/.test(id)||!w||!Number.isFinite(w.elapsed)||w.elapsed<0||w.elapsed>1e9||!Number.isFinite(w.limit)||w.limit<1||w.limit>1000)throw Error('Timer phụ trợ không hợp lệ');}if(!x.auxOverrides||typeof x.auxOverrides!=='object'||Array.isArray(x.auxOverrides)||Object.keys(x.auxOverrides).length>30)throw Error('Lệnh phụ trợ không hợp lệ');for(const [id,v]of Object.entries(x.auxOverrides)){if(/^NK-1MB[123]$/.test(id)){if(![0,1].includes(v))throw Error('Lệnh bơm không hợp lệ');}else if(/^H[12]:pump[AB]$/.test(id)){if(!v||![0,1].includes(v.target)||!Number.isFinite(v.elapsed)||v.elapsed<0||v.elapsed>1e9)throw Error('Lệnh dầu không hợp lệ');}else throw Error('Lệnh phụ trợ lạ');}}
 restore(x){PlantEquipment.validate(x);if(x.sb4a)this.sb4a={pMW:x.sb4a.pMW,qMvar:x.sb4a.qMvar};this.control43=x.control43==='SYMDU'?'SYMDU':'OPS';if(x.stationSync&&['OFF','AUTO','MANUAL'].includes(x.stationSync.mode)&&/^CB27[1-5]$/.test(x.stationSync.id)&&['df','angle','du'].every(k=>Number.isFinite(x.stationSync[k])&&Math.abs(x.stationSync[k])<1000))Object.assign(this.stationSync,x.stationSync,{armed:false,stable:0,token:0});if(Array.isArray(x.taps)&&x.taps.length===2&&x.taps.every(t=>Number.isInteger(t.value)&&t.value>=1&&t.value<=5))this.taps=x.taps.map(t=>({value:t.value,target:t.value,elapsed:0,moving:false}));this.selected=null;this.selectionAt=x.selectionAt;this.selectionToken=0;this.remote=x.remote;this.owner=x.owner;this.sources=structuredClone(x.sources);this.items=structuredClone(x.items);this.auxOverrides=structuredClone(x.auxOverrides);this.auxWatches=structuredClone(x.auxWatches);}
}


// OTS 04.25. Screen geometry and labels transcribed from photos 33 and 36,
// 29 October 2026. Measurements project the simulation, never bitmap pixels.
const REAL_SERVICE_LABELS={
 'ACB-1':'ACB-10','ACB-2':'ACB-20','ACB-3':'ACB-30','ACB-4':'ACB-33',
 'ACB-5':'ACB-31','ACB-6':'ACB-32','ACB-7':'ACB-13','ACB-8':'ACB-23','ACB-BT':'ACB-12',
 'ACB-9':'MCC1 · ACB-01','ACB-10':'MCC1 · ACB-02',
 'ACB-11':'MCC2 · ACB-01','ACB-12':'MCC2 · ACB-02',
 'ACB-13':'DB-1 · ACB-01','ACB-14':'DB-1 · ACB-02','ACB-BT-1':'DB-1 · ACB-03',
 'ACB-15':'DB-2 · ACB-01','ACB-16':'DB-2 · ACB-02',
 'ACB-17':'DB-3 · ACB-01','ACB-18':'DB-3 · ACB-02',
 'ACB-19':'DB-4 · ACB-01','ACB-20':'DB-4 · ACB-02',
 'CB-22KV':'473 · 22 kV CB','52DG':'52DG'
};
const REAL_GENERAL_TEMPS=[
 ...[1,3,5,7,9,11].map(n=>['GEN. UPPER GUIDE BEARING METAL TEMPERATURE '+n,'tempUpper'+n]),
 ['GEN. UPPER GUIDE BEARING OIL TEMPERATURE','tempUpperOil'],
 ...[1,3,5,7,9,11,13,15].map(n=>['GEN. LOWER GUIDE BEARING METAL TEMPERATURE '+n,'tempLower'+n]),
 ['THRUST PAD TEMPERATURE-1','tempThrust1'],['THRUST PAD TEMPERATURE-2','tempThrust2'],
 ...['U1','V1','W1','U2','V2','W2'].map((n,i)=>['GEN. STATOR WINDING TEMPERATURE ('+n+')','tempStator'+(i+1)]),
 ...[1,3,5].map(n=>['GEN. MAGNETIC CIRCUIT TEMPERATURE ('+n+')','tempMagnetic'+n]),
 ['GEN. AIR COOLER AIR INLET TEMPERATURE','tempAirIn'],
 ['GEN. AIR COOLER AIR OUTLET TEMPERATURE','tempAirOut']
];
const REAL_PHOTO_VALUES={
 tailwater:{value:59.88,dec:2,unit:'m',label:'TAIL RACE LEVEL'},
 reservoir:{value:375.67,dec:2,unit:'m',label:'SPILLWAY WATER LEVEL'},
 flow:{value:63.84,dec:2,unit:'m³/s',label:'Lưu lượng trên GENERAL DISPLAY'},
 tap1:{value:3,dec:0,unit:'',label:'T1 · POS. TAPE CHANGE'},
 tap2:{value:3,dec:0,unit:'',label:'T2 · POS. TAPE CHANGE'},
 dgEnergy:{value:12756,dec:2,unit:'kWh',label:'DG · ENERGY'}
};
const realText=(x,y,t,size=12,anchor='start',color='#ddd')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" style="fill:${color}">${dxEsc(t)}</text>`;
const realWire=(d,node='',color='#dfaa44',width=2)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${node?`data-real-node="${node}"`:''}/>`;
function realAction(attrs,body,label=''){
 return `<g class="dx-device real-action" role="button" tabindex="0" ${attrs} ${label?`aria-label="${dxEsc(label)}"`:''}>${body}</g>`;
}
function circuitText(id,x,y,text,size=11,anchor='start',kind='name'){
 return realText(x,y,text,size,anchor).replace('<text ',`<text class="circuit-label" data-circuit-label="${kind}" data-label-equipment="${dxEsc(id)}" `);
}
function realDevice(id,x,y,kind='CB',label=id,sub='',labelSide='right',size=9){
 const tx=labelSide==='left'?x-15:id==='ACB-21'?x+33:x+16,anchor=labelSide==='left'?'end':'start';
 const shape=kind==='DS'||kind==='ES'?`<circle cx="${x}" cy="${y}" r="${size}" data-eq-fill="${id}"/>`:
  kind==='motor'?`<circle cx="${x}" cy="${y}" r="${size+6}" data-eq-fill="${id}"/>${realText(x,y+4,'M',11,'middle','#000')}`:
  `<rect x="${x-size}" y="${y-size}" width="${2*size}" height="${2*size}" data-eq-fill="${id}"/>`;
 return realAction(`data-action="equipment-open" data-equipment="${id}"`,
  `<title>${dxEsc(REAL_SERVICE_LABELS[id]||label)}${sub?' · '+dxEsc(sub):''}</title><rect x="${x-13}" y="${y-13}" width="26" height="26" fill="transparent"/>${shape}`+
  (id==='ACB-BT'?circuitText(id,x,y-17,label+' '+sub,10,'middle'):(label?circuitText(id,id==='ACB-BT-1'?x:tx,id==='ACB-BT-1'?y-17:y+(sub?-1:4),label,11,id==='ACB-BT-1'?'middle':anchor):'')+(sub?circuitText(id,id==='ACB-BT-1'?x:tx,id==='ACB-BT-1'?y+27:y+12,sub,8,id==='ACB-BT-1'?'middle':anchor,'alias'):'')),REAL_SERVICE_LABELS[id]||id);
}
/** Shared branch renderer: the tap, earth switch and earth terminal are one explicit route.
 * The parent electrical node comes only from GRID_DEVICES, never from an x offset.
 */
function earthBranchSvg({id,tap,pos,direction='right',compact=false,labelPlacement='right'}){
 const spec=gridSpec(id);if(spec?.kind!=='ES'||!Array.isArray(tap)||tap.length!==2||!tap.every(Number.isFinite)||!Array.isArray(pos)||pos.length!==2||!pos.every(Number.isFinite)||!['right','down'].includes(direction))throw Error('Nhánh tiếp địa không hợp lệ: '+id);
 const [tx,ty]=tap,[x,y]=pos,r=compact?7:11,down=direction==='down',node=spec.a;
 if(down?Math.abs(tx-x)>.01||y<ty:Math.abs(ty-y)>.01||x<tx)throw Error('Nhánh tiếp địa phải thẳng hàng: '+id);
 const gx=down?x:x+35,gy=down?y+32:y;
 const lead=`M${tx} ${ty}L${x} ${y}`,tail=down?`M${x} ${y+r}V${gy}`:`M${x+r} ${y}H${gx}`;
 const glyph=down?`M${gx-12} ${gy}H${gx+12}M${gx-8} ${gy+6}H${gx+8}M${gx-4} ${gy+12}H${gx+4}`:`M${gx} ${gy-12}V${gy+12}M${gx+6} ${gy-8}V${gy+8}M${gx+12} ${gy-4}V${gy+4}`;
 const upperEarth=/^ES23[12]-34$/.test(id),lowerEarth=/^ES23[12]-38$/.test(id),sbEarth=id==='ES275-76';
 const label=compact?circuitText(id,upperEarth||sbEarth?x-12:x+8,lowerEarth?y+20:sbEarth?y-10:y-12,id,9,upperEarth||sbEarth?'end':'middle'):labelPlacement==='above'?circuitText(id,x+32,y-18,id,11,'middle'):circuitText(id,x+(down?22:53),y+4,id,11);
 const hit={x:compact?x-36:labelPlacement==='above'?x-28:x-r-4,y:compact?y-25:y-28,w:compact?72:labelPlacement==='above'?100:(down?22:53)+id.length*7+r+10,h:compact?50:48};
 const state=compact?'':`<text x="${labelPlacement==='above'?x+24:x+(down?22:53)}" y="${labelPlacement==='above'?y+24:y-13}" text-anchor="${labelPlacement==='above'?'middle':'start'}" class="dx-position circuit-label" data-circuit-label="state" data-label-equipment="${id}" data-eq-label="${id}"/>`;
 return `<g class="earth-branch" data-earth-id="${id}" data-earth-node="${node}" data-earth-tap="${tx},${ty}" data-earth-switch="${x},${y}" data-earth-terminal="${gx},${gy}" data-earth-direction="${direction}">
 <path d="${lead}" fill="none" stroke="#ddd" stroke-width="2" data-grid-node="${node}" data-earth-lead="${id}"/><circle cx="${tx}" cy="${ty}" r="2.4" data-earth-junction="${id}" fill="#ddd"/>
 ${realAction(`data-action="equipment-open" data-equipment="${id}"`,`<title>${id} · ${earthLocation(id)}</title><rect x="${hit.x}" y="${hit.y}" width="${hit.w}" height="${hit.h}" fill="transparent"/><circle cx="${x}" cy="${y}" r="${r}" stroke="#ddd" data-eq-fill="${id}"/>${label}${state}`,id)}
 <path d="${tail}" fill="none" stroke="#ddd" stroke-width="1.5" data-earth-tail="${id}"/><path d="${glyph}" fill="none" stroke="#ddd" stroke-width="1.5" data-earth-symbol="${id}"/></g>`;
}
function earthLocation(id){
 const s=gridSpec(id);if(s?.kind!=='ES')return '';
 const m=/^ES(231|232)-(34|38)$/.exec(id);if(m)return (m[2]==='34'?'Phía thanh cái C'+(m[1]==='231'?21:24)+' · trước':'Phía MBA T'+(m[1]==='231'?1:2)+' · sau')+' DCL DS'+m[1]+'-3';
 const lv=/^ES(901|902)-(38|05)$/.exec(id);if(lv)return lv[2]==='38'?'Phía MBA T'+(lv[1]==='901'?1:2)+' · trước DCL DS'+lv[1]+'-3':'Nhánh sau DCL DS'+lv[1]+'-0 · phía thiết bị tiếp địa';
 const aux=/^ES(941|942)-38$/.exec(id);if(aux)return 'Nhánh tự dùng · sau DCL DS'+aux[1]+'-3';
 const line=/^ES(273|272|275)-(76|74)$/.exec(id);if(line)return (line[2]==='76'?'Phía đường dây · ngoài':'Phía trạm · trong')+' DCL DS'+line[1]+'-7';
 const bay=/^ES(27[1-5])-(25|55|35|15|45)$/.exec(id);if(bay)return (s.a.startsWith('A')?'Giữa DCL phía trên và MC':'Giữa MC và DCL phía dưới')+' CB'+bay[1];
 return 'Điểm tiếp địa '+s.a;
}
function realEarth(id,x,y,tapX){return earthBranchSvg({id,tap:[tapX,y],pos:[x,y],compact:true});}

function realMeter(x,y,w,rows,h=19){
 return `<g class="real-meter">${rows.map((row,i)=>{
  const [label,key,unit='',dec=1]=row,top=y+i*h,click=key.startsWith('u:')?'data-action="real-tag"':key.startsWith('ref:')?'data-action="real-reference-value"':'data-action="real-meter-info"';
  return realAction(`${click} data-real-key="${key}"`,
   `<rect x="${x}" y="${top}" width="${w}" height="${h-1}" fill="#7c7c7c" stroke="#bfbfbf" stroke-width=".7"/>`+
   `<rect x="${x+30}" y="${top+1}" width="${w-63}" height="${h-3}" fill="#d4d4ca"/>`+
   realText(x+4,top+h-5,label,10)+`<text x="${x+w-35}" y="${top+h-4}" text-anchor="end" font-size="${h<18?12:14}" style="fill:#111" data-real-value="${key}" data-real-dec="${dec}">—</text>`+
   realText(x+w-31,top+h-4,unit,10)+(key.startsWith('ref:')?realText(x+w-4,top+6,'R',6,'end','#555'):''),label+' '+unit);
 }).join('')}</g>`;
}
function realPlaque(x,y,w,label,key=''){
 return realAction(key?`data-action="real-meter-info" data-real-key="${key}"`:'data-action="real-screen-notes"',
 `<rect x="${x}" y="${y}" width="${w}" height="22" fill="url(#real-key)" stroke="#ddd"/>${realText(x+w/2,y+15,label,12,'middle','#303b3e')}`);
}
function realDashedBox(x,y,w,h,lines){
 return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#030303" stroke="#ccc" stroke-width="1.5" stroke-dasharray="6 4"/>${lines.map((t,i)=>realText(x+w/2,y+17+i*16,t,13,'middle')).join('')}`;
}
function realDefs(){return `<defs>
 <linearGradient id="real-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#676767"/><stop offset=".25" stop-color="#eee"/><stop offset=".52" stop-color="#aaa"/><stop offset=".75" stop-color="#f2f2f2"/><stop offset="1" stop-color="#646464"/></linearGradient>
 <linearGradient id="real-key" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4f4ee"/><stop offset=".6" stop-color="#c0c3bc"/><stop offset="1" stop-color="#8e9793"/></linearGradient>
 </defs>`;}
function realTransformer(x,y,label,color1='#ff2525',color2='#00c4d6'){
 return `<circle cx="${x}" cy="${y}" r="12" fill="#000" stroke="${color1}" stroke-width="2"/><circle cx="${x}" cy="${y+18}" r="12" fill="#000" stroke="${color2}" stroke-width="2"/>${label.split('\n').map((t,i)=>realText(x+18,y+7+i*12,t,i?8:10)).join('')}`;
}
function realNavigation(c,page){
 const rows=[['SY CONTROL PANEL','stationcontrol'],['STATION OVERVIEW','stationoverview'],['220kV SWITCHYARD','switchyard'],['MAIN UNIT','mainunit'],['STATION SERVICE','stationservice'],['GH EQUIPMENT','gh'],['AIR SUPPLY SYSTEM','air'],['GENERAL DISPLAY','general'],['U#1 CONTROL PANEL','control',0],['U#2 CONTROL PANEL','control',1]];
 return `<nav class="official-nav real-nav" aria-label="Navigation DCS">${rows.map(([l,p,i])=>c.btn(l,'nav',`data-page="${p}" data-unit="${i??c.selected}" ${page===p?'aria-current="page"':''}`,page===p)).join('')}</nav>`;
}
function realTools(c,photo){return `<div class="dx-tools real-tools">${c.btn('QUYỀN TRẠM','yard-authority')}<span data-yard-authority></span><span class="tool-spacer"></span>${c.btn('ẢNH DCS '+photo,'photo-open',`data-photo="${photo}"`)}${c.btn('GHI CHÚ','real-screen-notes')}</div>`;}
function realGeneralElectrical(){
 let out='';
 const wire=(d,node)=>realWire(d,node,'#f11',2.5);
 out+=wire('M28 130H1040','C22')+wire('M328 144H936','C23')+wire('M404 159H904V307H1040','C25')+wire('M180 307H457','C21')+wire('M543 307H810','C24');
 for(const [x,title,node,id]of [[404,'L1 · ĐZ 273','L1','DS273-7'],[776,'L2 · ĐZ 272','L2','DS272-7']]){
  out+=realText(x,13,title,11,'middle')+wire(`M${x} 28V77`,node)+wire(`M${x} 77V130`,id==='DS273-7'?'X273':'X272')+wire(`M${x-6} 36L${x} 26L${x+6} 36`,node)+realDevice(id,x,77,'DS',id,'','right',8);
  out+=realEarth(id==='DS273-7'?'ES273-76':'ES272-76',x+72,54,x)+realEarth(id==='DS273-7'?'ES273-74':'ES272-74',x+72,112,x);
 }
 [['220kV(C22)',28,124],['220kV(C23)',328,141],['220kV(C21)',166,301],['220kV(C24)',546,301],['220kV(C25)',836,301]].forEach(([l,x,y])=>out+=realText(x,y,l,9));
 const branches=[
  [238,'C22','C21','DS271-2','CB271','DS271-1','ES271-25','ES271-15'],
  [404,'X273','C21','DS273-3','CB273','DS273-1','ES273-55','ES273-15'],
  [618,'C23','C24','DS274-3','CB274','DS274-4','ES274-35','ES274-45'],
  [776,'X272','C24','DS272-2','CB272','DS272-4','ES272-25','ES272-45'],
  [936,'C23','C25','DS275-3','CB275','DS275-5','ES275-35','ES275-55']
 ];
 for(const [x,top,bottom,ds1,cb,ds2,es1,es2]of branches){
  const y0=cb==='CB271'?130:cb==='CB273'||cb==='CB272'?159:144;
  out+=wire(`M${x} ${y0}V175`,top)+wire(`M${x} 183V233`,gridSpec(cb).a)+wire(`M${x} 242V282`,gridSpec(cb).b)+wire(`M${x} 291V307`,bottom);
  out+=realDevice(ds1,x,175,'DS',ds1==='DS273-3'?'DS273-5':ds1,'','right',8)+realDevice(cb,x,233,'CB',cb,'','right',8)+realDevice(ds2,x,282,'DS',ds2,'','right',8);
  out+=realEarth(es1,x+72,207,x)+realEarth(es2,x+72,258,x);
 }
 out+=wire('M936 307V355','C25')+wire('M936 355V467','SB4A')+realDevice('DS275-7',936,355,'DS','DS275-7','','right',8)+realEarth('ES275-74',1010,330,936)+realEarth('ES275-76',1010,382,936);
 out+=`<circle cx="936" cy="472" r="12" fill="#000" stroke="#f33" stroke-width="2"/>${realText(936,475,'~',17,'middle','#f33')}${realText(936,498,'SONG BUNG 4A',11,'middle')}${realText(936,511,'HPP',10,'middle')}`;
 for(let i=0;i<2;i++){
  const x=i?618:238,n=i+1,cb=901+i,sy='T'+n;
  out+=wire(`M${x} 307V355`,'C'+(i?24:21))+wire(`M${x} 355V467`,'T'+n)+realDevice('DS23'+n+'-3',x,355,'DS','DS23'+n+'-3','','right',8)+realEarth('ES23'+n+'-34',x+72,330,x)+realEarth('ES23'+n+'-38',x+72,382,x);
  out+=realTransformer(x,467,'')+realWire(`M${x} 498V545`,'T'+n,'#00c2d9',2)+realDevice('CB'+cb,x,545,'CB','CB'+cb,'','right',8)+wire(`M${x} 554V564`,'G'+n);
  out+=realAction(`data-action="nav" data-page="control" data-unit="${i}"`,
   `<circle cx="${x}" cy="582" r="19" fill="#000" stroke-width="2" data-machine-stroke="${i}"/><text x="${x}" y="587" font-size="16" text-anchor="middle" data-machine-text="${i}">H${n}</text>`);
  out+=realText(x+18,423,'POS. TAPE CHANGE',10)+realAction(`data-action="real-reference-value" data-real-key="ref:tap${n}"`,`<rect x="${x+145}" y="410" width="44" height="20" fill="#d4d4ca" stroke="#aaa"/><text x="${x+166}" y="425" text-anchor="middle" font-size="14" style="fill:#111" data-real-value="ref:tap${n}" data-real-dec="0">—</text>${realText(x+186,416,'R',6,'end','#555')}`);
  out+=realWire(`M${x+22} 564H${x+164}M${x+25} 570l14 5l-14 5l14 5l-14 5l14 5l-14 5l14 5l-14 5`,'','#ddd',2)+realText(x+43,583,'EXCITOR',15);
  out+=realMeter(x+45,589,126,[['U','u:'+i+':excV','V',1],['I','u:'+i+':excI','A',0]],20);
  out+=realAction(`data-action="nav" data-page="cond1" data-unit="${i}"`,`<rect x="${x-4}" y="607" width="8" height="9" data-real-ready="${i}"/>${realText(x,630,'STARTING',8,'middle')}${realText(x,640,'CONDITION',8,'middle')}`);
  const mx=i?440:12;
  out+=realMeter(mx,317,150,[['Ia','grid:U'+n+'HV:current','A',1],['Ib','grid:U'+n+'HV:current','A',1],['Ic','grid:U'+n+'HV:current','A',1],['Uab','grid:C'+(i?24:21)+':kv','kV',1],['Ubc','grid:C'+(i?24:21)+':kv','kV',1],['Uca','grid:C'+(i?24:21)+':kv','kV',1]],19);
  out+=realMeter(mx,438,150,[['F','grid:C'+(i?24:21)+':frequency','Hz',2]],20);
  out+=realMeter(mx,485,150,[['Uab','u:'+i+':kv','kV',2],['Ubc','u:'+i+':kv','kV',2],['Uca','u:'+i+':kv','kV',2]],19);
  out+=realMeter(mx,549,150,[['P','u:'+i+':p','MW',1],['Q','u:'+i+':q','MVAr',1],['PF','u:'+i+':pf','cosφ',2],['N','u:'+i+':rpm','rpm',0]],21);
  out+=realMeter(x+25,488,140,[['Ia','u:'+i+':current','A',0],['Ib','u:'+i+':current','A',0],['Ic','u:'+i+':current','A',0]],18);
  out+=realGeneralSelectors(i,mx,658);
 }
 for(const [x,node]of [[66,'L1'],[568,'L2']]){
  out+=realMeter(x,6,150,[['Ia','grid:'+node+':current','A',1],['Ib','grid:'+node+':current','A',1],['Ic','grid:'+node+':current','A',1],['Uab','grid:'+node+':kv','kV',1],['Ubc','grid:'+node+':kv','kV',1],['Uca','grid:'+node+':kv','kV',1]],18);
  out+=realMeter(node==='L2'?906:x+155,67,147,[['P','grid:'+node+':p','MW',1],['Q','grid:'+node+':q','MVAr',1],['F','grid:'+node+':frequency','Hz',2]],19);
 }
 return out+sourceMeterSvg(952,410,100,['p','q','kv']);
}
function realGeneralSelectors(i,x,y){
 let out=realText(x+84,y-4,'43RR-1',9,'middle');
 [['A VUONG','rr2','A VUONG'],['DN','rr2','DA NANG'],['A0','rr1','A0/A3']].forEach(([label,key,val],j)=>{
  out+=realAction(`data-action="real-unit-selector" data-unit="${i}" data-key="${key}" data-value="${val}"`,
   `<rect x="${x+j*54}" y="${y}" width="52" height="23" fill="#bcbcbc" stroke="#ddd" data-real-switch="${i}:${key}:${val}"/>${realText(x+j*54+26,y+15,label,9,'middle','#222')}`);
 });
 for(const [off,key,label]of [[176,'alr','43ALR'],[290,'govf','43 GOV FREQUENCY CONTROL']]){
  out+=realText(x+off+51,y-4,label,8,'middle');
  ['NOT USE','USE'].forEach((val,j)=>out+=realAction(`data-action="real-unit-selector" data-unit="${i}" data-key="${key}" data-value="${val}"`,
   `<rect x="${x+off+j*51}" y="${y}" width="49" height="23" fill="#bcbcbc" stroke="#ddd" data-real-switch="${i}:${key}:${val}"/>${realText(x+off+j*51+24.5,y+15,val,8,'middle','#222')}`));
 }
 return out;
}
function realGeneralTemperature(){
 const x=1064,w=610,left=136,middle=338,right=136,header=22,rh=17.6;
 let out=`<rect x="${x}" y="2" width="${w}" height="540" fill="#000" stroke="#ddd"/>`;
 [x+left,x+left+middle].forEach(xx=>out+=realWire(`M${xx} 2V519`,'','#bbb',1));
 out+=realText(x+left/2,17,'H1',12,'middle')+realText(x+left+middle/2,17,'TEMPERATURE MONITOR',12,'middle')+realText(x+left+middle+right/2,17,'H2',12,'middle');
 out+=realWire(`M${x} 22H${x+w}`,'','#bbb',1);
 REAL_GENERAL_TEMPS.forEach(([label,key],j)=>{
  const y=header+j*rh;
  out+=realWire(`M${x} ${y+rh}H${x+w}`,'','#aaa',.7)+realText(x+left+7,y+12.6,label,10.2);
  [0,1].forEach(i=>{const xx=i?x+left+middle+9:x+9;
   out+=realAction(`data-action="real-tag" data-real-key="u:${i}:${key}"`,
    `<rect x="${xx}" y="${y+1.5}" width="83" height="${rh-3}" fill="#d3d3c6"/><text x="${xx+78}" y="${y+13}" text-anchor="end" font-size="13.5" style="fill:#111" data-real-value="u:${i}:${key}" data-real-dec="1">—</text>${realText(xx+86,y+13,'°C',10)}`);
  });
 });
 const by=header+REAL_GENERAL_TEMPS.length*rh;
 out+=realMeter(x+2,by+2,127,[['','ref:tailwater','m',2]],22)+realText(x+138,by+17,'TAIL RACE LEVEL',10)+realText(x+306,by+17,'SPILLWAY WATER LEVEL',9.5)+realMeter(x+w-131,by+2,129,[['','ref:reservoir','m',2]],22);
 return out;
}
function realValveTank(id,x,y,label){
 let out=realText(x+52,y-11,label,10,'middle');
 out+=realAction(`data-action="equipment-open" data-equipment="${id}"`,
  `<ellipse cx="${x+10}" cy="${y+27}" rx="10" ry="25" fill="url(#real-metal)"/><rect x="${x+10}" y="${y+2}" width="84" height="50" fill="url(#real-metal)"/><ellipse cx="${x+94}" cy="${y+27}" rx="9" ry="25" fill="url(#real-metal)"/><path d="M${x+34} ${y+27}h36" fill="none" stroke-width="4" data-real-valve="${id}"/><path d="M${x+32} ${y+26}L${x+72} ${y+26}" stroke="#111" stroke-width="2" data-real-valve-needle="${id}"/>`);
 out+=realWire(`M${x+9} ${y+50}V${y+77}H${x+96}V${y+50}`,'','#55b2df',2)+realWire(`M${x+45} ${y+77}l-9 -6v12l9 -6l9 6v-12z`,'','#ccc',1.5)+realDevice(id,x+72,y+77,'CB','','','right',5);
 return out;
}
function realGeneralAux(){
 let out='';
 // NKT: the three CWP symbols share the already modelled common pump feedback.
 for(let i=0;i<3;i++){
  const y=574+i*25;
  out+=realWire(`M1027 ${y}H1054M1081 ${y}H1127V${y+7}H1180`,'','#31a4db',3)+`<rect x="1022" y="${y-8}" width="6" height="16" fill="#000" stroke="#ddd"/>`;
  out+=realDevice('NK-1MB'+(i+1),1067,y,'motor','','','right',5)+realText(1078,y-7,'CWP'+(i+1),8);
  out+=realAction(`data-action="real-unmapped" data-label="${i+1}NK-3VD1"`,`<path d="M1147 ${y+1}l14 12v-12l-14 12z" fill="#777" stroke="#ddd"/>${realText(1154,y-3,`${i+1}NK-3VD1`,7,'middle')}`);
 }
 out+=realAction('data-action="nav" data-page="nkt"',`<rect x="1186" y="550" width="74" height="66" fill="#8c8c8c" stroke="#ddd"/>${realText(1223,570,'NKT',12,'middle','#111')}${realText(1223,590,'REMOTE / LOCAL',7,'middle','#111')}`);
 // Pit and dewatering symbols are present in the photo; no independent DI was supplied.
 for(const [x,y,w,label,names]of [[840,658,178,'',['DOP','DP1','DP2']],[1030,658,176,'DEWATERING PIT',['DWP1','DWP2']]]){
  out+=`<rect x="${x}" y="${y}" width="${w}" height="50" fill="#000" stroke="#ddd"/><rect x="${x+1}" y="${y+21}" width="${w-2}" height="28" fill="#0878ab"/>`;
  names.forEach((name,j)=>{const xx=x+18+j*47;
   out+=realAction(`data-action="real-unmapped" data-label="${name}"`,`<path d="M${xx} ${y-11}V${y+29}" stroke="#ddd" stroke-width="2"/><circle cx="${xx}" cy="${y+33}" r="10" fill="#00df00" data-drain-pump="${name}" stroke="#ddd"/>${realText(xx,y+37,'↑',14,'middle')}${realText(xx,y+47,name,8,'middle')}`);
  });
  if(label)out+=realText(x+123,y+33,label,8,'middle');
 }
 out+=realWire('M1018 680H1030M1005 680l-12 -8v16l12 -8l12 8v-16z','','#ddd',1.5);
 out+=realValveTank('H1:inlet',1272,619,'INLET VALVE H1')+realValveTank('PENSTOCK',1396,568,'PENSTOCK VALVE')+realValveTank('H2:inlet',1560,619,'INLET VALVE H2');
 out+=realMeter(1380,544,148,[['','ref:flow','m³/s',2]],20);
 return out;
}
function dynamicGeneralPage(c){return `<div class="official-page real-page">${realTools(c,33)}<svg xmlns="http://www.w3.org/2000/svg" class="dx-svg real-svg real-general-svg" viewBox="0 0 1680 712" preserveAspectRatio="xMidYMid meet" aria-label="GENERAL DISPLAY PANEL · bố cục ảnh DCS 33 ngày 29/10/2026">${realDefs()}${realGeneralElectrical()}${realGeneralTemperature()}${realGeneralAux()}</svg>${realNavigation(c,'general')}</div>`;}

// Orthogonal cable routes: bridge crossings between different electrical nodes.
function serviceSegments(d){
 const t=d.match(/[MLHVmlhv]|[-+]?(?:\d*\.\d+|\d+)/g)||[],out=[];let x=0,y=0,i=0,c='';
 while(i<t.length){if(/[a-z]/i.test(t[i]))c=t[i++];const old=[x,y],rel=c===c.toLowerCase(),k=c.toUpperCase();
  if(k==='M'||k==='L'){x=Number(t[i++])+(rel?x:0);y=Number(t[i++])+(rel?y:0);}else if(k==='H')x=Number(t[i++])+(rel?x:0);else if(k==='V')y=Number(t[i++])+(rel?y:0);else throw Error('Unsupported service route');
  if(k!=='M')out.push({a:old,b:[x,y]});else c=rel?'l':'L';
 }return out;
}
function serviceWiringSvg(routes){
 const segments=routes.flatMap((r,i)=>serviceSegments(r.d).map(s=>({...s,node:r.node,route:i}))),inside=(v,a,b)=>v>Math.min(a,b)+4&&v<Math.max(a,b)-4;
 return routes.map((r,i)=>{let d='';for(const s of segments.filter(s=>s.route===i)){
  const [x,y]=s.a,[xx,yy]=s.b;d+=`M${x} ${y}`;
  if(y===yy){const crossings=[...new Set(segments.filter(v=>v.node!==s.node&&v.a[0]===v.b[0]&&inside(v.a[0],x,xx)&&inside(y,v.a[1],v.b[1])).map(v=>v.a[0]))].sort((a,b)=>x<xx?a-b:b-a),dir=Math.sign(xx-x);
   for(const at of crossings)d+=`H${at-dir*4}Q${at} ${y-7} ${at+dir*4} ${y}`;d+=`H${xx}`;
  }else d+=`V${yy}`;
 }return `<path d="${d}" data-service-route="${i}" data-service-original="${r.d}" data-real-node="${r.node}" fill="none" stroke="#e2ad49" stroke-width="2"/>`;}).join('');
}
function realServiceSvg(){
 const wires=[],w=(d,node)=>{if(!node)throw Error('Service conductor without node: '+d);wires.push({d,node});return '';};
 let o=realDefs();
 // Upper supply row: ST1 at left, DG / TD-43 in the centre, ST2 at right.
 o+=realPlaque(240,10,200,'POWER SUPPLY ST1')+realPlaque(1390,10,200,'POWER SUPPLY ST2');
 o+=realText(75,20,'43_O/A',14)+realAction('data-action="real-service-authority"',`<rect x="30" y="30" width="150" height="39" fill="#808080" stroke="#ddd"/><rect x="33" y="33" width="68" height="32" data-real-station="OPS"/><rect x="104" y="33" width="73" height="32" data-real-station="ALMDU"/>${realText(67,55,'OPS',13,'middle','#111')}${realText(140,55,'ALMDU',13,'middle','#111')}`);
 o+=realAction('data-action="yard-authority"',`<rect x="38" y="75" width="68" height="25" data-real-remote="REMOTE"/><rect x="109" y="75" width="68" height="25" data-real-remote="LOCAL"/>${realText(72,92,'REMOTE',10,'middle','#111')}${realText(143,92,'LOCAL',10,'middle','#111')}`);
 o+=w('M195 18V132','ST1')+w('M195 132V154','MDB1')+realTransformer(195,61,'TD91\n(ST1)','#50b6e4','#dfaa44');
 o+=w('M1324 18V132','ST2')+w('M1324 132V154','MDB2')+realTransformer(1324,61,'TD92\n(ST2)','#50b6e4','#dfaa44');
 o+=w('M869 10V31','ST3IN')+w('M869 31V124','ST3')+w('M869 124V144','MDB3')+realDevice('CB-22KV',869,31,'CB','22kV CB','','right',8)+realTransformer(869,67,'TD-43','#d99870','#e5b048')+realText(888,96,'(ST-3)',10);
 o+=realAction('data-action="real-unmapped" data-label="22kV CB · REMOTE / LOCAL"',`<rect x="887" y="42" width="115" height="18" fill="#bbb"/>${realText(941,55,'REMOTE / LOCAL',9,'middle','#222')}`);
 o+=realPlaque(602,9,90,'DG AUTO');
 o+=realDevice('DG',652,51,'motor','','','right',17)+realText(652,56,'DG',18,'middle','#111')+w('M652 82V99','DG')+w('M652 99V124','DGOUT')+w('M652 124V144','MDB3')+realDevice('52DG',652,99,'CB','52DG','','right',7);
 o+=realMeter(708,10,125,[['','service:dgV','V',2],['','service:dgA','A',2],['','service:dgF','Hz',2],['','ref:dgEnergy','kWh',2]],20);
 // Three main distribution boards and the nine original ACB controls.
 o+=w('M55 154H565','MDB1')+w('M634 144H888','MDB3')+w('M1010 154H1627','MDB2');
 o+=realText(324,144,'MDB1',12)+realText(748,135,'MDB3',12)+realText(1130,145,'MDB2',12);
 o+=realDevice('ACB-1',195,132,'CB','ACB-10','(ACB-1)')+realDevice('ACB-2',1324,132,'CB','ACB-20','(ACB-2)')+realDevice('ACB-3',869,124,'CB','ACB-30','(ACB-3)','left')+realDevice('ACB-4',652,124,'CB','ACB-33','(ACB-4)');
 o+=w('M470 154V130','MDB1')+w('M470 130V95H618V199H652V174','DB1')+w('M652 174V144','MDB3')+realDevice('ACB-7',470,130,'CB','ACB-13','(ACB-7)')+realDevice('ACB-5',652,174,'CB','ACB-31','(ACB-5)');
 o+=w('M1038 154V130','MDB2')+w('M1038 130V95H939V199H869V174','DB2')+w('M869 174V144','MDB3')+realDevice('ACB-8',1038,130,'CB','ACB-23','(ACB-8)')+realDevice('ACB-6',869,174,'CB','ACB-32','(ACB-6)','left');
 o+=w('M555 154H568V216H760','MDB1')+w('M760 216H960V154H1038','MDB2')+realDevice('ACB-BT',760,216,'CB','ACB-12','(ACB-BT)');
 for(const [x,y,txt,key]of [[55,116,'27-MDB1','MDB1'],[207,83,'27-TD91','ST1'],[377,83,'27-ACB13','DB1'],[735,154,'27-MDB3','MDB3'],[882,99,'27-TD43','ST3'],[1118,83,'27-ACB23','DB2'],[1340,83,'27-TD92','ST2'],[1503,116,'27-MDB2','MDB2']])o+=realPlaque(x,y,105,txt,'grid:'+key+':kv');
 // Routing is traced from the reference. Crossings are not junctions unless a symbol / bus terminates there.
 const routes=[
  ['M90 154V367','MDB1'],['M180 367V264H957V154','MDB2'],
  ['M275 154V367','MDB1'],['M363 367V282H977V154','MDB2'],
  ['M470 154V367','MDB1'],['M725 367V322H1000V154','MDB2'],
  ['M487 154V303H1034V367','MDB1'],['M1118 154V367','MDB2'],
  ['M510 154V246H1201V367','MDB1'],['M1290 154V367','MDB2'],
  ['M532 154V228H1375V367','MDB1'],['M1465 154V367','MDB2']
 ];
 routes.forEach(([d,n])=>o+=w(d.replace(/V367$/,'V348'),n));
 for(const [x,wid,label,node]of [[73,130,'DB-4','DB4'],[255,130,'MCC1','MCC1'],[438,162,'DB-1','DB1A'],[1015,132,'DB-2','DB2F'],[1182,130,'MCC2','MCC2'],[1355,134,'DB-3','DB3']])o+=w(`M${x} 367h${wid}`,node)+realText(x+wid/2,291,label,13,'middle');
 o+=w('M600 367H758','DB1B');
 const feeders=[
  ['ACB-19',90,'ACB-01','(ACB-19)'],['ACB-20',180,'ACB-02','(ACB-20)'],
  ['ACB-9',275,'ACB-01','(ACB-9)'],['ACB-10',363,'ACB-02','(ACB-10)'],
  ['ACB-13',470,'ACB-01','(ACB-13)'],['ACB-14',725,'ACB-02','(ACB-14)'],
  ['ACB-15',1034,'ACB-01','(ACB-15)'],['ACB-16',1118,'ACB-02','(ACB-16)'],
  ['ACB-11',1201,'ACB-01','(ACB-11)'],['ACB-12',1290,'ACB-02','(ACB-12)'],
  ['ACB-17',1375,'ACB-01','(ACB-17)'],['ACB-18',1465,'ACB-02','(ACB-18)']
 ];
 feeders.forEach(([id,x,l,sub])=>o+=w(`M${x} 348V367`,gridSpec(id).b)+realDevice(id,x,348,'CB',l,sub,'right',7));
 o+=realDevice('ACB-BT-1',600,367,'CB','ACB-03','(ACB-BT-1)','left',7);
 // 343ASR is observed on the HMI. Its unprovided PLC logic is not invented.
 o+=`<rect x="1509" y="213" width="109" height="114" fill="#000" stroke="#ddd" stroke-width="2"/><rect x="1525" y="202" width="78" height="20" fill="#000"/>${realText(1563,218,'343ASR',15,'middle')}${realText(1612,225,'R',7,'end','#aaa')}`;
 ['USE','NOT USE'].forEach((l,i)=>o+=realAction(`data-action="real-unmapped" data-label="343ASR · ${l}"`,`<rect x="1524" y="${234+i*37}" width="79" height="33" fill="${i?'#ffff00':'#bcbcbc'}" stroke="#ddd"/>${realText(1563,256+i*37,l,13,'middle','#222')}`));
 // AC section / redundant UPS, placed between DC-8 and DC-1 as in the live photo.
 o+=w('M515 367V478','DB1A')+w('M659 367V478','DB1B')+w('M515 478V500','UPSAC')+w('M659 478V500','UPSAC')+realDashedBox(493,430,185,80,['AC']);
 o+=w('M507 500H664','UPSAC')+realDevice('ACB-21',515,478,'CB','ACB','-21')+realDevice('ACB-22',659,478,'CB','ACB','-22','left');
 // AC and DC inputs terminate on each UPS box; DC5 never back-feeds AC.
 o+=w('M475 367V563','DB1A')+w('M695 367V535H642V563','DB1B');
 o+=w('M1230 692V707H550V550H498V563','DC5')+w('M1320 692V711H699V557H667V563','DC5');
 o+=realDashedBox(461,563,57,55,['AC1','UPS'])+realDashedBox(628,563,57,55,['AC1','UPS']);
 o+=w('M489 618V674','UPS1')+w('M489 674V692','AC1')+w('M657 618V674','UPS2')+w('M657 674V692','AC2');
 o+=realDashedBox(445,631,85,76,['AC1'])+realDashedBox(612,631,85,76,['AC2']);
 o+=w('M460 692H515','AC1')+w('M626 692H684','AC2')+realDevice('ACB-23',489,674,'CB','ACB','-23','right',7)+realDevice('ACB-24',657,674,'CB','ACB','-24','right',7);
 // Chargers / batteries 3 and 4 and the DC-8 board on the lower left.
 for(const [a,b,base,charger,bat,db,ids]of [[88,149,75,3,3,'DC6',[11,12]],[287,347,272,4,4,'DC7',[13,14]]]){
  o+=w(`M${a} 367V430`,charger===3?'DB4':'MCC1')+w(`M${b} 479V522`,'BAT'+bat)+realDashedBox(a-27,430,54,49,['CHAR',String(charger)])+realDashedBox(b-27,430,54,49,['BAT',String(bat)]);
  o+=w(`M${a} 479V522`,'CH'+charger)+w(`M${a} 522V550`,db)+w(`M${b} 522V550`,db)+w(`M${base} 550h111`,db)+realText(base+54,498,'DC-'+(charger+3),11,'middle');
  o+=realDevice('DCB-'+ids[0],a,522,'CB','DCB-'+ids[0],'','left',7)+realDevice('DCB-'+ids[1],b,522,'CB','DCB-'+ids[1],'','right',7);
 }
 o+=realDashedBox(72,622,304,81,['DC-8'])+w('M74 692H373','DC8')+w('M119 550V666','DC6')+w('M119 666V692','DC8')+w('M319 550V666','DC7')+w('M319 666V692','DC8')+realDevice('DCB-15',119,666,'CB','DCB-15','','right',7)+realDevice('DCB-16',319,666,'CB','DCB-16','','right',7);
 // Charger / battery pairs 1 and 2, followed by DC-3 / DC-5 / DC-4.
 for(const [a,b,no]of [[1034,1168,1],[1320,1456,2]]){
  o+=w(no===1?'M565 367V411H1034V430':'M705 367V421H1320V430','DB1'+(no===1?'A':'B'))+realDashedBox(a-26,430,52,49,['CHAR',String(no)])+realDashedBox(b-26,430,52,49,['BAT',String(no)]);
  o+=w(`M${a} 479V522`,'CH'+no)+w(`M${a} 522V550`,'DC'+no)+w(`M${b} 479V522`,'BAT'+no)+w(`M${b} 522V550`,'DC'+no)+w(`M${a-24} 550H${b+35}`,'DC'+no)+realText((a+b)/2,498,'DC-'+no,11,'middle');
  o+=realDevice('DCB-'+(no*2-1),a,522,'CB','DCB-'+(no*2-1),'','right',7)+realDevice('DCB-'+no*2,b,522,'CB','DCB-'+no*2,'','right',7);
 }
 o+=realDashedBox(1008,623,190,80,['DC-3'])+realDashedBox(1214,623,179,80,['DC-5'])+realDashedBox(1407,623,179,80,['DC-4']);
 const dcRoutes=[
  ['M1034 550V666','DC1'],['M1298 550V596H1118V666','DC2'],
  ['M1182 550V570H1230V666','DC1'],['M1320 550V666','DC2'],
  ['M1168 550V582H1420V666','DC1'],['M1456 550V666','DC2']
 ];dcRoutes.forEach(([d,n])=>o+=w(d,n));
 o+=w('M1020 692H1175','DC3')+w('M1222 692H1368','DC5')+w('M1414 692H1564','DC4');
 [['DCB-5',1034],['DCB-6',1118],['DCB-7',1230],['DCB-8',1320],['DCB-9',1420],['DCB-10',1456]].forEach(([id,x])=>o+=w(`M${x} 666V692`,gridSpec(id).b)+realDevice(id,x,666,'CB',id,'',x===1456?'right':'left',7));
 return `<svg xmlns="http://www.w3.org/2000/svg" class="dx-svg real-svg real-service-svg" viewBox="0 0 1680 712" preserveAspectRatio="xMidYMid meet" aria-label="STATION SERVICE CIRCUIT · ST1 ST2 ST3 DG MDB DB MCC DC UPS · ảnh 36">${serviceWiringSvg(wires)}${o}</svg>`;
}
function dynamicServicePage(c){return `<div class="official-page real-page">${realTools(c,36)}${realServiceSvg()}${realNavigation(c,'stationservice')}</div>`;}

function realValue(key,p,meters){
 const bits=key.split(':');
 if(bits[0]==='u')return readTag(bits[2],+bits[1]);
 if(bits[0]==='ref'){if(/^tap[12]$/.test(bits[1])){const t=p.equipment.taps[Number(bits[1].at(-1))-1];return {value:t.value,quality:p.communicationOK?'GOOD':'BAD'};}const v=REAL_PHOTO_VALUES[bits[1]];return {value:v?.value,quality:'REFERENCE'};}
 if(bits[0]==='grid'){
  const node=bits[1],field=bits[2],low=/^(ST|MDB|DB|MCC|AC|UPS|DG)/.test(node),live=p.equipment.live(node);
  let value=meters[node+':'+field];
  

  const mapped=/^U([12])HV$/.exec(node),actualNode=mapped?'C'+(mapped[1]==='1'?21:24):node;const connected=p.equipment.connected(actualNode),bad=!!mapped&&!p.units[+mapped[1]-1].qualityGood||!p.communicationOK||GRID_DEVICES.some(d=>(connected.has(d.a)||connected.has(d.b))&&p.equipment.get(d.id).bad);
  return {value:value===undefined?undefined:Number(value),quality:bad?'BAD':'GOOD'};
 }
 if(bits[0]==='service')return {value:bits[1]==='dgV'?(p.diesel?400:0):bits[1]==='dgF'?(p.diesel?p.frequency:0):0,quality:p.communicationOK?'GOOD':'BAD'};
 return {value:undefined,quality:'UNKNOWN'};
}
function updateRealityScreens(root,p,frameMeters){
 if(!root.querySelector('.real-svg'))return;
 const meters=frameMeters||gridMeasurements(p),eq=p.equipment;
 for(const e of root.querySelectorAll('[data-real-value]')){
  const key=e.dataset.realValue,t=realValue(key,p,meters),d=+e.dataset.realDec;
  e.textContent=t.quality==='BAD'?'BQ':Number.isFinite(t.value)?t.value.toFixed(d):'—';
  e.style.fill=t.quality==='BAD'?'#f000ed':'#111';
  e.setAttribute('data-quality',t.quality);
  const group=e.closest('[data-action]');if(group)group.setAttribute('aria-label',key+' · '+e.textContent+(t.quality==='REFERENCE'?' · mốc ảnh 29/10/2026':''));
 }
 for(const e of root.querySelectorAll('[data-real-node]')){
  const node=e.dataset.realNode,dc=/^(DC|CH|BAT)/.test(node),bad=!p.communicationOK;
  e.setAttribute('stroke',bad?'#f0f':eq.live(node)?(route.page==='general'&&!/^(DB|MDB|UPS|AC|DG)/.test(node)?'#ff2020':'#e2ad49'):'#666');
 }
 for(const e of root.querySelectorAll('[data-real-valve]')){const s=eq.auxState(e.dataset.realValve);e.setAttribute('stroke',equipmentColor({bad:s?.bad??true,moving:s?.moving,on:s?.on}));}
 for(const e of root.querySelectorAll('[data-real-valve-needle]')){
  const a=eq.auxState(e.dataset.realValveNeedle);const b=e.getBBox?.();if(b&&a)e.setAttribute('transform',`rotate(${a.position>=99?0:a.position<=1?40:40*(1-a.position/100)} ${b.x+b.width/2} ${b.y+b.height/2})`);
 }
 for(const e of root.querySelectorAll('[data-real-switch]')){
  const [i,key,val]=e.dataset.realSwitch.split(':'),u=p.units[+i],v=key==='govf'?u.s.govMode==='FREQUENCY'?'USE':'NOT USE':u.s.switches[key];
  const on=v===val&&(key!=='rr2'||u.s.switches.rr1==='AV/DN');
  e.setAttribute('fill',!u.qualityGood?'#f0f':on?'#ff0':'#bcbcbc');
 }
 for(const e of root.querySelectorAll('[data-real-ready]')){const u=p.units[+e.dataset.realReady];e.setAttribute('fill',!u.qualityGood?'#f0f':u.ready?'#00ef00':'#666');}
 for(const e of root.querySelectorAll('[data-machine-text]')){const u=p.units[+e.dataset.machineText];e.style.fill=equipmentColor({bad:!u.qualityGood,on:machineRunning(u)});}
 for(const e of root.querySelectorAll('[data-real-station]'))e.setAttribute('fill',(p.station==='UMDU'?'ALMDU':'OPS')===e.dataset.realStation?'#ff0':'#bcbcbc');
 for(const e of root.querySelectorAll('[data-real-remote]'))e.setAttribute('fill',(eq.remote?'REMOTE':'LOCAL')===e.dataset.realRemote?'#ff0':'#bcbcbc');
}
function realScreenNotes(){
 openModal('GENERAL DISPLAY / STATION SERVICE CIRCUIT','ĐỐI CHIẾU ẢNH 33 / 36 · 29/10/2026',
  '<p>GENERAL DISPLAY: sơ đồ điện ở trái; H1/H2, kích từ và khóa lựa chọn phía dưới; 28 dòng nhiệt độ theo đúng thứ tự HMI ở phải; NKT, các hố tiêu nước và ba van ở mép dưới.</p>'+
  '<p>STATION SERVICE: bố trí TD91/ST1, DG, TD-43/ST3, TD92/ST2, MDB1/3/2, DB-1…4, MCC1/2, CHAR/BAT1…4, DC-1…8 và hai nhánh UPS theo ảnh. Tên mới ACB-10/20/30/33/31/32/13/23/12 luôn đi kèm mã ACB cũ trong ngoặc; hai mã được ánh xạ vào cùng một thiết bị.</p>'+
  '<p>Đỏ: đóng/chạy; xanh: mở/dừng; vàng nhấp nháy: đang chờ phản hồi; tím: BQ. Giá trị điện, nhiệt và phản hồi thiết bị lấy từ phiên OTS. Ba pha đang dùng cùng giá trị cân bằng của mô hình; chưa mô phỏng mất cân bằng pha.</p>'+
  '<p>Các ô có dấu R là mốc ảnh 29/10/2026, không phải số liệu đang biến đổi: mực nước hạ lưu 59,88 m, hồ 375,67 m, lưu lượng 63,84 m³/s, nấc MBA và điện năng DG. Nhấp ô để xem nguồn. Chưa lấy mực nước ống hút của mô hình làm mực nước hạ lưu.</p>'+
  '<p>Đóng cắt tự dùng mở rộng dùng liên động bảo thủ của OTS: không ghép hai phía đã có nguồn, không đóng khi BQ/đang chuyển, lệnh và phản hồi riêng. Đường dây và nhãn được đối chiếu ảnh; quan hệ truyền nguồn, chỉnh định, logic 343ASR/43_O/A và thân CMPT vẫn cần bản vẽ/FBD thực nạp. Khóa 343ASR giữ mốc NOT USE trên ảnh và có dấu R. Sơ đồ đóng cắt mở rộng chưa thay thuật toán chuyển nguồn chức năng hiện có của trình tự tổ máy. Nút chưa có logic chỉ mở thông tin; không giả lập lệnh đã thực hiện.</p>'+
  '<p>DOP/DP/DWP có màu chạy đỏ, dừng xanh theo chu kỳ đào tạo 60 s chạy / 120 s nghỉ; DP1/DP2 và DWP1/DWP2 luân phiên, chưa có DI thực. Bộ nạp, pin và UPS dùng nguồn chức năng lý tưởng, chưa có quá trình phóng điện, đo lường hay bảo vệ thực.</p>',btn('ẢNH GENERAL','photo-open','data-photo="33"')+btn('ẢNH TỰ DÙNG','photo-open','data-photo="36"')+btn('ĐÓNG','close-modal'));
}

// MODULE: dynamic-screens
/** Live SVG HMI. All equipment symbols project feedback; original bitmaps are comparison only. */
const dxEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dxText=(x,y,label,size=15)=>`<text x="${x}" y="${y}" font-size="${size}">${dxEsc(label)}</text>`;
const dxWire=(path,node)=>`<path d="${path}" class="dx-wire" data-grid-node="${node}"/>`;
function deviceSymbol(id,x,y,kind='DS',label=id,layout='vertical'){
 const shape=kind==='CB'?`<rect x="${x-11}" y="${y-12}" width="22" height="24" data-eq-fill="${id}"/>`:kind==='motor'?`<circle cx="${x}" cy="${y}" r="17" data-eq-fill="${id}"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="#000">M</text>`:kind==='valve'?`<path d="M${x-13} ${y-11}L${x+13} ${y+11}V${y-11}L${x-13} ${y+11}Z" data-eq-fill="${id}"/>`:`<circle cx="${x}" cy="${y}" r="11" data-eq-fill="${id}"/>`;
 const inline=layout==='inline',below=layout==='below',tx=inline||below?x:x+22,ty=inline?y-(kind==='motor'?26:22):below?y+46:y+5;
 const sx=inline||below?x:x+22,sy=inline?y+30:below?y+25:y-16,anchor=inline||below?'middle':'start';
 return `<g class="dx-device" data-action="equipment-open" data-equipment="${id}" role="button" tabindex="0" aria-label="${dxEsc(id)} · thao tác thiết bị"><rect x="${x-24}" y="${y-40}" width="160" height="96" fill="transparent"/>${shape}${circuitText(id,tx,ty,label,13,anchor)}<text x="${sx}" y="${sy}" text-anchor="${anchor}" class="dx-position circuit-label" data-circuit-label="state" data-label-equipment="${id}" data-eq-label="${id}"></text></g>`;
}
const dxMeter=(x,y,node,fields=['kv','p','q'])=>`<g>${fields.map((k,i)=>`<rect x="${x}" y="${y+i*25}" width="112" height="23" fill="#777" stroke="#bbb"/><text x="${x+5}" y="${y+17+i*25}" font-size="12">${{kv:'kV',p:'MW',q:'MVAr',frequency:'Hz',current:'A'}[k]}</text><text x="${x+105}" y="${y+17+i*25}" text-anchor="end" fill="#ffff00" data-grid-meter="${node}:${k}">—</text>`).join('')}</g>`;
const SWITCHYARD_EARTH_LAYOUT=[{"id":"ES271-25","tap":[280.0,307.8],"pos":[362.0,307.8]},{"id":"ES271-15","tap":[280.0,374.68],"pos":[362.0,374.68]},{"id":"ES273-55","tap":[560.0,307.8],"pos":[642.0,307.8]},{"id":"ES273-15","tap":[560.0,374.68],"pos":[642.0,374.68]},{"id":"ES274-35","tap":[900.0,307.8],"pos":[982.0,307.8]},{"id":"ES274-45","tap":[900.0,374.68],"pos":[982.0,374.68]},{"id":"ES272-25","tap":[1180.0,307.8],"pos":[1262.0,307.8]},{"id":"ES272-45","tap":[1180.0,374.68],"pos":[1262.0,374.68]},{"id":"ES275-35","tap":[1470.0,307.8],"pos":[1552.0,307.8]},{"id":"ES275-55","tap":[1470.0,374.68],"pos":[1552.0,374.68]},{"id":"ES273-76","tap":[560.0,41.8],"pos":[655.0,41.8]},{"id":"ES273-74","tap":[560.0,121.6],"pos":[655.0,121.6]},{"id":"ES272-76","tap":[1180.0,41.8],"pos":[1275.0,41.8]},{"id":"ES272-74","tap":[1180.0,121.6],"pos":[1275.0,121.6]},{"id":"ES231-34","tap":[280.0,486.4],"pos":[380.0,486.4]},{"id":"ES231-38","tap":[280.0,562.4],"pos":[380.0,562.4]},{"id":"ES232-34","tap":[900.0,486.4],"pos":[1000.0,486.4]},{"id":"ES232-38","tap":[900.0,562.4],"pos":[1000.0,562.4]},{"id":"ES275-74","tap":[1470.0,501.6],"pos":[1552.0,501.6]},{"id":"ES275-76","tap":[1470.0,608.0],"pos":[1552.0,608.0]}];
function dynamicSwitchyardSvg(c){return `<svg class="dx-svg" viewBox="0 0 1690 707" aria-label="Sơ đồ động trạm 220 kV A Vương · lệnh và phản hồi riêng từng thiết bị" preserveAspectRatio="xMidYMid meet">
  <path d="M 55 167.2 H 1560" class="dx-wire" data-grid-node="C22"/>
  <path d="M 780 205.2 H 1168 Q 1180 190 1192 205.2 H 1510" class="dx-wire" data-grid-node="C23"/>
  <path d="M 175 463.6 H 680" class="dx-wire" data-grid-node="C21"/>
  <path d="M 800 463.6 H 1300" class="dx-wire" data-grid-node="C24"/>
  <path d="M 560 239.4 H 888 Q 900 224.2 912 239.4 H 1168 Q 1180 224.2 1192 239.4 H 1350 V 463.6 H 1560" class="dx-wire" data-grid-node="C25"/>
  <text x="65" y="155.8" font-size="15">220 kV · C22 (L2)</text>
  <text x="790" y="193.8" font-size="15">220 kV · C23</text>
  <text x="180" y="452.2" font-size="15">220 kV · C21</text>
  <text x="805" y="452.2" font-size="15">220 kV · C24</text>
  <text x="1360" y="452.2" font-size="15">220 kV · C25 (L1)</text>
  <path d="M 280 167.2 V 281.2" class="dx-wire" data-grid-node="C22"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS271-2" role="button" tabindex="0" aria-label="DS271-2 · thao tác thiết bị">
    <rect x="258" y="262.96" width="160" height="36.48" fill="transparent"/>
    <circle cx="280" cy="281.2" r="11" data-eq-fill="DS271-2"/>
    <text x="302" y="285" font-size="13" class="circuit-label" data-label-equipment="DS271-2" data-circuit-label="name">DS271-2</text>
    <text x="263.0" y="266.2" class="dx-position circuit-label" data-eq-label="DS271-2" data-label-equipment="DS271-2" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 280 292.6 V 331.36" class="dx-wire" data-grid-node="A271"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="CB271" role="button" tabindex="0" aria-label="CB271 · thao tác thiết bị">
    <rect x="258" y="323.76" width="160" height="36.48" fill="transparent"/>
    <rect x="269" y="332.88" width="22" height="18.24" data-eq-fill="CB271"/>
    <text x="302" y="345.8" font-size="13" class="circuit-label" data-label-equipment="CB271" data-circuit-label="name">CB271</text>
    <text x="263.0" y="327.0" class="dx-position circuit-label" data-eq-label="CB271" data-label-equipment="CB271" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 280 353.4 V 395.2" class="dx-wire" data-grid-node="B271"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS271-1" role="button" tabindex="0" aria-label="DS271-1 · thao tác thiết bị">
    <rect x="258" y="388.36" width="160" height="36.48" fill="transparent"/>
    <circle cx="280" cy="406.6" r="11" data-eq-fill="DS271-1"/>
    <text x="302" y="410.4" font-size="13" class="circuit-label" data-label-equipment="DS271-1" data-circuit-label="name">DS271-1</text>
    <text x="263.0" y="391.6" class="dx-position circuit-label" data-eq-label="DS271-1" data-label-equipment="DS271-1" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 280 418 V 463.6" class="dx-wire" data-grid-node="C21"/>
  <path d="M 560 254.6 V 281.2" class="dx-wire" data-grid-node="X273"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS273-3" role="button" tabindex="0" aria-label="DS273-3 · thao tác thiết bị">
    <rect x="538" y="262.96" width="160" height="36.48" fill="transparent"/>
    <circle cx="560" cy="281.2" r="11" data-eq-fill="DS273-3"/>
    <text x="582" y="285" font-size="13" class="circuit-label" data-label-equipment="DS273-3" data-circuit-label="name">DS273-5</text>
    <text x="543.0" y="266.2" class="dx-position circuit-label" data-eq-label="DS273-3" data-label-equipment="DS273-3" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 560 292.6 V 331.36" class="dx-wire" data-grid-node="A273"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="CB273" role="button" tabindex="0" aria-label="CB273 · thao tác thiết bị">
    <rect x="538" y="323.76" width="160" height="36.48" fill="transparent"/>
    <rect x="549" y="332.88" width="22" height="18.24" data-eq-fill="CB273"/>
    <text x="582" y="345.8" font-size="13" class="circuit-label" data-label-equipment="CB273" data-circuit-label="name">CB273</text>
    <text x="543.0" y="327.0" class="dx-position circuit-label" data-eq-label="CB273" data-label-equipment="CB273" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 560 353.4 V 395.2" class="dx-wire" data-grid-node="B273"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS273-1" role="button" tabindex="0" aria-label="DS273-1 · thao tác thiết bị">
    <rect x="538" y="388.36" width="160" height="36.48" fill="transparent"/>
    <circle cx="560" cy="406.6" r="11" data-eq-fill="DS273-1"/>
    <text x="582" y="410.4" font-size="13" class="circuit-label" data-label-equipment="DS273-1" data-circuit-label="name">DS273-1</text>
    <text x="543.0" y="391.6" class="dx-position circuit-label" data-eq-label="DS273-1" data-label-equipment="DS273-1" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 560 418 V 463.6" class="dx-wire" data-grid-node="C21"/>
  <path d="M 900 205.2 V 281.2" class="dx-wire" data-grid-node="C23"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS274-3" role="button" tabindex="0" aria-label="DS274-3 · thao tác thiết bị">
    <rect x="878" y="262.96" width="160" height="36.48" fill="transparent"/>
    <circle cx="900" cy="281.2" r="11" data-eq-fill="DS274-3"/>
    <text x="922" y="285" font-size="13" class="circuit-label" data-label-equipment="DS274-3" data-circuit-label="name">DS274-3</text>
    <text x="883.0" y="266.2" class="dx-position circuit-label" data-eq-label="DS274-3" data-label-equipment="DS274-3" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 900 292.6 V 331.36" class="dx-wire" data-grid-node="A274"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="CB274" role="button" tabindex="0" aria-label="CB274 · thao tác thiết bị">
    <rect x="878" y="323.76" width="160" height="36.48" fill="transparent"/>
    <rect x="889" y="332.88" width="22" height="18.24" data-eq-fill="CB274"/>
    <text x="922" y="345.8" font-size="13" class="circuit-label" data-label-equipment="CB274" data-circuit-label="name">CB274</text>
    <text x="883.0" y="327.0" class="dx-position circuit-label" data-eq-label="CB274" data-label-equipment="CB274" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 900 353.4 V 395.2" class="dx-wire" data-grid-node="B274"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS274-4" role="button" tabindex="0" aria-label="DS274-4 · thao tác thiết bị">
    <rect x="878" y="388.36" width="160" height="36.48" fill="transparent"/>
    <circle cx="900" cy="406.6" r="11" data-eq-fill="DS274-4"/>
    <text x="922" y="410.4" font-size="13" class="circuit-label" data-label-equipment="DS274-4" data-circuit-label="name">DS274-4</text>
    <text x="883.0" y="391.6" class="dx-position circuit-label" data-eq-label="DS274-4" data-label-equipment="DS274-4" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 900 418 V 463.6" class="dx-wire" data-grid-node="C24"/>
  <path d="M 1180 254.6 V 281.2" class="dx-wire" data-grid-node="C22"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS272-2" role="button" tabindex="0" aria-label="DS272-2 · thao tác thiết bị">
    <rect x="1158" y="262.96" width="160" height="36.48" fill="transparent"/>
    <circle cx="1180" cy="281.2" r="11" data-eq-fill="DS272-2"/>
    <text x="1202" y="285" font-size="13" class="circuit-label" data-label-equipment="DS272-2" data-circuit-label="name">DS272-2</text>
    <text x="1163.0" y="266.2" class="dx-position circuit-label" data-eq-label="DS272-2" data-label-equipment="DS272-2" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 1180 292.6 V 331.36" class="dx-wire" data-grid-node="A272"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="CB272" role="button" tabindex="0" aria-label="CB272 · thao tác thiết bị">
    <rect x="1158" y="323.76" width="160" height="36.48" fill="transparent"/>
    <rect x="1169" y="332.88" width="22" height="18.24" data-eq-fill="CB272"/>
    <text x="1202" y="345.8" font-size="13" class="circuit-label" data-label-equipment="CB272" data-circuit-label="name">CB272</text>
    <text x="1163.0" y="327.0" class="dx-position circuit-label" data-eq-label="CB272" data-label-equipment="CB272" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 1180 353.4 V 395.2" class="dx-wire" data-grid-node="B272"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS272-4" role="button" tabindex="0" aria-label="DS272-4 · thao tác thiết bị">
    <rect x="1158" y="388.36" width="160" height="36.48" fill="transparent"/>
    <circle cx="1180" cy="406.6" r="11" data-eq-fill="DS272-4"/>
    <text x="1202" y="410.4" font-size="13" class="circuit-label" data-label-equipment="DS272-4" data-circuit-label="name">DS272-4</text>
    <text x="1163.0" y="391.6" class="dx-position circuit-label" data-eq-label="DS272-4" data-label-equipment="DS272-4" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 1180 418 V 463.6" class="dx-wire" data-grid-node="C24"/>
  <path d="M 1470 205.2 V 281.2" class="dx-wire" data-grid-node="C23"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS275-3" role="button" tabindex="0" aria-label="DS275-3 · thao tác thiết bị">
    <rect x="1448" y="262.96" width="160" height="36.48" fill="transparent"/>
    <circle cx="1470" cy="281.2" r="11" data-eq-fill="DS275-3"/>
    <text x="1492" y="285" font-size="13" class="circuit-label" data-label-equipment="DS275-3" data-circuit-label="name">DS275-3</text>
    <text x="1453.0" y="266.2" class="dx-position circuit-label" data-eq-label="DS275-3" data-label-equipment="DS275-3" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 1470 292.6 V 331.36" class="dx-wire" data-grid-node="A275"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="CB275" role="button" tabindex="0" aria-label="CB275 · thao tác thiết bị">
    <rect x="1448" y="323.76" width="160" height="36.48" fill="transparent"/>
    <rect x="1459" y="332.88" width="22" height="18.24" data-eq-fill="CB275"/>
    <text x="1492" y="345.8" font-size="13" class="circuit-label" data-label-equipment="CB275" data-circuit-label="name">CB275</text>
    <text x="1453.0" y="327.0" class="dx-position circuit-label" data-eq-label="CB275" data-label-equipment="CB275" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 1470 353.4 V 395.2" class="dx-wire" data-grid-node="B275"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS275-5" role="button" tabindex="0" aria-label="DS275-5 · thao tác thiết bị">
    <rect x="1448" y="388.36" width="160" height="36.48" fill="transparent"/>
    <circle cx="1470" cy="406.6" r="11" data-eq-fill="DS275-5"/>
    <text x="1492" y="410.4" font-size="13" class="circuit-label" data-label-equipment="DS275-5" data-circuit-label="name">DS275-5</text>
    <text x="1453.0" y="391.6" class="dx-position circuit-label" data-eq-label="DS275-5" data-label-equipment="DS275-5" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 1470 418 V 463.6" class="dx-wire" data-grid-node="C25"/>
  <text x="480" y="19" font-size="16">THẠNH MỸ · L1</text>
  <path d="M 560 26.6 V 64.6" class="dx-wire" data-grid-node="L1"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS273-7" role="button" tabindex="0" aria-label="DS273-7 · thao tác thiết bị">
    <rect x="538" y="57.76" width="160" height="36.48" fill="transparent"/>
    <circle cx="560" cy="76" r="11" data-eq-fill="DS273-7"/>
    <text x="582" y="79.8" font-size="13" class="circuit-label" data-label-equipment="DS273-7" data-circuit-label="name">DS273-7</text>
    <text x="543.0" y="61.0" class="dx-position circuit-label" data-eq-label="DS273-7" data-label-equipment="DS273-7" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 560 87.4 V 158.08 Q 540 167.2 560 176.32 V 254.6" class="dx-wire" data-grid-node="X273"/>
  <g>
    <rect x="370" y="31.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="375" y="44.84" font-size="12">A</text>
    <text x="475" y="44.84" text-anchor="end" fill="#ffff00" data-grid-meter="L1:current">—</text>
    <rect x="370" y="50.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="375" y="63.84" font-size="12">kV</text>
    <text x="475" y="63.84" text-anchor="end" fill="#ffff00" data-grid-meter="L1:kv">—</text>
    <rect x="370" y="69.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="375" y="82.84" font-size="12">MW</text>
    <text x="475" y="82.84" text-anchor="end" fill="#ffff00" data-grid-meter="L1:p">—</text>
    <rect x="370" y="88.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="375" y="101.84" font-size="12">MVAr</text>
    <text x="475" y="101.84" text-anchor="end" fill="#ffff00" data-grid-meter="L1:q">—</text>
    <rect x="370" y="107.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="375" y="120.84" font-size="12">Hz</text>
    <text x="475" y="120.84" text-anchor="end" fill="#ffff00" data-grid-meter="L1:frequency">—</text>
  </g>
  <text x="1100" y="19" font-size="16">THẠNH MỸ · L2</text>
  <path d="M 1180 26.6 V 64.6" class="dx-wire" data-grid-node="L2"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS272-7" role="button" tabindex="0" aria-label="DS272-7 · thao tác thiết bị">
    <rect x="1158" y="57.76" width="160" height="36.48" fill="transparent"/>
    <circle cx="1180" cy="76" r="11" data-eq-fill="DS272-7"/>
    <text x="1202" y="79.8" font-size="13" class="circuit-label" data-label-equipment="DS272-7" data-circuit-label="name">DS272-7</text>
    <text x="1163.0" y="61.0" class="dx-position circuit-label" data-eq-label="DS272-7" data-label-equipment="DS272-7" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 1180 87.4 V 254.6" class="dx-wire" data-grid-node="X272"/>
  <g>
    <rect x="990" y="31.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="995" y="44.84" font-size="12">A</text>
    <text x="1095" y="44.84" text-anchor="end" fill="#ffff00" data-grid-meter="L2:current">—</text>
    <rect x="990" y="50.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="995" y="63.84" font-size="12">kV</text>
    <text x="1095" y="63.84" text-anchor="end" fill="#ffff00" data-grid-meter="L2:kv">—</text>
    <rect x="990" y="69.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="995" y="82.84" font-size="12">MW</text>
    <text x="1095" y="82.84" text-anchor="end" fill="#ffff00" data-grid-meter="L2:p">—</text>
    <rect x="990" y="88.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="995" y="101.84" font-size="12">MVAr</text>
    <text x="1095" y="101.84" text-anchor="end" fill="#ffff00" data-grid-meter="L2:q">—</text>
    <rect x="990" y="107.92" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="995" y="120.84" font-size="12">Hz</text>
    <text x="1095" y="120.84" text-anchor="end" fill="#ffff00" data-grid-meter="L2:frequency">—</text>
  </g>
  <path d="M 280 463.6 V 516.8" class="dx-wire" data-grid-node="C21"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS231-3" role="button" tabindex="0" aria-label="DS231-3 · thao tác thiết bị">
    <rect x="258" y="498.56" width="160" height="36.48" fill="transparent"/>
    <circle cx="280" cy="516.8" r="11" data-eq-fill="DS231-3"/>
    <text x="302" y="520.6" font-size="13" class="circuit-label" data-label-equipment="DS231-3" data-circuit-label="name">DS231-3</text>
    <text x="263.0" y="501.79999999999995" class="dx-position circuit-label" data-eq-label="DS231-3" data-label-equipment="DS231-3" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 280 528.2 V 627" class="dx-wire" data-grid-node="T1"/>
  <circle cx="280" cy="642.2" r="18" stroke="#e71919" fill="none"/>
  <circle cx="280" cy="658.92" r="18" stroke="#00cccc" fill="none"/>
  <text x="265" y="687.8" font-size="15">U#1</text>
  <g>
    <rect x="110" y="539.6" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="115" y="552.52" font-size="12">kV</text>
    <text x="215" y="552.52" text-anchor="end" fill="#ffff00" data-grid-meter="C21:kv">—</text>
    <rect x="110" y="558.6" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="115" y="571.52" font-size="12">MW</text>
    <text x="215" y="571.52" text-anchor="end" fill="#ffff00" data-grid-meter="U1HV:p">—</text>
    <rect x="110" y="577.6" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="115" y="590.52" font-size="12">MVAr</text>
    <text x="215" y="590.52" text-anchor="end" fill="#ffff00" data-grid-meter="U1HV:q">—</text>
    <rect x="110" y="596.6" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="115" y="609.52" font-size="12">Hz</text>
    <text x="215" y="609.52" text-anchor="end" fill="#ffff00" data-grid-meter="C21:frequency">—</text>
  </g>
  <path d="M 900 463.6 V 516.8" class="dx-wire" data-grid-node="C24"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS232-3" role="button" tabindex="0" aria-label="DS232-3 · thao tác thiết bị">
    <rect x="878" y="498.56" width="160" height="36.48" fill="transparent"/>
    <circle cx="900" cy="516.8" r="11" data-eq-fill="DS232-3"/>
    <text x="922" y="520.6" font-size="13" class="circuit-label" data-label-equipment="DS232-3" data-circuit-label="name">DS232-3</text>
    <text x="883.0" y="501.79999999999995" class="dx-position circuit-label" data-eq-label="DS232-3" data-label-equipment="DS232-3" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 900 528.2 V 627" class="dx-wire" data-grid-node="T2"/>
  <circle cx="900" cy="642.2" r="18" stroke="#e71919" fill="none"/>
  <circle cx="900" cy="658.92" r="18" stroke="#00cccc" fill="none"/>
  <text x="885" y="687.8" font-size="15">U#2</text>
  <g>
    <rect x="730" y="539.6" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="735" y="552.52" font-size="12">kV</text>
    <text x="835" y="552.52" text-anchor="end" fill="#ffff00" data-grid-meter="C24:kv">—</text>
    <rect x="730" y="558.6" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="735" y="571.52" font-size="12">MW</text>
    <text x="835" y="571.52" text-anchor="end" fill="#ffff00" data-grid-meter="U2HV:p">—</text>
    <rect x="730" y="577.6" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="735" y="590.52" font-size="12">MVAr</text>
    <text x="835" y="590.52" text-anchor="end" fill="#ffff00" data-grid-meter="U2HV:q">—</text>
    <rect x="730" y="596.6" width="112" height="17.48" fill="#777" stroke="#bbb"/>
    <text x="735" y="609.52" font-size="12">Hz</text>
    <text x="835" y="609.52" text-anchor="end" fill="#ffff00" data-grid-meter="C24:frequency">—</text>
  </g>
  <path d="M 1470 463.6 V 551" class="dx-wire" data-grid-node="C25"/>
  <g class="dx-device" data-action="equipment-open" data-equipment="DS275-7" role="button" tabindex="0" aria-label="DS275-7 · thao tác thiết bị">
    <rect x="1448" y="532.76" width="160" height="36.48" fill="transparent"/>
    <circle cx="1470" cy="551" r="11" data-eq-fill="DS275-7"/>
    <text x="1492" y="554.8" font-size="13" class="circuit-label" data-label-equipment="DS275-7" data-circuit-label="name">DS275-7</text>
    <text x="1453.0" y="536.0" class="dx-position circuit-label" data-eq-label="DS275-7" data-label-equipment="DS275-7" text-anchor="end" data-circuit-label="state"/>
  </g>
  <path d="M 1470 562.4 V 653.6" class="dx-wire" data-grid-node="SB4A"/>
  <text x="1380" y="687.8" font-size="15">SÔNG BUNG 4A</text>
  <g class="station-keys-svg">
<text x="115" y="235" text-anchor="middle" font-size="16">43 O/S</text>
<g data-action="station-os" role="button" tabindex="0" aria-label="43 O/S OPS / SYMDU"><title>43 O/S · OPS / SYMDU</title><rect x="30" y="243" width="172" height="39" fill="#777" stroke="#ddd"/><rect x="34" y="247" width="79" height="31" data-station-os="OPS"/><rect x="116" y="247" width="82" height="31" data-station-os="SYMDU"/><text x="73" y="267" text-anchor="middle" style="fill:#111" font-size="14">OPS</text><text x="157" y="267" text-anchor="middle" style="fill:#111" font-size="14">SYMDU</text></g>
<text x="115" y="307" text-anchor="middle" font-size="16">43RR</text>
<g data-action="yard-authority" role="button" tabindex="0" aria-label="43RR quyền điều khiển trạm"><rect x="12" y="315" width="225" height="35" fill="#777" stroke="#ddd"/><rect x="15" y="318" width="71" height="29" data-station-owner="DA NANG"/><rect x="89" y="318" width="71" height="29" data-station-owner="A VUONG"/><rect x="163" y="318" width="71" height="29" data-station-owner="A0/A3"/><text x="50" y="337" text-anchor="middle" style="fill:#111" font-size="12">DA NANG</text><text x="124" y="337" text-anchor="middle" style="fill:#111" font-size="12">A VUONG</text><text x="198" y="337" text-anchor="middle" style="fill:#111" font-size="12">A0/A3</text></g>
<g data-action="station-sync" role="button" tabindex="0" aria-label="43-25 bộ hòa trạm AUTO MANUAL"><rect x="30" y="373" width="172" height="37" fill="#bcbcbc" stroke="#ddd"/><text x="116" y="397" text-anchor="middle" style="fill:#111" font-size="15">43-25 · AUTO / MAN</text></g></g>
  <g data-action="sb4a-source" role="button" tabindex="0" aria-label="Sông Bung 4A · nguồn và công suất mô phỏng">
    <title>SB4A · nguồn phát mô phỏng riêng; nhấp để cài đặt</title>
    <text x="1290" y="541" text-anchor="middle" fill="#ddd" font-size="12">SB4A · OTS</text>
    <rect x="1210" y="548" width="160" height="20" fill="#777" stroke="#aaa"/>
    <text x="1215" y="563" fill="#eee" font-size="12">MW</text>
    <text x="1365" y="563" text-anchor="end" fill="#ffffa6" font-size="12" data-grid-meter="SB4A:p">—</text>
    <rect x="1210" y="569" width="160" height="20" fill="#777" stroke="#aaa"/>
    <text x="1215" y="584" fill="#eee" font-size="12">MVAr</text>
    <text x="1365" y="584" text-anchor="end" fill="#ffffa6" font-size="12" data-grid-meter="SB4A:q">—</text>
    <rect x="1210" y="590" width="160" height="20" fill="#777" stroke="#aaa"/>
    <text x="1215" y="605" fill="#eee" font-size="12">kV</text>
    <text x="1365" y="605" text-anchor="end" fill="#ffffa6" font-size="12" data-grid-meter="SB4A:kv">—</text>
    <rect x="1210" y="611" width="160" height="20" fill="#777" stroke="#aaa"/>
    <text x="1215" y="626" fill="#eee" font-size="12">Hz</text>
    <text x="1365" y="626" text-anchor="end" fill="#ffffa6" font-size="12" data-grid-meter="SB4A:frequency">—</text>
  </g>
${SWITCHYARD_EARTH_LAYOUT.map(e=>earthBranchSvg({...e,labelPlacement:['ES231-34','ES232-34'].includes(e.id)?'right':'above'})).join('')}</svg>
`;}
function legacyMainSvg049(c){return `<svg class="dx-svg" viewBox="0 0 1580 800" aria-label="Main Unit Circuit động H1 H2">${[0,1].map(i=>{const n=i+1,cb=901+i,x=i*790;return `<g transform="translate(${x},0)">${dxWire('M140 40H550',i?'C24':'C21')}${dxText(170,27,'220 kV · '+(i?'C24':'C21'))}${dxWire('M350 40V120',i?'C24':'C21')}${deviceSymbol('DS23'+n+'-3',350,110)}${dxWire('M350 130V380','T'+n)+dxWire('M350 380V445','B'+cb)}<circle cx="350" cy="175" r="18" stroke="#ef1111" fill="none"/><circle cx="350" cy="198" r="18" stroke="#00bbbb" fill="none"/>${dxText(390,185,'T'+n)}${dxWire('M350 250H95V300','T'+n)+dxWire('M95 300V590','AUX'+n)}${deviceSymbol('DS94'+n+'-3',95,300)}${earthBranchSvg({id:'ES94'+n+'-38',tap:[95,350],pos:[190,350]})}${earthBranchSvg({id:'ES'+cb+'-38',tap:[350,300],pos:[495,300]})}${deviceSymbol('DS'+cb+'-3',350,380)}${deviceSymbol('CB'+cb,350,445,'CB')}${dxWire('M350 465V690','G'+n)}${dxWire('M350 520H470','G'+n)+dxWire('M470 520H650','N'+n)}${deviceSymbol('DS'+cb+'-0',470,520,'DS','DS'+cb+'-0','inline')}${earthBranchSvg({id:'ES'+cb+'-05',tap:[650,520],pos:[650,585],direction:'down'})}<circle cx="95" cy="610" r="18" stroke="#00bbbb" fill="none"/><circle cx="95" cy="633" r="18" stroke="#d6a335" fill="none"/>${dxWire('M95 650V720','MDB'+n)}${deviceSymbol('ACB-'+n,95,680,'CB')}${dxText(50,750,'400 V')}<circle cx="350" cy="710" r="29" data-machine-stroke="${i}" fill="#000" stroke-width="3"/><text x="350" y="717" text-anchor="middle" data-machine-text="${i}">H${n}</text><text x="350" y="770" text-anchor="middle" data-machine-mode="${i}"></text><foreignObject x="120" y="400" width="200" height="250"><div xmlns="http://www.w3.org/1999/xhtml" class="dx-meter-panel">${[['I','current','A',0],['U','kv','kV',2],['P','p','MW',1],['Q','q','MVAr',1],['f','frequency','Hz',2],['PF','pf','',2],['n','rpm','RPM',0]].map(([l,k,u,d])=>`<div>${l} ${c.value(k,i,d)} ${u}</div>`).join('')}</div></foreignObject><foreignObject x="415" y="665" width="280" height="90"><div xmlns="http://www.w3.org/1999/xhtml"><b>EXCITOR</b><p>${c.value('excV',i,1)} V · ${c.value('excI',i,0)} A</p>${c.nav('U#'+n+' CONTROL','control',i)}</div></foreignObject></g>`;}).join('')}</svg>`;}
const dxContextNote='<p class="reference-note">Đỏ: chạy/đóng · Xanh: dừng/mở · Vàng nhấp nháy: đang chuyển · Tím: BQ. Nhấp biểu tượng → SELECT → lệnh riêng → xác nhận. Mất đường nối cuối cùng xử lý sa thải theo mô hình OTS. CB275 và liên động DS/ES ngoài phạm vi PLC đã đọc dùng quy tắc OTS. Khởi tạo OTS: MC271/273/274/272/275 và DS275-7 đóng; Sông Bung 4A có điện. H1–C21, H2–C24 được xác nhận ở ảnh MAIN UNIT ngày 29/10/2026.</p>';
const dxCompare=key=>`<details class="dx-source"><summary>Đối chiếu HMI gốc · dữ liệu lịch sử 2023</summary><img alt="HMI nguồn ${key}" src="${window.__officialAssets[key]}" style="width:100%"></details>`;
function breakerSummary(c){return `<div class="eq-summary"><div class="panel-heading">MÁY CẮT · PHẢN HỒI ĐỘC LẬP</div><div class="eq-summary-items">${['CB271','CB273','CB274','CB272','CB275','CB901','CB902'].map(id=>`<button class="hmi-button" data-action="equipment-open" data-equipment="${id}"><b>${id}</b><span data-eq-summary="${id}"></span></button>`).join('')}</div><p class="eq-paths"><span data-grid-path="0"></span> · <span data-grid-path="1"></span></p><p class="reference-note" data-last-yard-command></p></div>`;}
function dynamicElectricalPage(c,key){return `<div class="official-page fit-electrical"><div class="dx-tools">${c.btn('QUYỀN TRẠM','yard-authority')}<span data-yard-authority></span><span class="tool-spacer"></span>${c.btn('PHẢN HỒI MC','breaker-summary')}${c.btn('ẢNH DCS','dcs-photo-reference')}${c.btn('GHI CHÚ','screen-notes')}</div>${key==='mainunit'?dynamicMainSvg(c):dynamicSwitchyardSvg(c)}${c.navigation()}</div>`;}

function legacyGeneralPage(c){const rows=[['Ổ hướng trên 1','tempUpper1'],['Ổ hướng trên 3','tempUpper3'],['Ổ hướng trên 5','tempUpper5'],['Ổ hướng trên 7','tempUpper7'],['Ổ hướng trên 9','tempUpper9'],['Ổ hướng trên 11','tempUpper11'],['Dầu ổ hướng trên','tempUpperOil'],['Ổ hướng dưới 1','tempLower1'],['Ổ hướng dưới 3','tempLower3'],['Ổ hướng dưới 5','tempLower5'],['Ổ hướng dưới 7','tempLower7'],['Ổ hướng dưới 9','tempLower9'],['Ổ hướng dưới 11','tempLower11'],['Ổ hướng dưới 13','tempLower13'],['Ổ hướng dưới 15','tempLower15'],['Dầu ổ hướng dưới','tempLowerOil'],['Ổ đỡ 1','tempThrust1'],['Ổ đỡ 2','tempThrust2'],['Stator U1','tempStator1'],['Stator V1','tempStator2'],['Stator W1','tempStator3'],['Stator U2','tempStator4'],['Stator V2','tempStator5'],['Stator W2','tempStator6'],['Lõi từ 1','tempMagnetic1'],['Lõi từ 3','tempMagnetic3'],['Lõi từ 5','tempMagnetic5'],['Không khí vào','tempAirIn'],['Không khí ra','tempAirOut'],['Nước làm mát vào','tempWaterIn'],['Nước làm mát ra','tempWaterOut']];return `<div class="official-page">${c.navigation()}<div class="dx-tools">${c.btn('143R / 43RR TRẠM','yard-authority')}<span data-yard-authority></span></div><div class="dx-general"><div>${dynamicSwitchyardSvg(c)}<div class="general-unit-strip">${[0,1].map(i=>`<div class="hmi-panel"><b>H${i+1}</b> · ${c.value('p',i,1)} MW · ${c.value('q',i,1)} Mvar · ${c.value('kv',i,2)} kV · ${c.value('rpm',i,0)} RPM · ${c.nav('CONTROL','control',i)}</div>`).join('')}</div></div><div><table class="hmi-table"><thead><tr><th>H1</th><th>TEMPERATURE MONITOR · °C</th><th>H2</th></tr></thead><tbody>${rows.filter(([,k])=>Object.hasOwn(c.plant.units[0].s.thermal.values,k)).map(([l,k])=>`<tr><td>${c.value(k,0,1)}</td><td>${l}</td><td>${c.value(k,1,1)}</td></tr>`).join('')}</tbody></table><div class="dx-mini-aux">${[0,1].map(i=>`<div class="hmi-panel"><b>H${i+1} · VAN / NƯỚC / DẦU</b><svg class="dx-svg" viewBox="0 0 700 170">${deviceSymbol('H'+(i+1)+':inlet',55,45,'valve','INLET VALVE')}${deviceSymbol('H'+(i+1)+':waterValve',350,45,'valve','COOLING WATER')}${deviceSymbol('H'+(i+1)+':pumpA',55,125,'motor','OIL PUMP A')}${deviceSymbol('H'+(i+1)+':pumpB',350,125,'motor','OIL PUMP B')}</svg>${c.value('inlet',i,0)} % · ${c.value('oil',i,2)} MPa · ${c.nav('CONTROL','control',i)}</div>`).join('')}<svg class="dx-svg" viewBox="0 0 700 80">${[0,1,2].map((n)=>deviceSymbol('NK-1MB'+(n+1),40+n*230,45,'motor')).join('')}</svg></div></div></div>${dxContextNote}${dxCompare('general')}</div>`;}
function dynamicNktPage(c){return `<div class="official-page">${c.navigation()}<div class="dx-tools">${c.btn('143R / 43RR TRẠM','yard-authority')}<span data-yard-authority></span></div><svg class="dx-svg dx-nkt" viewBox="0 0 1550 740" aria-label="Nguồn nước kỹ thuật chung và hai tổ máy"><rect x="10" y="20" width="410" height="680" class="dx-box"/>${dxText(30,48,'1 · NGUỒN NKT / LỌC SONG SONG',19)}${[0,1,2].map(i=>{const y=150+i*210;return `<path d="M45 ${y}H385" stroke="#00bdbd" stroke-width="4" fill="none"/>${dxText(25,y-45,'TỪ HẠ LƯU')}${deviceSymbol('NK-1MB'+(i+1),125,y,'motor','NK-1MB'+(i+1),'inline') }<rect x="265" y="${y-22}" width="70" height="45" class="dx-box"/>${dxText(264,y-34,'NK-1BL'+(i+1))}${dxText(270,y+6,'FILTER',12)}`;}).join('')}<rect x="440" y="20" width="290" height="680" class="dx-box"/>${dxText(460,48,'2 · XỬ LÝ / GÓP CHUNG',18)}<path d="M390 150H460V570H390M460 360H730" stroke="#00bdbd" stroke-width="4" fill="none"/><rect x="510" y="95" width="170" height="100" class="dx-box"/>${dxText(530,135,'HỆ CHÂM CLO')}${dxText(525,164,'NK-2BC1 / 2BC2',13)}${dxText(490,280,'ÁP LỰC GÓP (OTS)')}<text x="500" y="320" data-grid-meter="NKT:pressure"></text><text x="490" y="400" data-grid-meter="NKT:running"></text>${[0,1].map(i=>{const y=150+i*335;return `<rect x="755" y="${y-60}" width="770" height="300" class="dx-box"/>${dxText(775,y-30,'3 · PHỤ TẢI H'+(i+1),18)}<path d="M730 360H755V${y}H900M900 ${y}V${y+180}M900 ${y}H1470M900 ${y+60}H1470M900 ${y+120}H1470M900 ${y+180}H1470" stroke="#00bbbb" fill="none" stroke-width="3"/>${deviceSymbol('H'+(i+1)+':waterValve',825,y,'valve','VAN NƯỚC','below')}<text x="960" y="${y-5}" data-grid-meter="H${i+1}:flowUpper"></text><text x="960" y="${y+55}" data-grid-meter="H${i+1}:flowAir"></text><text x="960" y="${y+115}" data-grid-meter="H${i+1}:flowLower"></text>${dxText(960,y+175,'HƯỚNG TUABIN / CHÈN TRỤC / DẦU ĐIỀU KHIỂN',13)}`;}).join('')}</svg><p class="reference-note">Theo SĐ-VH-AV-NK-01B: ba nhánh bơm/lọc song song cấp góp chung. Chỉ có phản hồi nhánh upper/lower/air trong mô hình hiện có; không tự tạo giá trị đo cho nhánh chưa có cảm biến. Bộ châm Clo, rửa lọc và van tay được xem trên bản vẽ gốc, chưa phát lệnh tự động. Q bơm thiết kế 438,3 m³/h; H 44,4 m; 75 kW; lọc 550 m³/h, khí lọc 0,8 MPa.</p>${dxContextNote}<details><summary>Bản vẽ NKT đầy đủ · phóng to bằng cuộn ngang</summary><div class="official-viewport"><img src="${window.__officialAssets.nkt}" alt="Bản vẽ NKT đầy đủ" style="width:180%;max-width:none"></div></details></div>`;}
function waterFlowPage0419(c){
 const i=c.selected,n=i+1,tag=k=>'u:'+i+':'+k;
 const rows=(x,y,w,values,h=27)=>`<g>${values.map(([label,key,unit='',dec=1],j)=>`<rect x="${x}" y="${y+j*h}" width="${w}" height="${h}" fill="#080808" stroke="#aaa"/><text x="${x+6}" y="${y+j*h+18}" font-size="12" fill="#ddd">${label}</text><rect x="${x+w-103}" y="${y+j*h+4}" width="71" height="19" fill="#dadad2"/><text x="${x+w-36}" y="${y+j*h+19}" text-anchor="end" font-size="13" style="fill:#111" data-real-value="${key}" data-real-dec="${dec}">—</text><text x="${x+w-29}" y="${y+j*h+18}" font-size="10" fill="#ddd">${unit}</text>`).join('')}</g>`;
 const pipe=d=>`<path d="${d}" fill="none" stroke="#44b8d0" stroke-width="3"/>`;
 const text=(x,y,t,size=13)=>realText(x,y,t,size);
 const fixedValve=(x,y)=>`<path d="M${x-13} ${y-8}L${x+13} ${y+8}V${y-8}L${x-13} ${y+8}Z" fill="#000" stroke="#ddd" stroke-width="2"/>`;
 const led=(x,y,k)=>`<circle cx="${x}" cy="${y}" r="12" stroke="#ddd" stroke-width="2" data-water-flow="${i}:${k}"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="9" fill="#111">FR</text>`;
 let o=realDefs();
 o+=rows(20,16,345,[['ACTIVE POWER',tag('p'),'MW'],['REACTIVE POWER',tag('q'),'MVAr'],['POWER FACTOR',tag('pf'),''],['TURBINE SPEED',tag('rpm'),'rpm',0],['GUIDE VANE POSITION',tag('gate'),'%',1],['LOAD LIMITER POSITION',tag('gateLimit'),'%',1],['SPIRAL CASE PRESSURE','water:unverified','MPa']],27);
 o+=rows(380,16,350,[['PRESSURE BEFORE TB VALVE','water:unverified','bar'],['PRESSURE AFTER TB VALVE','water:unverified','bar'],['TAILRACE LEVEL',tag('tail'),'m',2],['SPILLWAY WATER LEVEL',tag('head'),'m',2],['VOLUME FLOW DP1','water:unverified','m³/h'],['VOLUME FLOW DP2','water:unverified','m³/h'],['COOLING FLOW (OTS)',tag('waterFlow'),'%',1]],27);
 // Three independent cooling branches, supplied by the common NKT header.
 for(const [y,k,label]of [[54,'flowAir','AIR COOLER GENERATOR'],[109,'flowUpper','UPPER GUIDE BEARING'],[255,'flowLower','THRUST & LOWER GUIDE BEARING']]){
  o+=pipe(`M750 355V${y}H1555V385`)+`<rect x="1020" y="${y-15}" width="410" height="30" fill="#080808" stroke="#ddd"/>`+text(1037,y+5,label,15)+led(970,y,k)+led(1500,y,k);
 }
 o+=realMeter(1020,145,205,[['Uab',tag('kv'),'kV',2],['Ubc',tag('kv'),'kV',2],['Uca',tag('kv'),'kV',2]],25)+realMeter(1240,145,190,[['Ia',tag('current'),'A',0],['Ib',tag('current'),'A',0],['Ic',tag('current'),'A',0]],25);
 o+=pipe('M750 355H1080V315H1150V415H1300V355H1555')+`<rect x="1090" y="312" width="100" height="110" fill="#111" stroke="#d6944f" stroke-width="3"/>`+text(1090,440,'OIL COOLER',13)+text(1090,458,'TUR. BEARING',12)+led(1335,355,'flowLower');
 o+=`<g aria-label="Trục máy phát và ổ hướng"><rect x="1228" y="275" width="24" height="250" fill="url(#water-steel-${n})" stroke="#aaa"/><rect x="1198" y="323" width="84" height="32" fill="#aaa" stroke="#eee"/><rect x="1208" y="330" width="64" height="18" fill="#d8d8d8"/><path d="M1180 490H1300" stroke="#aaa" stroke-width="16"/><circle cx="1190" cy="490" r="12" fill="#bbb" stroke="#ddd"/><circle cx="1290" cy="490" r="12" fill="#bbb" stroke="#ddd"/></g><path d="M1110 328H1172V405H1110V342H1160V392H1122" fill="none" stroke="#d49349" stroke-width="4"/>`;
 o+=fixedValve(790,355)+fixedValve(1480,355)+fixedValve(795,485)+fixedValve(1135,485);
 o+=pipe('M750 485H1120V560H1510')+pipe('M750 355V630H1555')+text(1530,411,'TO TAILRACE',12);
 // Valve body and bypass use actual unit device feedback, never the photograph values.
 o+=`<defs><linearGradient id="water-steel-${n}" x2="0" y2="1"><stop stop-color="#666"/><stop offset=".45" stop-color="#eee"/><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#666"/></linearGradient></defs>`;
 o+=pipe('M160 620H335V395H550V620H750')+pipe('M335 454H550')+`<rect x="320" y="410" width="245" height="90" rx="35" fill="url(#water-steel-${n})"/>`+text(385,382,'INLET VALVE',17);
 o+=deviceSymbol('H'+n+':inlet',442,454,'valve','INLET','inline')+pipe('M350 500V557H530V500')+deviceSymbol('H'+n+':bypass',440,557,'valve','BYPASS VALVE','inline');
 o+=pipe('M350 410V338H530V410')+deviceSymbol('H'+n+':seal',440,338,'valve','VP-4 · SEAL (OTS)','inline');
 o+=pipe('M750 630V485')+deviceSymbol('H'+n+':waterValve',750,535,'valve','COOLING WATER','inline');
 for(let j=0;j<3;j++){const y=510+j*70;o+=pipe(`M120 ${y}H290V620`)+deviceSymbol('NK-1MB'+(j+1),180,y,'motor','CWP'+(j+1),'inline')+fixedValve(260,y);}
 o+=text(20,566,'FROM',12)+text(20,584,'TAILRACE',12);
 o+=`<path d="M950 485H1080M960 592H1170" fill="none" stroke="#d58ac2" stroke-width="3" stroke-dasharray="7 4"/>`+text(840,472,'AIR OUTLET',12)+text(840,581,'FROM RECEIVER',12)+deviceSymbol('H'+n+':vent',1050,485,'valve','VP-3 · VENT (OTS)','inline')+deviceSymbol('H'+n+':air',1050,592,'valve','VP-6 · AIR (OTS)','inline');
 o+=`<path d="M1240 500V555Q1240 580 1270 580H1490" fill="none" stroke="#888" stroke-width="32"/><path d="M1240 500V555Q1240 580 1270 580H1490" fill="none" stroke="#ccc" stroke-width="18"/>`+text(1300,550,'DRAFT TUBE',14);
 for(const [x,label,names]of [[1160,'TO WASTE OIL TANK',['DOP','DP1','DP2']],[1430,'DEWATERING PIT',['DWP1','DWP2']]]){o+=`<rect x="${x}" y="655" width="220" height="45" fill="#087b9a" stroke="#ccc"/>`+text(x,648,label,11);names.forEach((name,j)=>{o+=`<circle cx="${x+30+j*65}" cy="677" r="11" fill="#00df00" data-drain-pump="${name}" stroke="#ccc"/>`+text(x+14+j*65,698,name,9);});}
 o+=pipe('M290 620V690H830')+text(840,694,'TO U#'+(n===1?2:1),12);
 return `<div class="official-page real-page"><svg class="dx-svg real-svg water-flow-svg" viewBox="0 0 1680 712" role="img" aria-label="UNIT ${n} WATER FLOW · nước làm mát và van tổ máy">${o}</svg><p class="water-note">OTS · Lưu lượng theo % mô hình; dấu — là điểm đo chưa có mô hình xác nhận. DP1/DP2 và DWP1/DWP2 luân phiên 60 s chạy, 120 s nghỉ theo thời gian mô phỏng. DOP chạy chu kỳ đơn; chưa có DI thực.</p></div>`;
}
function dynamicUnitProcessPage(c,key){if(key==='water')return waterFlowPage0419(c);const i=c.selected,n=i+1,diagrams={water:[['inlet','INLET VALVE'],['bypass','BYPASS'],['seal','SEAL'],['waterValve','COOLING WATER']],oil:[['pumpA','OIL PUMP A'],['pumpB','OIL PUMP B'],['lift','JACKING OIL'],['inlet','INLET VALVE'],['gate','GUIDE VANE']],air:[['air','DEPRESSION AIR'],['vent','VENT VALVE']]};return `<div class="official-page">${c.navigation()}<div class="dx-tools">${c.btn('143R / 43RR TRẠM','yard-authority')}<span data-yard-authority></span></div><div class="panel-heading">U#${n} · ${key==='water'?'WATER FLOW':key==='oil'?'OIL SUPPLY SYSTEM':'AIR SUPPLY SYSTEM'}</div><div class="readout-grid">${(key==='water'?[['INLET','inlet','%'],['BYPASS','bypass','%'],['ΔP INLET','deltaP','%'],['DRAFT LEVEL','draft','m']]:key==='oil'?[['CONTROL OIL','oil','MPa'],['JACKING PRESSURE (OTS)','liftPressure',''],['GUIDE VANE','gate','%'],['BEARING TEMP','temp','°C']]:[['AIR PRESSURE','air','kg/cm²'],['DRAFT LEVEL','draft','m'],['SPEED','rpm','RPM']]).map(([l,k,u])=>c.readout(l,k,u)).join('')}</div><svg class="dx-svg" viewBox="0 0 1450 430">${diagrams[key].map(([id,l],j)=>{const x=90+j*270;return `<path d="M${x} 100V260H${Math.min(x+270,1400)}" stroke="${key==='air'?'#cf7caf':key==='oil'?'#d5aa32':'#00bbbb'}" fill="none" stroke-width="4"/>${deviceSymbol('H'+n+':'+id,x,180,['pumpA','pumpB','lift'].includes(id)?'motor':'valve',l)}<text x="${x-30}" y="310" data-aux-position="H${n}:${id}"></text>`;}).join('')}</svg>${key==='water'?c.nav('NKT · NGUỒN CHUNG','nkt'):''}<p class="reference-note">Thiết bị và giá trị lấy từ engine U#${n}; lệnh tay được chặn khi trình tự tự động đang giữ quyền hoặc điều kiện công nghệ chưa đạt. Dầu dự phòng tự khởi động theo mô hình OTS hiện có. ${key==='air'?'AC1/AC2 và bốn bình khí được ghi nhận ở ảnh gốc; áp lực bình riêng chưa có dữ liệu nên không tạo số đo giả.':''}</p>${dxContextNote}${dxCompare(key)}</div>`;}
function legacyServicePage(c){return `<div class="official-page">${c.navigation()}<div class="dx-tools">${c.btn('143R / 43RR TRẠM','yard-authority')}<span data-yard-authority></span></div><svg class="dx-svg" viewBox="0 0 1500 650" aria-label="Nguồn và phân đoạn tự dùng OTS">${[['ST1',220],['ST3',730],['ST2',1240]].map(([id,x])=>`${dxText(x-50,45,'POWER SUPPLY '+id,18)}<circle cx="${x}" cy="100" r="20" fill="none" stroke="#00bbbb"/><circle cx="${x}" cy="125" r="20" fill="none" stroke="#d5aa32"/>${dxWire(`M${x} 145V250`,id)}${deviceSymbol('ACB-'+{ST1:1,ST2:2,ST3:3}[id],x,200,'CB')}`).join('')}${dxWire('M70 280H520','MDB1')}${dxWire('M570 280H960','MDB3')}${dxWire('M1040 280H1450','MDB2')}${dxText(100,310,'MDB1')}${dxText(640,310,'MDB3')}${dxText(1150,310,'MDB2')}${dxWire('M220 250V280','MDB1')}${dxWire('M730 250V280','MDB3')}${dxWire('M1240 250V280','MDB2')}${dxWire('M450 280V380H630V280','MDB1')}${deviceSymbol('ACB-7',540,380,'CB')}${dxWire('M830 280V380H1100V280','MDB2')}${deviceSymbol('ACB-8',960,380,'CB')}${dxWire('M220 280V490H1240V280','MDB1')}${deviceSymbol('ACB-BT',730,490,'CB')}${deviceSymbol('ACB-5',620,570,'CB')}${deviceSymbol('ACB-6',900,570,'CB')}${dxText(530,620,'DB1 / DB2 · nhánh phân phối OTS')}${deviceSymbol('DG',970,90,'motor','DG')}${dxText(958,95,'DG')}${dxWire('M970 120V200H730','DG')}${deviceSymbol('ACB-4',970,160,'CB')}${dxMeter(65,340,'MDB1',['kv'])}${dxMeter(1260,340,'MDB2',['kv'])}</svg><div class="row-actions">${c.btn('START DG','diesel','data-on="1"')}${c.btn('STOP DG','diesel','data-on="0"')}<span data-grid-meter="DG:state"></span></div><p class="reference-note">Sơ đồ phân đoạn đào tạo theo các nhãn ST1/ST2/ST3/DG, MDB1/2/3, ACB1–8/BT. Chặn đóng song song hai phía đang có điện; DG đủ phản hồi chạy mới có nguồn. Chuyển nguồn tự động 3 s, DG 8 s là mô hình OTS; chưa tái tạo đầy đủ CMPT_CB_SS và toàn bộ nhánh DC/UPS. Các nhánh còn lại xem trong bản gốc.</p>${dxContextNote}${dxCompare('stationservice')}</div>`;}
function unitElectricalPower(plant,index){
 const u=plant.units[index],eq=plant.equipment,cb=eq.get('CB'+(901+index));
 const exporting=cb.value===1&&!cb.bad&&eq.gridPath(index)&&!u.s.rejection.active;
 return {p:exporting&&Number.isFinite(u.s.p)?u.s.p:0,q:exporting&&Number.isFinite(u.s.q)?u.s.q:0,exporting};
}
function sb4aElectricalPower(plant){
 const eq=plant.equipment,reach=eq.connected('SB4A'),ds=eq.get('DS275-7');
 const exporting=eq.sources.SB4A&&ds.value===1&&!ds.bad&&['L1','L2'].some(k=>eq.sources[k]&&reach.has(k));
 return {p:exporting?eq.sb4a.pMW:0,q:exporting?eq.sb4a.qMvar:0,exporting};
}
function gridMeasurements(plant){
 const eq=plant.equipment,out={},unit=plant.units.map((_,i)=>unitElectricalPower(plant,i)),sb=sb4aElectricalPower(plant);
 const number=(v,d=1)=>(Math.abs(v)<1e-8?0:v).toFixed(d);
 const power=(key,p,q,kv=220)=>{out[key+':p']=number(p);out[key+':q']=number(q);out[key+':current']=number(kv>0?Math.hypot(p,q)*1000/(Math.sqrt(3)*kv):0,0);};
 for(const node of new Set(GRID_DEVICES.flatMap(d=>[d.a,d.b]).filter(Boolean))){
  const low=/^(ST|MDB|DB|MCC|AC|UPS|DG)/.test(node),live=eq.live(node),reach=eq.connected(node);
  const generator=plant.units.find((u,i)=>u.s.excited&&reach.has('G'+(i+1)));
  const reference=['L1','L2'].some(k=>eq.sources[k]&&reach.has(k))||eq.sources.SB4A&&reach.has('SB4A');
  const kv=low?.4:/^(T[12]|G[12]|B90[12]|N[12]|AUX[12])$/.test(node)?13.8:220;
  out[node+':kv']=number(live?kv:0,low?3:1);
  out[node+':frequency']=number(live?(reference?plant.frequency:(generator?.s.rpm||0)/plant.profile.rpm*50):0,2);
 }
 for(let i=0;i<2;i++){
  const key='U'+(i+1)+'HV',bus=i?'C24':'C21',actual=unit[i];
  power(key,actual.p,actual.q);out[key+':kv']=out[bus+':kv'];out[key+':frequency']=out[bus+':frequency'];
  // Legacy meter aliases retain the feeder meaning; never copy a connected-bus total.
  for(const field of ['p','q','current'])out[bus+':'+field]=out[key+':'+field];
 }
 power('SB4A',sb.p,sb.q);
 for(const line of ['L1','L2']){
  const reach=eq.connected(line),receivers=['L1','L2'].filter(k=>eq.sources[k]&&reach.has(k));
  const total=unit.reduce((a,u,i)=>reach.has('G'+(i+1))?{p:a.p+u.p,q:a.q+u.q}:a,{p:0,q:0});
  if(reach.has('SB4A')){total.p+=sb.p;total.q+=sb.q;}
  const share=eq.sources[line]&&receivers.length?1/receivers.length:0;
  power(line,total.p*share,total.q*share);
 }
 out._balance={avcP:unit.reduce((sum,u)=>sum+u.p,0),avcQ:unit.reduce((sum,u)=>sum+u.q,0),sb4aP:sb.p,sb4aQ:sb.q};
 out['NKT:pressure']=plant.cooling.header.toFixed(2)+' MPa';out['NKT:running']=plant.cooling.pumps.filter(d=>d.on).length+' / 3 BƠM CHẠY';out['DG:state']=plant.diesel?'DG RUN':'DG STOP';
 plant.units.forEach((u,i)=>{for(const [k,l]of [['flowUpper','Ổ hướng trên'],['flowLower','Ổ đỡ / hướng dưới'],['flowAir','Làm mát không khí']])out['H'+(i+1)+':'+k]=l+' · '+(!u.qualityGood?'BQ':u.s[k]?'FLOW OK':'LOW');});return out;
}
function sourceMeterSvg(x,y,w=150,fields=['p','q','kv','frequency']){
 return `<g data-action="sb4a-source" role="button" tabindex="0" aria-label="Sông Bung 4A · nguồn và công suất mô phỏng"><title>SB4A · nguồn phát mô phỏng riêng; nhấp để cài đặt</title><text x="${x+w/2}" y="${y-7}" text-anchor="middle" fill="#ddd" font-size="12">SB4A · OTS</text>${fields.map((field,i)=>`<rect x="${x}" y="${y+i*21}" width="${w}" height="20" fill="#777" stroke="#aaa"/><text x="${x+5}" y="${y+15+i*21}" fill="#eee" font-size="12">${{p:'MW',q:'MVAr',kv:'kV',frequency:'Hz'}[field]}</text><text x="${x+w-5}" y="${y+15+i*21}" text-anchor="end" fill="#ffffa6" font-size="12" data-grid-meter="SB4A:${field}">—</text>`).join('')}</g>`;
}

function updateDynamicScreens(root,plant){const eq=plant.equipment;if(!eq)return;for(const e of root.querySelectorAll('[data-eq-summary]')){const d=eq.get(e.dataset.eqSummary);e.textContent=d.bad?'BQ':d.moving?'ĐANG THAO TÁC':d.value?'ĐÓNG':'MỞ';e.style.color=equipmentColor({bad:d.bad,moving:d.moving,on:d.value===1});}
 for(const e of root.querySelectorAll('[data-grid-path]')){const i=+e.dataset.gridPath,state=eq.pathState(i);e.textContent='H'+(i+1)+' · '+(state==='CONNECTED'?'CÓ ĐƯỜNG NỐI LƯỚI':state==='UNKNOWN'?'CHƯA XÁC MINH (BQ)':'MẤT ĐƯỜNG NỐI LƯỚI');e.style.color=state==='CONNECTED'?'#ddd':state==='UNKNOWN'?'#f0f':'#ff0';}
 for(const e of root.querySelectorAll('[data-last-yard-command]')){const last=plant.events.find(v=>v.kind==='OUTPUT'&&v.area==='SWITCHYARD');e.textContent=last?'LỆNH TRẠM GẦN NHẤT: '+last.message:'Chưa phát lệnh trạm trong phiên này.';}
 for(const e of root.querySelectorAll('[data-yard-authority]'))e.textContent='143R '+(eq.remote?'REMOTE':'LOCAL')+' · 43RR '+eq.owner+' · SELECT '+(eq.selected||'NONE');for(const e of root.querySelectorAll('[data-eq-fill]')){const id=e.dataset.eqFill,d=eq.get(id),aux=eq.auxState(id),state=d?{bad:d.bad,moving:d.moving,on:d.value===1}:aux?{bad:aux.bad,moving:aux.moving,on:aux.on}:{bad:true};e.setAttribute('fill',equipmentColor(state));e.classList.toggle('dx-blink',!state.bad&&!!state.moving);}
 for(const e of root.querySelectorAll('[data-eq-label]')){const d=eq.get(e.dataset.eqLabel),a=eq.auxState(e.dataset.eqLabel);e.textContent=d?d.bad?'BQ':d.moving?'WAIT':d.value?'CLOSE':'OPEN':a?a.bad?'BQ':a.moving?'WAIT':a.on?'ON':'OFF':'?';}
 for(const e of root.querySelectorAll('[data-machine-stroke]')){const u=plant.units[+e.dataset.machineStroke];e.setAttribute('stroke',equipmentColor({bad:!u.qualityGood,on:machineRunning(u)}));}
 for(const e of root.querySelectorAll('[data-machine-text]')){const u=plant.units[+e.dataset.machineText];e.setAttribute('fill',equipmentColor({bad:!u.qualityGood,on:machineRunning(u)}));}
 for(const e of root.querySelectorAll('[data-machine-mode]')){const u=plant.units[+e.dataset.machineMode];e.textContent=!u.qualityGood?'BQ':u.s.rpm<=.1?'STOP':u.s.rejection.active?'LOAD REJECTION · '+u.s.rejection.phase.toUpperCase():u.s.rejection.completed&&u.s.stage===4?'EX · NO LOAD':u.s.breaker?u.s.workingMode+' · '+(eq.gridPath(u.unit-1)?'ON GRID':'ISOLATED / CHECK PATH'):'ROTATING · CB OPEN';}
 for(const e of root.querySelectorAll('[data-diesel-stroke]'))e.setAttribute('stroke',equipmentColor({on:plant.diesel}));
 const meters=gridMeasurements(plant);for(const e of root.querySelectorAll('[data-grid-meter]')){const key=e.dataset.gridMeter,node=key.split(':')[0],unitMeter=/^U([12])HV$/.exec(node),bad=!!unitMeter&&!plant.units[+unitMeter[1]-1].qualityGood||!plant.communicationOK||GRID_DEVICES.some(d=>(d.a===node||d.b===node)&&eq.get(d.id).bad);e.textContent=bad?'BQ':meters[key]??'—';e.classList.toggle('dx-bad',bad);}
 for(const e of root.querySelectorAll('[data-grid-node]'))e.setAttribute('stroke',eq.live(e.dataset.gridNode)?EQUIPMENT_COLORS.live:EQUIPMENT_COLORS.dead);
 for(const e of root.querySelectorAll('[data-earth-junction]')){const spec=gridSpec(e.dataset.earthJunction);e.setAttribute('fill',!plant.communicationOK?EQUIPMENT_COLORS.bad:eq.live(spec.a)?EQUIPMENT_COLORS.live:EQUIPMENT_COLORS.dead);}
 for(const e of root.querySelectorAll('[data-aux-position]')){const state=eq.auxState(e.dataset.auxPosition);e.textContent=state?state.bad?'BQ':state.moving?'MOVING':state.position.toFixed(0)+(e.dataset.auxPosition.includes('pump')?'':' %'):'—';}
 return meters;
}
function dynamicGhPage(c){const p=c.plant.penstock;return `<div class="official-page">${c.navigation()}<div class="panel-heading">INTAKE / SPILLWAY / VALVE HOUSE EQUIPMENT</div><svg class="dx-svg" viewBox="0 0 1400 420"><rect x="30" y="60" width="330" height="260" class="dx-box"/>${dxText(100,100,'INTAKE / SPILLWAY',22)}${dxText(60,150,'Cửa van: chưa có mô hình riêng')}${dxText(60,190,'Không phát lệnh thay đổi vị trí giả định')}${dxText(500,90,'VALVE HOUSE · PAUZ9',22)}<path d="M430 210H1300" stroke="#00bbbb" stroke-width="18"/>${deviceSymbol('PENSTOCK',720,210,'valve','VAN ĐƯỜNG ỐNG','inline')}<text x="630" y="290" data-aux-position="PENSTOCK"></text><foreignObject x="910" y="120" width="420" height="240"><div xmlns="http://www.w3.org/1999/xhtml" class="dx-meter-panel"><div>OPENING ${c.value('penstock',c.selected,1)} %</div><div>REMOTE ${p.remote?'YES':'NO'}</div><div>OIL READY ${p.oilOK?'YES':'NO'}</div><div>SIGNAL ${p.signal?'GOOD':'BQ'}</div></div></foreignObject></svg><div class="cols-2"><div class="hmi-panel"><h3>ĐIỀU 28 · XÁC NHẬN TẠI CHỖ</h3>${[['observer','Người giám sát đã xác minh'],['remote','PAUZ9 REMOTE'],['locked','Hai van tuabin án động'],['oilOK','Nguồn dầu bình thường']].map(([key,l])=>`<div class="signal-row"><strong>${l}</strong>${c.btn(p[key]?'YES':'NO','penstock-check',`data-key="${key}"`,p[key])}</div>`).join('')}${c.btn(p.signal?'MÔ PHỎNG MẤT TÍN HIỆU':'KHÔI PHỤC TÍN HIỆU','vh-signal')}</div><div class="hmi-panel"><h3>FORCE VH OPEN</h3><p>Chỉ khi mất tín hiệu, đã có người giám sát xác minh van thực sự mở. FORCE không làm chất lượng tín hiệu trở lại GOOD.</p>${c.btn('FORCE VH OPEN','force-vh')}${c.btn('CANCEL FORCE','clear-force')}</div></div>${dxContextNote}${dxCompare('gh')}</div>`;}


// MODULE: official
/** Official document based pages. Static documents and live simulation are explicit. */
const OFFICIAL_ROUTES=['stationoverview','switchyard','mainunit','stationcontrol','stationservice','gh','air','general','auxdiag','sydiag','gateway','nkt','ioreference'];
function officialNavigation({nav}){return `<nav class="official-nav">${[['SY CONTROL PANEL','stationcontrol'],['STATION OVERVIEW','stationoverview'],['220kV SWITCHYARD','switchyard'],['MAIN UNIT','mainunit'],['STATION SERVICE','stationservice'],['GH EQUIPMENT','gh'],['AIR SUPPLY SYSTEM','air'],['GENERAL DISPLAY','general'],['NƯỚC KỸ THUẬT','nkt']].map(([l,p])=>nav(l,p)).join('')}</nav>`;}
function officialDocument(key){const a=window.__officialAssets[key];return `<div class="document-tools"><span>ẢNH HMI GỐC · 27–28/11/2023 · Thông số và màu BQ/CF trong ảnh là lịch sử, không phải trạng thái phiên.</span><label>Phóng to <input aria-label="Phóng to sơ đồ" data-document-zoom type="range" min="100" max="240" step="20" value="100"></label></div><div class="official-viewport"><img class="official-document" src="${a}" alt="Màn hình chính thức ${key}" draggable="false"></div>`;}
function officialReferenceHTML(c,key){return `<div class="official-page">${officialNavigation(c)}<div class="official-live-strip"><b>PHIÊN MÔ PHỎNG</b>${[0,1].map(i=>`<span>H${i+1} ${c.value('p',i,1)} MW · ${c.value('q',i,1)} MVAr ${c.nav('CONTROL','control',i)}</span>`).join('')}</div>${officialDocument(key)}<p class="reference-note">Bố cục và thiết bị theo REQUIREDED_SNAP. Các thiết bị trạm chưa có thân logic CMPT/đủ phản hồi chỉ được xem trong tài liệu; không phát lệnh đóng cắt giả định.</p></div>`;}
const officialLive=(key,label)=>`<span data-official-state="${key}">${label||'—'}</span>`;
function officialMainHTML(c){const {value,nav}=c;
 const half=i=>{const n=i+1,cb=901+i;return `<g transform="translate(${i*790},0)"><path d="M140 48H490" stroke="#ba1919" stroke-width="4"/><text x="170" y="31">220 kV · ${i?'C24*':'C21'}</text><path d="M340 48V145" stroke="#ba1919" stroke-width="3"/><circle cx="340" cy="105" r="11" fill="#788790"/><text x="360" y="109">DS23${n}-3</text><circle cx="340" cy="165" r="17" fill="none" stroke="#ba1919"/><circle cx="340" cy="185" r="17" fill="none" stroke="#00cccc"/><text x="375" y="180">T${n}</text><path d="M340 203V630M340 225H90V530M340 275H470M340 460H595" stroke="#00bbbb" stroke-width="3" fill="none"/><circle cx="470" cy="275" r="10" fill="#788790"/><text x="475" y="253">ES${cb}-38</text><path d="M480 275h30m-5-17v34m9-26v17m8-13v9" stroke="#ccc" fill="none"/><circle cx="340" cy="350" r="11" fill="#788790"/><text x="365" y="354">DS${cb}-3 · CHƯA MÔ PHỎNG</text><rect data-official-cb="${i}" x="328" y="402" width="24" height="28" fill="#555" stroke="#ddd"/><text x="370" y="421">CB${cb}</text><circle cx="420" cy="460" r="10" fill="#788790"/><text x="430" y="444">DS${cb}-0</text><circle cx="595" cy="495" r="10" fill="#788790"/><path d="M595 460v90m-20 0h40m-33 7h26m-19 7h12" stroke="#ccc" fill="none"/><text x="615" y="500">ES${cb}-05</text><circle cx="90" cy="275" r="10" fill="#788790"/><text x="110" y="280">DS94${n}-3</text><path d="M90 330h85m-5-15v30m9-26v18m7-14v10" stroke="#ccc"/><circle cx="140" cy="330" r="10" fill="#788790"/><text x="98" y="315">ES94${n}-38</text><circle cx="90" cy="540" r="17" fill="none" stroke="#00bbbb"/><circle cx="90" cy="560" r="17" fill="none" stroke="#d6a335"/><path d="M90 578v65m-55 0h110" stroke="#d6a335"/><rect x="79" y="597" width="22" height="23" fill="#788790"/><text x="112" y="615">ACB-${n}</text><text x="45" y="665">400 V</text><circle cx="340" cy="650" r="27" fill="#000" stroke="#00d000" stroke-width="2"/><text x="340" y="657" text-anchor="middle">H${n}</text><text x="390" y="650">EXCITOR</text><foreignObject x="95" y="363" width="215" height="220"><div xmlns="http://www.w3.org/1999/xhtml" class="official-meter-stack">${[['Ia','current','A',0],['Uab','kv','kV',2],['P','p','MW',1],['Q','q','MVAr',1],['PF','pf','cosφ',2],['n','rpm','RPM',0]].map(([l,k,u,d])=>`<div>${l} ${value(k,i,d)} ${u}</div>`).join('')}</div></foreignObject><foreignObject x="395" y="669" width="240" height="60"><div xmlns="http://www.w3.org/1999/xhtml">${value('excV',i,1)} V · ${value('excI',i,0)} A</div></foreignObject><foreignObject x="370" y="550" width="350" height="70"><div xmlns="http://www.w3.org/1999/xhtml">${nav('U#'+n+' CONTROL PANEL','control',i)}<p>CB: ${officialLive('cb'+i)}</p></div></foreignObject></g>`;};
 return `<div class="official-page">${officialNavigation(c)}<svg class="official-main svg-diagram" viewBox="0 0 1580 740" aria-label="Main Unit Circuit H1 H2">${[0,1].map(half).join('')}</svg><p class="reference-note">Sơ đồ dựng theo MAIN_UNIT_CIRCUIT. CB901/902 và thông số tổ máy đọc trực tiếp engine; MC đóng đỏ, mở xanh. Thiết bị màu xám chưa có phản hồi mô phỏng. *Ảnh Main Unit ghi C21 ở H2, ảnh Switchyard ghi C24; giữ chú thích khác biệt, chưa tự kết luận đấu nối thực nạp.</p><details><summary>Đối chiếu màn hình gốc</summary>${officialDocument('mainunit')}</details></div>`;
}
function officialStationHTML(c){const {plant,selected,btn,value,readout,nav}=c,st=plant.units[selected].s;
 const selector=(label,key)=>`<div class="station-selector"><label>${label}</label>${btn('NOT USE','switch',`data-key="${key}" data-value="NOT USE"`,st.switches[key]==='NOT USE')}${btn('USE','switch',`data-key="${key}" data-value="USE"`,st.switches[key]==='USE')}</div>`;
 return `<div class="official-page">${officialNavigation(c)}<fieldset class="station-field"><legend>SWITCHYARD CONTROL</legend><div class="station-row"><div>${btn('143R / 43RR TRẠM','yard-authority')} <span data-yard-authority></span></div><div>43RR-1/2 ${btn('A0/A3','switch','data-key="rr1" data-value="A0/A3"',st.switches.rr1==='A0/A3')}${btn('AV/DN','switch','data-key="rr1" data-value="AV/DN"',st.switches.rr1==='AV/DN')}${btn('DA NANG','switch','data-key="rr2" data-value="DA NANG"',st.switches.rr2==='DA NANG')}${btn('A VUONG','switch','data-key="rr2" data-value="A VUONG"',st.switches.rr2==='A VUONG')}</div></div><small>Khóa 43RR trên trang này điều khiển quyền tổ máy H${selected+1} theo logic đã có; quyền đóng cắt thiết bị trạm chưa mô phỏng.</small></fieldset><fieldset class="station-field"><legend>STATION SERVICE CONTROL</legend><div class="station-row"><span>343RR · A VUONG / DA NANG</span><span>343ASR · NOT USE / USE</span></div><p class="unknown-state">Đã xác định khóa trên ảnh; chưa có đủ logic để cho phép chuyển nguồn bằng các khóa này.</p></fieldset><div class="station-joint">${readout('JOINT CONTROL SP ACT PWR','pJointSet','MW','jointP',2)}${readout('TOTAL ACT PWR','pTotal','MW')}${readout('JOINT CONTROL SP REACT PWR','qJointSet','MVAr','jointQ',2)}<div class="hmi-readout"><label>TOTAL REACT PWR</label><div>${officialLive('qTotal')} MVAr</div></div></div><div class="cols-2">${[0,1].map(i=>`<fieldset class="station-field"><legend>U#${i+1} CONTROL MODE</legend><div class="row-actions">${btn('CHỌN H'+(i+1),'station-unit',`data-unit="${i}"`,i===selected)}${nav('CONTROL PANEL','control',i)}</div>${i===selected?`<div class="station-row">43R ${['REMOTE','LOCAL AUTO','TEST'].map(m=>btn(m,'mode',`data-value="${m}"`,st.mode===m)).join('')}</div>${selector('ALR INDIVIDUAL','alr')}${selector('ALR JOINT','jlr')}${selector('AQR INDIVIDUAL','aqr')}${selector('AQR JOINT','jqr')}<div class="cols-2">${readout('ALR SET POINT','alrDisplay','MW','p',2)}${readout('AQR SET POINT','aqrDisplay','MVAr','q',2)}</div>`:`<p>43R: ${plant.units[i].s.mode}</p><p>ALR: ${plant.units[i].s.switches.alr} · JLR: ${plant.units[i].s.switches.jlr}</p><p>AQR: ${plant.units[i].s.switches.aqr} · JQR: ${plant.units[i].s.switches.jqr}</p><p>Chọn H${i+1} để thao tác khóa và giá trị đặt.</p>`}<div class="station-row"><span>ACTIVE POWER ${value('p',i,2)} MW</span><span>REACTIVE POWER ${value('q',i,2)} MVAr</span></div></fieldset>`).join('')}</div><p class="reference-note">Theo SWITCHYARD_STATION_CNT_PNL. USE vàng; P xanh khi đủ Permit; chọn → xác nhận; giá trị đặt dùng chung engine với Unit Control. Nhánh joint giữ giới hạn xác minh SH74 của phiên bản trước.</p><details><summary>Đối chiếu màn hình gốc</summary>${officialDocument('stationcontrol')}</details></div>`;
}
function officialNktHTML(c){return `<div class="official-page">${officialNavigation(c)}<div class="official-live-strip"><b>NKT · PHIÊN MÔ PHỎNG</b>${[0,1,2].map(i=>`<span>NK-1MB${i+1}: ${officialLive('pump'+i)}</span>`).join('')}<span>Góp: ${officialLive('header')} MPa (OTS)</span></div><div class="cols-2">${[0,1].map(i=>`<div class="hmi-panel">H${i+1} · Van nước ${officialLive('water'+i)} · Hướng trên ${officialLive('upper'+i)} · Hướng dưới ${officialLive('lower'+i)} · Không khí ${officialLive('air'+i)}</div>`).join('')}</div><div class="document-tools"><strong>SĐ-VH-AV-NK-01B · 03/03/2009</strong><label>Phóng to <input aria-label="Phóng to sơ đồ NKT" data-document-zoom type="range" min="100" max="300" step="20" value="100"></label></div><div class="official-viewport nkt-viewport"><img class="official-document" src="${window.__officialAssets.nkt}" alt="Sơ đồ vận hành hệ thống nước kỹ thuật A Vương: nguồn, xử lý phân phối, phụ tải" draggable="false"></div><p class="reference-note">Ba nhánh bơm NK-1MB1/2/3 và bộ lọc song song cấp góp chung cho hai tổ. Trên bản vẽ: Q bơm 438,3 m³/h; H 44,4 m; 75 kW; bộ lọc tự động 550 m³/h; khí phục vụ lọc 0,8 MPa. Đây là thông số thiết kế, không phải ngưỡng liên động. Thuật toán chọn bơm/dự phòng/rửa lọc và timer chưa được xác minh. Sơ đồ gốc là tài liệu tĩnh; dải trạng thái phía trên lấy từ mô hình.</p>${c.nav('WATER FLOW U#'+(c.selected+1),'water',c.selected)}</div>`;}
function officialLiveState(plant){const out={qTotal:plant.units.reduce((a,u)=>a+u.s.q,0).toFixed(2),header:plant.cooling.header.toFixed(2)};plant.cooling.pumps.forEach((d,i)=>out['pump'+i]=d.failed?'FAIL':d.moving?'WAIT':d.on?'RUN':'STOP');plant.units.forEach((u,i)=>{out['cb'+i]=!u.qualityGood?'BQ':u.s.breaker?'CLOSE':'OPEN';out['water'+i]=u.devices.waterValve.value.toFixed(0)+'%';for(const [key,field]of [['upper','flowUpper'],['lower','flowLower'],['air','flowAir']])out[key+i]=!u.qualityGood?'BQ':u.s[field]?'FLOW OK':'LOW';});return out;}
function officialIoRows(reference,{peer='ALL',query=''}={}){const q=query.trim().toLowerCase();return reference.points.filter(p=>(peer==='ALL'||p.variant===peer)&&(!q||[p.sheet,p.ioa,p.tag,p.description,p.device].join(' ').toLowerCase().includes(q)));}
function officialSignalReference(reference,key,index){const suffix={current:'0001',kv:'0004',p:'0007',q:'0008'}[key];if(!suffix)return null;const tag=`U${index+1}H_CAO${suffix}_OUT_S`;return reference.points.find(p=>p.variant==='A0'&&p.family==='measurement'&&p.tag===tag)||null;}


// MODULE: thermal-data
/** Generated from screened June observations; provenance in assets/thermal-reference.json. */
const THERMAL_REFERENCE={"id":"AVC-THERMAL-JUNE-2026-v1","source_archive":"THÁNG 6.zip","source_sha256":"9b675d7d27db4596b70cd20bf45ae4ca4a2533764ea50daafb65acf2c4c02def","recorded_unit":"degC","source_file_count":184,"date_excluded_count":21,"minimum_bin_samples":5,"basis":"Screened hourly load stability: P>5.25 MW now and previous hour, |delta P|<=5 MW, mechanical n recorded; not proof of thermal steady state.","nominal_environment":{"ambient_C":28,"cooling_water_C":24,"ambient_basis":"OTS assumption; not identified from missing ambient channel","water_basis":"recorded water inlet commonly 24 degC"},"units":{"H1":{"stable_hourly_samples":182,"generating_samples":225,"groups":{"stator1":{"metric":"electrical/H1/Nhiệt độ cuộn dây Stator - A1","label":"Nhiệt độ cuộn dây Stator - A1","source_unit":"degC","anchors":[{"p":70.1,"temperature":76.7,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"O18","date":"2026-06-02","hour":10,"value":76.7}},{"p":76.1,"temperature":79.65,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"O20","date":"2026-06-01","hour":12,"value":80.4}},{"p":80.2,"temperature":82.9,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F011","cell":"O28","date":"2026-06-02","hour":20,"value":82.9}},{"p":85.1,"temperature":86.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"O31","date":"2026-06-01","hour":23,"value":86.0}},{"p":94.2,"temperature":92.6,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F147","cell":"O30","date":"2026-06-19","hour":22,"value":92.6}}]},"stator2":{"metric":"electrical/H1/Nhiệt độ cuộn dây Stator - B1","label":"Nhiệt độ cuộn dây Stator - B1","source_unit":"degC","anchors":[{"p":70.1,"temperature":77.3,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F059","cell":"P22","date":"2026-06-08","hour":14,"value":77.3}},{"p":76.1,"temperature":80.45,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"P20","date":"2026-06-01","hour":12,"value":81.5}},{"p":80.2,"temperature":83.2,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F011","cell":"P27","date":"2026-06-02","hour":19,"value":83.2}},{"p":85.1,"temperature":86.8,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"P31","date":"2026-06-01","hour":23,"value":86.8}},{"p":94.2,"temperature":92.7,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"P27","date":"2026-06-17","hour":19,"value":92.7}}]},"stator3":{"metric":"electrical/H1/Nhiệt độ cuộn dây Stator - C1","label":"Nhiệt độ cuộn dây Stator - C1","source_unit":"degC","anchors":[{"p":70.1,"temperature":75.5,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"Q22","date":"2026-06-02","hour":14,"value":75.5}},{"p":76.1,"temperature":78.35,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"Q20","date":"2026-06-01","hour":12,"value":79.1}},{"p":80.2,"temperature":81.6,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F075","cell":"Q28","date":"2026-06-10","hour":20,"value":81.6}},{"p":85.1,"temperature":84.4,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"Q27","date":"2026-06-01","hour":19,"value":84.4}},{"p":94.2,"temperature":90.9,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F147","cell":"Q30","date":"2026-06-19","hour":22,"value":90.9}}]},"stator4":{"metric":"electrical/H1/Nhiệt độ cuộn dây Stator - A2","label":"Nhiệt độ cuộn dây Stator - A2","source_unit":"degC","anchors":[{"p":70.1,"temperature":74.3,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"R22","date":"2026-06-02","hour":14,"value":74.3}},{"p":76.1,"temperature":77.15,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"R20","date":"2026-06-01","hour":12,"value":77.9}},{"p":80.2,"temperature":80.4,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F075","cell":"R28","date":"2026-06-10","hour":20,"value":80.4}},{"p":85.1,"temperature":83.3,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"R31","date":"2026-06-01","hour":23,"value":83.3}},{"p":94.2,"temperature":89.6,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F147","cell":"R30","date":"2026-06-19","hour":22,"value":89.6}}]},"stator5":{"metric":"electrical/H1/Nhiệt độ cuộn dây Stator - B2","label":"Nhiệt độ cuộn dây Stator - B2","source_unit":"degC","anchors":[{"p":70.1,"temperature":77.9,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F059","cell":"S24","date":"2026-06-08","hour":16,"value":77.9}},{"p":76.1,"temperature":81.25,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"S20","date":"2026-06-01","hour":12,"value":82.4}},{"p":80.2,"temperature":84.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F011","cell":"S26","date":"2026-06-02","hour":18,"value":84.0}},{"p":85.1,"temperature":87.7,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"S27","date":"2026-06-01","hour":19,"value":87.7}},{"p":94.2,"temperature":94.2,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F147","cell":"S30","date":"2026-06-19","hour":22,"value":94.2}}]},"stator6":{"metric":"electrical/H1/Nhiệt độ cuộn dây Stator - C2","label":"Nhiệt độ cuộn dây Stator - C2","source_unit":"degC","anchors":[{"p":70.1,"temperature":75.8,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"T22","date":"2026-06-02","hour":14,"value":75.8}},{"p":76.1,"temperature":78.65,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"T20","date":"2026-06-01","hour":12,"value":79.4}},{"p":80.2,"temperature":81.8,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F172","cell":"T25","date":"2026-06-22","hour":17,"value":81.8}},{"p":85.1,"temperature":84.7,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"T27","date":"2026-06-01","hour":19,"value":84.7}},{"p":94.2,"temperature":91.2,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F147","cell":"T30","date":"2026-06-19","hour":22,"value":91.2}}]},"core1":{"metric":"electrical/H1/Nhiệt độ lõi thép - Số 1","label":"Nhiệt độ lõi thép - Số 1","source_unit":"degC","anchors":[{"p":70.1,"temperature":69.7,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"U18","date":"2026-06-02","hour":10,"value":69.7}},{"p":76.1,"temperature":71.2,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F027","cell":"U25","date":"2026-06-04","hour":17,"value":71.1}},{"p":80.2,"temperature":72.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F027","cell":"U29","date":"2026-06-04","hour":21,"value":72.0}},{"p":85.1,"temperature":73.7,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"U27","date":"2026-06-01","hour":19,"value":73.7}},{"p":94.2,"temperature":76.2,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F139","cell":"U30","date":"2026-06-18","hour":22,"value":76.2}}]},"core2":{"metric":"electrical/H1/Nhiệt độ lõi thép - Số 2","label":"Nhiệt độ lõi thép - Số 2","source_unit":"degC","anchors":[{"p":70.1,"temperature":69.5,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"V23","date":"2026-06-02","hour":15,"value":69.5}},{"p":76.1,"temperature":71.1,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F027","cell":"V25","date":"2026-06-04","hour":17,"value":71.0}},{"p":80.2,"temperature":71.9,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F011","cell":"V30","date":"2026-06-02","hour":22,"value":71.9}},{"p":85.1,"temperature":73.7,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"V27","date":"2026-06-01","hour":19,"value":73.7}},{"p":94.2,"temperature":76.2,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F139","cell":"V30","date":"2026-06-18","hour":22,"value":76.2}}]},"core3":{"metric":"electrical/H1/Nhiệt độ lõi thép - Số 3","label":"Nhiệt độ lõi thép - Số 3","source_unit":"degC","anchors":[{"p":70.1,"temperature":69.3,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"W18","date":"2026-06-02","hour":10,"value":69.3}},{"p":76.1,"temperature":70.7,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F027","cell":"W25","date":"2026-06-04","hour":17,"value":70.6}},{"p":80.2,"temperature":71.6,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F027","cell":"W29","date":"2026-06-04","hour":21,"value":71.6}},{"p":85.1,"temperature":73.2,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"W27","date":"2026-06-01","hour":19,"value":73.2}},{"p":94.2,"temperature":75.8,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"W27","date":"2026-06-17","hour":19,"value":75.8}}]},"core4":{"metric":"electrical/H1/Nhiệt độ lõi thép - Số 4","label":"Nhiệt độ lõi thép - Số 4","source_unit":"degC","anchors":[{"p":70.1,"temperature":69.6,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"X23","date":"2026-06-02","hour":15,"value":69.6}},{"p":76.1,"temperature":71.2,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F027","cell":"X25","date":"2026-06-04","hour":17,"value":71.1}},{"p":80.2,"temperature":71.9,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F011","cell":"X30","date":"2026-06-02","hour":22,"value":71.9}},{"p":85.1,"temperature":73.7,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"X27","date":"2026-06-01","hour":19,"value":73.7}},{"p":94.2,"temperature":76.2,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F147","cell":"X30","date":"2026-06-19","hour":22,"value":76.2}}]},"core5":{"metric":"electrical/H1/Nhiệt độ lõi thép - Số 5","label":"Nhiệt độ lõi thép - Số 5","source_unit":"degC","anchors":[{"p":70.1,"temperature":68.8,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"Y23","date":"2026-06-02","hour":15,"value":68.8}},{"p":76.1,"temperature":70.3,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"Y20","date":"2026-06-01","hour":12,"value":70.4}},{"p":80.2,"temperature":71.2,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F027","cell":"Y29","date":"2026-06-04","hour":21,"value":71.2}},{"p":85.1,"temperature":72.8,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"Y27","date":"2026-06-01","hour":19,"value":72.8}},{"p":94.2,"temperature":75.4,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"Y27","date":"2026-06-17","hour":19,"value":75.4}}]},"core6":{"metric":"electrical/H1/Nhiệt độ lõi thép - Số 6","label":"Nhiệt độ lõi thép - Số 6","source_unit":"degC","anchors":[{"p":70.1,"temperature":69.5,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"Z23","date":"2026-06-02","hour":15,"value":69.5}},{"p":76.1,"temperature":71.15,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"Z20","date":"2026-06-01","hour":12,"value":71.2}},{"p":80.2,"temperature":72.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F027","cell":"Z29","date":"2026-06-04","hour":21,"value":72.0}},{"p":85.1,"temperature":73.7,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"Z27","date":"2026-06-01","hour":19,"value":73.7}},{"p":94.2,"temperature":76.2,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F139","cell":"Z30","date":"2026-06-18","hour":22,"value":76.2}}]},"upperMetal":{"metric":"electrical/H1/Nhiệt độ các ổ, gió - SM OHT","label":"Nhiệt độ các ổ, gió - SM OHT","source_unit":"degC","anchors":[{"p":70.1,"temperature":43.5,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F059","cell":"AE32","date":"2026-06-08","hour":24,"value":43.5}},{"p":76.1,"temperature":43.1,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F011","cell":"AE21","date":"2026-06-02","hour":13,"value":42.8}},{"p":80.2,"temperature":43.9,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F067","cell":"AE28","date":"2026-06-09","hour":20,"value":43.9}},{"p":85.1,"temperature":43.3,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"AE30","date":"2026-06-01","hour":22,"value":43.3}},{"p":94.2,"temperature":44.1,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"AE26","date":"2026-06-17","hour":18,"value":44.1}}]},"upperOil":{"metric":"electrical/H1/Nhiệt độ các ổ, gió - Dầu OHT","label":"Nhiệt độ các ổ, gió - Dầu OHT","source_unit":"degC","anchors":[{"p":70.1,"temperature":32.7,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F027","cell":"AF20","date":"2026-06-04","hour":12,"value":32.7}},{"p":76.1,"temperature":32.65,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F011","cell":"AF29","date":"2026-06-02","hour":21,"value":33.2}},{"p":80.2,"temperature":33.6,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F067","cell":"AF26","date":"2026-06-09","hour":18,"value":33.6}},{"p":85.1,"temperature":33.3,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"AF31","date":"2026-06-01","hour":23,"value":33.3}},{"p":94.2,"temperature":34.7,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F139","cell":"AF29","date":"2026-06-18","hour":21,"value":34.7}}]},"lowerMetal":{"metric":"electrical/H1/Nhiệt độ các ổ, gió - SM OHD","label":"Nhiệt độ các ổ, gió - SM OHD","source_unit":"degC","anchors":[{"p":70.1,"temperature":52.0,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"AA18","date":"2026-06-02","hour":10,"value":52.0}},{"p":76.1,"temperature":52.0,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"AA20","date":"2026-06-01","hour":12,"value":52.0}},{"p":80.2,"temperature":52.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F004","cell":"AA21","date":"2026-06-01","hour":13,"value":52.0}},{"p":85.1,"temperature":52.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"AA18","date":"2026-06-01","hour":10,"value":52.0}},{"p":94.2,"temperature":52.0,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"AA25","date":"2026-06-17","hour":17,"value":52.0}}]},"lowerOil":{"metric":"electrical/H1/Nhiệt độ các ổ, gió - Dầu OHD","label":"Nhiệt độ các ổ, gió - Dầu OHD","source_unit":"degC","anchors":[{"p":70.1,"temperature":45.0,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"AC18","date":"2026-06-02","hour":10,"value":45.0}},{"p":76.1,"temperature":45.0,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"AC20","date":"2026-06-01","hour":12,"value":45.0}},{"p":80.2,"temperature":45.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F004","cell":"AC21","date":"2026-06-01","hour":13,"value":45.0}},{"p":85.1,"temperature":45.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"AC18","date":"2026-06-01","hour":10,"value":45.0}},{"p":94.2,"temperature":45.0,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"AC25","date":"2026-06-17","hour":17,"value":45.0}}]},"thrustMetal":{"metric":"electrical/H1/Nhiệt độ các ổ, gió - SM OD","label":"Nhiệt độ các ổ, gió - SM OD","source_unit":"degC","anchors":[{"p":70.1,"temperature":60.9,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F075","cell":"AB22","date":"2026-06-10","hour":14,"value":60.9}},{"p":76.1,"temperature":60.65,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F019","cell":"AB31","date":"2026-06-03","hour":23,"value":61.2}},{"p":80.2,"temperature":62.2,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F067","cell":"AB26","date":"2026-06-09","hour":18,"value":62.2}},{"p":85.1,"temperature":61.9,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"AB31","date":"2026-06-01","hour":23,"value":61.9}},{"p":94.2,"temperature":63.1,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"AB29","date":"2026-06-17","hour":21,"value":63.1}}]},"turbineMetal":{"metric":"mechanical/H1/Tuabin - Nhiệt độ sécmăng ÔHTB","label":"Tuabin - Nhiệt độ sécmăng ÔHTB","source_unit":"degC","anchors":[{"p":70.1,"temperature":56.8,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F065","cell":"I22","date":"2026-06-09","hour":14,"value":56.8}},{"p":76.1,"temperature":56.3,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F002","cell":"I20","date":"2026-06-01","hour":12,"value":56.3}},{"p":80.2,"temperature":57.3,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F065","cell":"I26","date":"2026-06-09","hour":18,"value":57.3}},{"p":85.1,"temperature":57.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F002","cell":"I31","date":"2026-06-01","hour":23,"value":57.0}},{"p":94.2,"temperature":57.5,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F129","cell":"I27","date":"2026-06-17","hour":19,"value":57.5}}]},"turbineOil":{"metric":"mechanical/H1/Tuabin - Nhiệt độ dầu ÔHTB","label":"Tuabin - Nhiệt độ dầu ÔHTB","source_unit":"degC","anchors":[{"p":70.1,"temperature":57.0,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F057","cell":"J18","date":"2026-06-08","hour":10,"value":57.0}},{"p":76.1,"temperature":56.0,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F002","cell":"J20","date":"2026-06-01","hour":12,"value":56.0}},{"p":80.2,"temperature":57.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F065","cell":"J25","date":"2026-06-09","hour":17,"value":57.0}},{"p":85.1,"temperature":57.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F002","cell":"J27","date":"2026-06-01","hour":19,"value":57.0}},{"p":94.2,"temperature":58.0,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F129","cell":"J25","date":"2026-06-17","hour":17,"value":58.0}}]},"seal":{"metric":"mechanical/H1/Tuabin - Nhiệt độ chèn trục TB","label":"Tuabin - Nhiệt độ chèn trục TB","source_unit":"degC","anchors":[{"p":70.1,"temperature":24.9,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F057","cell":"L32","date":"2026-06-08","hour":24,"value":24.9}},{"p":76.1,"temperature":24.4,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F009","cell":"L21","date":"2026-06-02","hour":13,"value":24.4}},{"p":80.2,"temperature":25.8,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F065","cell":"L25","date":"2026-06-09","hour":17,"value":25.8}},{"p":85.1,"temperature":25.1,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F002","cell":"L27","date":"2026-06-01","hour":19,"value":25.1}},{"p":94.2,"temperature":26.9,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F129","cell":"L29","date":"2026-06-17","hour":21,"value":26.9}}]},"airIn":{"metric":"electrical/H1/Nhiệt độ các ổ, gió - Gió vào","label":"Nhiệt độ các ổ, gió - Gió vào","source_unit":"degC","anchors":[{"p":70.1,"temperature":53.7,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"AG18","date":"2026-06-02","hour":10,"value":53.7}},{"p":76.1,"temperature":54.95,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F019","cell":"AG31","date":"2026-06-03","hour":23,"value":55.4}},{"p":80.2,"temperature":56.3,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F075","cell":"AG27","date":"2026-06-10","hour":19,"value":56.3}},{"p":85.1,"temperature":57.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"AG31","date":"2026-06-01","hour":23,"value":57.0}},{"p":94.2,"temperature":60.0,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"AG27","date":"2026-06-17","hour":19,"value":60.0}}]},"airOut":{"metric":"electrical/H1/Nhiệt độ các ổ, gió - Gió ra","label":"Nhiệt độ các ổ, gió - Gió ra","source_unit":"degC","anchors":[{"p":70.1,"temperature":34.1,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F075","cell":"AH23","date":"2026-06-10","hour":15,"value":34.1}},{"p":76.1,"temperature":34.05,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F004","cell":"AH20","date":"2026-06-01","hour":12,"value":33.4}},{"p":80.2,"temperature":35.5,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F067","cell":"AH26","date":"2026-06-09","hour":18,"value":35.5}},{"p":85.1,"temperature":35.4,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"AH31","date":"2026-06-01","hour":23,"value":35.4}},{"p":94.2,"temperature":37.3,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"AH27","date":"2026-06-17","hour":19,"value":37.3}}]},"waterIn":{"metric":"mechanical/H1/NKT - Nhiệt độ nước đầu vào ống góp tổ máy","label":"NKT - Nhiệt độ nước đầu vào ống góp tổ máy","source_unit":"degC","anchors":[{"p":70.1,"temperature":24.0,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F009","cell":"Q18","date":"2026-06-02","hour":10,"value":24.0}},{"p":76.1,"temperature":24.0,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F002","cell":"Q20","date":"2026-06-01","hour":12,"value":24.0}},{"p":80.2,"temperature":24.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F002","cell":"Q21","date":"2026-06-01","hour":13,"value":24.0}},{"p":85.1,"temperature":24.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F002","cell":"Q18","date":"2026-06-01","hour":10,"value":24.0}},{"p":94.2,"temperature":24.0,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F129","cell":"Q25","date":"2026-06-17","hour":17,"value":24.0}}]},"waterOut":{"metric":"mechanical/H1/NKT - Nhiệt độ nước ra bộ làm mát gió MP","label":"NKT - Nhiệt độ nước ra bộ làm mát gió MP","source_unit":"degC","anchors":[{"p":70.1,"temperature":27.0,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F009","cell":"R18","date":"2026-06-02","hour":10,"value":27.0}},{"p":76.1,"temperature":27.0,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F002","cell":"R20","date":"2026-06-01","hour":12,"value":27.0}},{"p":80.2,"temperature":27.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F002","cell":"R21","date":"2026-06-01","hour":13,"value":27.0}},{"p":85.1,"temperature":27.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F002","cell":"R18","date":"2026-06-01","hour":10,"value":27.0}},{"p":94.2,"temperature":27.0,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F129","cell":"R25","date":"2026-06-17","hour":17,"value":27.0}}]},"controlOil":{"metric":"mechanical/H1/DauDK - Nhiệt độ dầu thùng dầu","label":"DauDK - Nhiệt độ dầu thùng dầu","source_unit":"degC","anchors":[{"p":70.1,"temperature":35.0,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F009","cell":"AI18","date":"2026-06-02","hour":10,"value":35.0}},{"p":76.1,"temperature":35.0,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F002","cell":"AI20","date":"2026-06-01","hour":12,"value":35.0}},{"p":80.2,"temperature":35.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F002","cell":"AI21","date":"2026-06-01","hour":13,"value":35.0}},{"p":85.1,"temperature":35.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F002","cell":"AI18","date":"2026-06-01","hour":10,"value":35.0}},{"p":94.2,"temperature":35.0,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F129","cell":"AI25","date":"2026-06-17","hour":17,"value":35.0}}]},"transformerCoil":{"metric":"electrical/H1/MBA T1 - Nhiệt độ cuộn dây","label":"MBA T1 - Nhiệt độ cuộn dây","source_unit":"degC","anchors":[{"p":70.1,"temperature":60.0,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F011","cell":"AL19","date":"2026-06-02","hour":11,"value":60.0}},{"p":76.1,"temperature":66.0,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F011","cell":"AL29","date":"2026-06-02","hour":21,"value":68.0}},{"p":80.2,"temperature":68.0,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F011","cell":"AL25","date":"2026-06-02","hour":17,"value":68.0}},{"p":85.1,"temperature":70.0,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F004","cell":"AL18","date":"2026-06-01","hour":10,"value":70.0}},{"p":94.2,"temperature":75.0,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"AL26","date":"2026-06-17","hour":18,"value":75.0}}]},"transformerOil":{"metric":"electrical/H1/MBA T1 - Nhiệt độ dầu","label":"MBA T1 - Nhiệt độ dầu","source_unit":"degC","anchors":[{"p":70.1,"temperature":57.7,"n":107,"p_bin":[67.5,72.5],"q_squared":36.0,"source_median_nearest":{"file":"F083","cell":"AM22","date":"2026-06-11","hour":14,"value":57.7}},{"p":76.1,"temperature":62.1,"n":6,"p_bin":[72.5,77.5],"q_squared":57.625,"source_median_nearest":{"file":"F011","cell":"AM21","date":"2026-06-02","hour":13,"value":62.1}},{"p":80.2,"temperature":63.3,"n":41,"p_bin":[77.5,82.5],"q_squared":32.49,"source_median_nearest":{"file":"F067","cell":"AM27","date":"2026-06-09","hour":19,"value":63.3}},{"p":85.1,"temperature":64.8,"n":13,"p_bin":[82.5,87.5],"q_squared":3.61,"source_median_nearest":{"file":"F179","cell":"AM30","date":"2026-06-23","hour":22,"value":64.8}},{"p":94.2,"temperature":61.9,"n":15,"p_bin":[92.5,97.5],"q_squared":17.64,"source_median_nearest":{"file":"F131","cell":"AM25","date":"2026-06-17","hour":17,"value":61.9}}]}}},"H2":{"stable_hourly_samples":146,"generating_samples":191,"groups":{"stator1":{"metric":"electrical/H2/Nhiệt độ cuộn dây Stator - A1","label":"Nhiệt độ cuộn dây Stator - A1","source_unit":"degC","anchors":[{"p":75.9,"temperature":78.9,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F028","cell":"O32","date":"2026-06-04","hour":24,"value":78.9}},{"p":85.0,"temperature":84.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"O28","date":"2026-06-02","hour":20,"value":84.0}},{"p":90.0,"temperature":89.3,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"O25","date":"2026-06-23","hour":17,"value":89.3}},{"p":95.2,"temperature":92.2,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F157","cell":"O23","date":"2026-06-20","hour":15,"value":92.2}}]},"stator2":{"metric":"electrical/H2/Nhiệt độ cuộn dây Stator - B1","label":"Nhiệt độ cuộn dây Stator - B1","source_unit":"degC","anchors":[{"p":75.9,"temperature":78.7,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F060","cell":"P29","date":"2026-06-08","hour":21,"value":78.7}},{"p":85.0,"temperature":84.1,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"P29","date":"2026-06-02","hour":21,"value":84.1}},{"p":90.0,"temperature":89.2,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"P25","date":"2026-06-23","hour":17,"value":89.2}},{"p":95.2,"temperature":92.5,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"P25","date":"2026-06-17","hour":17,"value":92.5}}]},"stator3":{"metric":"electrical/H2/Nhiệt độ cuộn dây Stator - C1","label":"Nhiệt độ cuộn dây Stator - C1","source_unit":"degC","anchors":[{"p":75.9,"temperature":78.7,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F028","cell":"Q32","date":"2026-06-04","hour":24,"value":78.7}},{"p":85.0,"temperature":83.5,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"Q28","date":"2026-06-02","hour":20,"value":83.5}},{"p":90.0,"temperature":88.9,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"Q25","date":"2026-06-23","hour":17,"value":88.9}},{"p":95.2,"temperature":92.15,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F140","cell":"Q26","date":"2026-06-18","hour":18,"value":92.2}}]},"stator4":{"metric":"electrical/H2/Nhiệt độ cuộn dây Stator - A2","label":"Nhiệt độ cuộn dây Stator - A2","source_unit":"degC","anchors":[{"p":75.9,"temperature":78.3,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F060","cell":"R27","date":"2026-06-08","hour":19,"value":78.3}},{"p":85.0,"temperature":83.3,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"R27","date":"2026-06-02","hour":19,"value":83.3}},{"p":90.0,"temperature":88.8,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"R25","date":"2026-06-23","hour":17,"value":88.8}},{"p":95.2,"temperature":91.75,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F157","cell":"R23","date":"2026-06-20","hour":15,"value":91.8}}]},"stator5":{"metric":"electrical/H2/Nhiệt độ cuộn dây Stator - B2","label":"Nhiệt độ cuộn dây Stator - B2","source_unit":"degC","anchors":[{"p":75.9,"temperature":79.1,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F124","cell":"S23","date":"2026-06-16","hour":15,"value":79.1}},{"p":85.0,"temperature":84.6,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F084","cell":"S27","date":"2026-06-11","hour":19,"value":84.6}},{"p":90.0,"temperature":89.8,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"S25","date":"2026-06-23","hour":17,"value":89.8}},{"p":95.2,"temperature":93.0,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F148","cell":"S28","date":"2026-06-19","hour":20,"value":93.0}}]},"stator6":{"metric":"electrical/H2/Nhiệt độ cuộn dây Stator - C2","label":"Nhiệt độ cuộn dây Stator - C2","source_unit":"degC","anchors":[{"p":75.9,"temperature":79.5,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F028","cell":"T32","date":"2026-06-04","hour":24,"value":79.5}},{"p":85.0,"temperature":84.6,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"T28","date":"2026-06-02","hour":20,"value":84.6}},{"p":90.0,"temperature":90.2,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"T25","date":"2026-06-23","hour":17,"value":90.2}},{"p":95.2,"temperature":93.4,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F148","cell":"T28","date":"2026-06-19","hour":20,"value":93.4}}]},"core1":{"metric":"electrical/H2/Nhiệt độ lõi thép - Số 1","label":"Nhiệt độ lõi thép - Số 1","source_unit":"degC","anchors":[{"p":75.9,"temperature":69.4,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F020","cell":"U32","date":"2026-06-03","hour":24,"value":69.4}},{"p":85.0,"temperature":71.1,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"U29","date":"2026-06-02","hour":21,"value":71.1}},{"p":90.0,"temperature":74.3,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"U25","date":"2026-06-23","hour":17,"value":74.3}},{"p":95.2,"temperature":75.4,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"U26","date":"2026-06-17","hour":18,"value":75.4}}]},"core2":{"metric":"electrical/H2/Nhiệt độ lõi thép - Số 2","label":"Nhiệt độ lõi thép - Số 2","source_unit":"degC","anchors":[{"p":75.9,"temperature":69.7,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F020","cell":"V32","date":"2026-06-03","hour":24,"value":69.7}},{"p":85.0,"temperature":71.4,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F028","cell":"V29","date":"2026-06-04","hour":21,"value":71.4}},{"p":90.0,"temperature":74.6,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"V25","date":"2026-06-23","hour":17,"value":74.6}},{"p":95.2,"temperature":75.7,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"V26","date":"2026-06-17","hour":18,"value":75.7}}]},"core3":{"metric":"electrical/H2/Nhiệt độ lõi thép - Số 3","label":"Nhiệt độ lõi thép - Số 3","source_unit":"degC","anchors":[{"p":75.9,"temperature":69.3,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F020","cell":"W32","date":"2026-06-03","hour":24,"value":69.3}},{"p":85.0,"temperature":71.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F028","cell":"W29","date":"2026-06-04","hour":21,"value":71.0}},{"p":90.0,"temperature":74.2,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"W25","date":"2026-06-23","hour":17,"value":74.2}},{"p":95.2,"temperature":75.3,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"W26","date":"2026-06-17","hour":18,"value":75.3}}]},"core4":{"metric":"electrical/H2/Nhiệt độ lõi thép - Số 4","label":"Nhiệt độ lõi thép - Số 4","source_unit":"degC","anchors":[{"p":75.9,"temperature":68.6,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F020","cell":"X32","date":"2026-06-03","hour":24,"value":68.6}},{"p":85.0,"temperature":70.3,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"X30","date":"2026-06-02","hour":22,"value":70.3}},{"p":90.0,"temperature":73.5,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"X25","date":"2026-06-23","hour":17,"value":73.5}},{"p":95.2,"temperature":74.6,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"X26","date":"2026-06-17","hour":18,"value":74.6}}]},"core5":{"metric":"electrical/H2/Nhiệt độ lõi thép - Số 5","label":"Nhiệt độ lõi thép - Số 5","source_unit":"degC","anchors":[{"p":75.9,"temperature":69.8,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F020","cell":"Y32","date":"2026-06-03","hour":24,"value":69.8}},{"p":85.0,"temperature":71.5,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F028","cell":"Y29","date":"2026-06-04","hour":21,"value":71.5}},{"p":90.0,"temperature":74.7,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"Y25","date":"2026-06-23","hour":17,"value":74.7}},{"p":95.2,"temperature":75.8,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"Y26","date":"2026-06-17","hour":18,"value":75.8}}]},"core6":{"metric":"electrical/H2/Nhiệt độ lõi thép - Số 6","label":"Nhiệt độ lõi thép - Số 6","source_unit":"degC","anchors":[{"p":75.9,"temperature":69.6,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F060","cell":"Z28","date":"2026-06-08","hour":20,"value":69.6}},{"p":85.0,"temperature":71.4,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"Z30","date":"2026-06-02","hour":22,"value":71.4}},{"p":90.0,"temperature":74.5,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"Z25","date":"2026-06-23","hour":17,"value":74.5}},{"p":95.2,"temperature":75.6,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"Z26","date":"2026-06-17","hour":18,"value":75.6}}]},"upperMetal":{"metric":"electrical/H2/Nhiệt độ các ổ, gió - SM OHT","label":"Nhiệt độ các ổ, gió - SM OHT","source_unit":"degC","anchors":[{"p":75.9,"temperature":44.1,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F100","cell":"AE28","date":"2026-06-13","hour":20,"value":44.1}},{"p":85.0,"temperature":43.8,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F028","cell":"AE25","date":"2026-06-04","hour":17,"value":43.8}},{"p":90.0,"temperature":44.2,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"AE26","date":"2026-06-23","hour":18,"value":44.2}},{"p":95.2,"temperature":47.5,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F157","cell":"AE22","date":"2026-06-20","hour":14,"value":47.4}}]},"upperOil":{"metric":"electrical/H2/Nhiệt độ các ổ, gió - Dầu OHT","label":"Nhiệt độ các ổ, gió - Dầu OHT","source_unit":"degC","anchors":[{"p":75.9,"temperature":33.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F060","cell":"AF27","date":"2026-06-08","hour":19,"value":33.0}},{"p":85.0,"temperature":33.3,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F068","cell":"AF28","date":"2026-06-09","hour":20,"value":33.3}},{"p":90.0,"temperature":34.3,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F148","cell":"AF31","date":"2026-06-19","hour":23,"value":34.3}},{"p":95.2,"temperature":33.8,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F165","cell":"AF25","date":"2026-06-21","hour":17,"value":33.8}}]},"lowerMetal":{"metric":"electrical/H2/Nhiệt độ các ổ, gió - SM OHD","label":"Nhiệt độ các ổ, gió - SM OHD","source_unit":"degC","anchors":[{"p":75.9,"temperature":52.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F020","cell":"AA32","date":"2026-06-03","hour":24,"value":52.0}},{"p":85.0,"temperature":52.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"AA25","date":"2026-06-02","hour":17,"value":52.0}},{"p":90.0,"temperature":52.0,"n":15,"p_bin":[87.5,92.5],"q_squared":34.81,"source_median_nearest":{"file":"F005","cell":"AA25","date":"2026-06-01","hour":17,"value":52.0}},{"p":95.2,"temperature":52.0,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"AA25","date":"2026-06-17","hour":17,"value":52.0}}]},"lowerOil":{"metric":"electrical/H2/Nhiệt độ các ổ, gió - Dầu OHD","label":"Nhiệt độ các ổ, gió - Dầu OHD","source_unit":"degC","anchors":[{"p":75.9,"temperature":45.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F020","cell":"AC32","date":"2026-06-03","hour":24,"value":45.0}},{"p":85.0,"temperature":45.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"AC25","date":"2026-06-02","hour":17,"value":45.0}},{"p":90.0,"temperature":45.0,"n":15,"p_bin":[87.5,92.5],"q_squared":34.81,"source_median_nearest":{"file":"F005","cell":"AC25","date":"2026-06-01","hour":17,"value":45.0}},{"p":95.2,"temperature":45.0,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"AC25","date":"2026-06-17","hour":17,"value":45.0}}]},"thrustMetal":{"metric":"electrical/H2/Nhiệt độ các ổ, gió - SM OD","label":"Nhiệt độ các ổ, gió - SM OD","source_unit":"degC","anchors":[{"p":75.9,"temperature":60.2,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F020","cell":"AB32","date":"2026-06-03","hour":24,"value":60.2}},{"p":85.0,"temperature":60.7,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F028","cell":"AB26","date":"2026-06-04","hour":18,"value":60.7}},{"p":90.0,"temperature":62.7,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F148","cell":"AB31","date":"2026-06-19","hour":23,"value":62.7}},{"p":95.2,"temperature":62.3,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"AB29","date":"2026-06-17","hour":21,"value":62.3}}]},"turbineMetal":{"metric":"mechanical/H2/Tuabin - Nhiệt độ sécmăng ÔHTB","label":"Tuabin - Nhiệt độ sécmăng ÔHTB","source_unit":"degC","anchors":[{"p":75.9,"temperature":61.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F122","cell":"I20","date":"2026-06-16","hour":12,"value":61.0}},{"p":85.0,"temperature":61.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F010","cell":"I28","date":"2026-06-02","hour":20,"value":61.0}},{"p":90.0,"temperature":61.9,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F146","cell":"I31","date":"2026-06-19","hour":23,"value":61.9}},{"p":95.2,"temperature":61.8,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F155","cell":"I22","date":"2026-06-20","hour":14,"value":61.8}}]},"turbineOil":{"metric":"mechanical/H2/Tuabin - Nhiệt độ dầu ÔHTB","label":"Tuabin - Nhiệt độ dầu ÔHTB","source_unit":"degC","anchors":[{"p":75.9,"temperature":58.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F018","cell":"J32","date":"2026-06-03","hour":24,"value":58.0}},{"p":85.0,"temperature":57.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F066","cell":"J27","date":"2026-06-09","hour":19,"value":57.0}},{"p":90.0,"temperature":58.0,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F003","cell":"J25","date":"2026-06-01","hour":17,"value":58.0}},{"p":95.2,"temperature":58.0,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F130","cell":"J25","date":"2026-06-17","hour":17,"value":58.0}}]},"seal":{"metric":"mechanical/H2/Tuabin - Nhiệt độ chèn trục TB","label":"Tuabin - Nhiệt độ chèn trục TB","source_unit":"degC","anchors":[{"p":75.9,"temperature":26.8,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F058","cell":"L26","date":"2026-06-08","hour":18,"value":26.8}},{"p":85.0,"temperature":27.1,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F082","cell":"L25","date":"2026-06-11","hour":17,"value":27.1}},{"p":90.0,"temperature":28.2,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F146","cell":"L31","date":"2026-06-19","hour":23,"value":28.2}},{"p":95.2,"temperature":27.8,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F163","cell":"L25","date":"2026-06-21","hour":17,"value":27.8}}]},"airIn":{"metric":"electrical/H2/Nhiệt độ các ổ, gió - Gió vào","label":"Nhiệt độ các ổ, gió - Gió vào","source_unit":"degC","anchors":[{"p":75.9,"temperature":53.9,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F028","cell":"AG32","date":"2026-06-04","hour":24,"value":53.9}},{"p":85.0,"temperature":55.5,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"AG28","date":"2026-06-02","hour":20,"value":55.5}},{"p":90.0,"temperature":58.3,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F180","cell":"AG25","date":"2026-06-23","hour":17,"value":58.3}},{"p":95.2,"temperature":58.85,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F140","cell":"AG25","date":"2026-06-18","hour":17,"value":58.8}}]},"airOut":{"metric":"electrical/H2/Nhiệt độ các ổ, gió - Gió ra","label":"Nhiệt độ các ổ, gió - Gió ra","source_unit":"degC","anchors":[{"p":75.9,"temperature":38.7,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F116","cell":"AH25","date":"2026-06-15","hour":17,"value":38.7}},{"p":85.0,"temperature":39.1,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"AH30","date":"2026-06-02","hour":22,"value":39.1}},{"p":90.0,"temperature":41.3,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F148","cell":"AH31","date":"2026-06-19","hour":23,"value":41.3}},{"p":95.2,"temperature":41.1,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F165","cell":"AH27","date":"2026-06-21","hour":19,"value":41.1}}]},"waterIn":{"metric":"mechanical/H2/NKT - Nhiệt độ nước đầu vào ống góp tổ máy","label":"NKT - Nhiệt độ nước đầu vào ống góp tổ máy","source_unit":"degC","anchors":[{"p":75.9,"temperature":24.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F018","cell":"Q32","date":"2026-06-03","hour":24,"value":24.0}},{"p":85.0,"temperature":24.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F010","cell":"Q25","date":"2026-06-02","hour":17,"value":24.0}},{"p":90.0,"temperature":24.0,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F003","cell":"Q25","date":"2026-06-01","hour":17,"value":24.0}},{"p":95.2,"temperature":24.0,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F130","cell":"Q25","date":"2026-06-17","hour":17,"value":24.0}}]},"waterOut":{"metric":"mechanical/H2/NKT - Nhiệt độ nước ra bộ làm mát gió MP","label":"NKT - Nhiệt độ nước ra bộ làm mát gió MP","source_unit":"degC","anchors":[{"p":75.9,"temperature":27.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F018","cell":"R32","date":"2026-06-03","hour":24,"value":27.0}},{"p":85.0,"temperature":27.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F010","cell":"R25","date":"2026-06-02","hour":17,"value":27.0}},{"p":90.0,"temperature":27.0,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F003","cell":"R25","date":"2026-06-01","hour":17,"value":27.0}},{"p":95.2,"temperature":27.0,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F130","cell":"R25","date":"2026-06-17","hour":17,"value":27.0}}]},"controlOil":{"metric":"mechanical/H2/DauDK - Nhiệt độ dầu thùng dầu","label":"DauDK - Nhiệt độ dầu thùng dầu","source_unit":"degC","anchors":[{"p":75.9,"temperature":35.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F018","cell":"AJ32","date":"2026-06-03","hour":24,"value":35.0}},{"p":85.0,"temperature":35.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F010","cell":"AJ25","date":"2026-06-02","hour":17,"value":35.0}},{"p":90.0,"temperature":35.0,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F003","cell":"AJ25","date":"2026-06-01","hour":17,"value":35.0}},{"p":95.2,"temperature":35.0,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F130","cell":"AJ25","date":"2026-06-17","hour":17,"value":35.0}}]},"transformerCoil":{"metric":"electrical/H2/MBA T2 - Nhiệt độ cuộn dây","label":"MBA T2 - Nhiệt độ cuộn dây","source_unit":"degC","anchors":[{"p":75.9,"temperature":62.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F100","cell":"AL28","date":"2026-06-13","hour":20,"value":62.0}},{"p":85.0,"temperature":65.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"AL25","date":"2026-06-02","hour":17,"value":65.0}},{"p":90.0,"temperature":70.0,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F005","cell":"AL27","date":"2026-06-01","hour":19,"value":70.0}},{"p":95.2,"temperature":74.0,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"AL25","date":"2026-06-17","hour":17,"value":74.0}}]},"transformerOil":{"metric":"electrical/H2/MBA T2 - Nhiệt độ dầu","label":"MBA T2 - Nhiệt độ dầu","source_unit":"degC","anchors":[{"p":75.9,"temperature":56.0,"n":49,"p_bin":[72.5,77.5],"q_squared":42.25,"source_median_nearest":{"file":"F028","cell":"AM32","date":"2026-06-04","hour":24,"value":56.0}},{"p":85.0,"temperature":56.0,"n":37,"p_bin":[82.5,87.5],"q_squared":82.81,"source_median_nearest":{"file":"F012","cell":"AM25","date":"2026-06-02","hour":17,"value":56.0}},{"p":90.0,"temperature":60.0,"n":17,"p_bin":[87.5,92.5],"q_squared":16.81,"source_median_nearest":{"file":"F148","cell":"AM31","date":"2026-06-19","hour":23,"value":60.0}},{"p":95.2,"temperature":60.0,"n":40,"p_bin":[92.5,97.5],"q_squared":46.33,"source_median_nearest":{"file":"F132","cell":"AM25","date":"2026-06-17","hour":17,"value":60.0}}]}}}},"source_files":{"F002":{"path":"THÁNG 6/Ngày 1/01062026 THONG SO CO TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"c276257f1c093ce5fd7a8b472aab6804ef42c53b666e51994caa737d1953806b"},"F003":{"path":"THÁNG 6/Ngày 1/01062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"254211576152ae65c69e85c7de343b8a097c33e091cea0fe186b50eebc36d55a"},"F004":{"path":"THÁNG 6/Ngày 1/01062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"185c1a4abd688f28a83baca37de969cd78c293fa29a5d19040803ddf30c2a9b5"},"F005":{"path":"THÁNG 6/Ngày 1/01062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"12ab68dd97359381f22e6885b6771184da72eff539f29411c35fe1b19c2e1c61"},"F009":{"path":"THÁNG 6/Ngày 2/02062026 THONG SO CO TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"8645ea4ea3c70aa5e3874a15f122861c384c84070d54fd2b7c15cdfb12c6a79b"},"F010":{"path":"THÁNG 6/Ngày 2/02062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"2d2982dab4f942eda806cec65da1cf56badd914dc5f546abb370b09a5e957353"},"F011":{"path":"THÁNG 6/Ngày 2/02062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"1313c16488dd22d1d2f9d982c1aa6803e48e3249dc3860a58c7556c5c5479a00"},"F012":{"path":"THÁNG 6/Ngày 2/02062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"b65a979776f73c9ba9cc94a23adc3d9f04498d144fc80f69720b30e4b618ce7e"},"F018":{"path":"THÁNG 6/Ngày 3/03062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"96e8f7ed02010aa6a2e894396d7053541c350301fe4c941258381ed6a9f9264f"},"F019":{"path":"THÁNG 6/Ngày 3/03062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"6543a7e3016db2a970383aff92bfc04ddc602f1e1928e5c6226e32bb94361117"},"F020":{"path":"THÁNG 6/Ngày 3/03062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"8bd2de8e1a469bfc38870e76f1d5ee034fcdebfdc8016524009442f70410b936"},"F027":{"path":"THÁNG 6/Ngày 4/04062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"791e9f779609bc446f39a61ce1e159fc4df515909519ca0dd1750b03d15b7fd9"},"F028":{"path":"THÁNG 6/Ngày 4/04062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"f0207a7b2cc7b3513fe8b712c2dd087323d235ecc21ee0d12a7995ec1349217a"},"F057":{"path":"THÁNG 6/Ngày 8/08062026 THONG SO CO TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"f9799f263782feb47c9f78ef004e90db0a12866891e87056c62f8b152d37782b"},"F058":{"path":"THÁNG 6/Ngày 8/08062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"0c276bb41e7f3befcdbfb136ef912dafbcaee5ecf5edb4eed71da00a1ccab02a"},"F059":{"path":"THÁNG 6/Ngày 8/08062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"a6e79da6379bac2d528f40ee7132343d347da1ac951ec9f34037218b30fe66c3"},"F060":{"path":"THÁNG 6/Ngày 8/08062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"4761b44b9879ebc5610661e7630971f24af621ae44870e06f26ea5760537e748"},"F065":{"path":"THÁNG 6/Ngày 9/09062026 THONG SO CO TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"081044e1b53422146eaf7f691822f284b2eeef93ff58c14160d0559c337a2374"},"F066":{"path":"THÁNG 6/Ngày 9/09062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"8be247793311675071673c11ed8764479ac005dc9cd86a7c45318d1fa52bf410"},"F067":{"path":"THÁNG 6/Ngày 9/09062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"795a004849d21c29c49b266fe8741248f737d5ba6fe70d44b55678c93fda5940"},"F068":{"path":"THÁNG 6/Ngày 9/09062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"a253ac45fe235847c0c6a241c25a6f95afd6dc44ae2cb7d0832e6406532b3287"},"F075":{"path":"THÁNG 6/Ngày 10/10062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"e2e0be446efb8efa9a8a4357a7b77d579e53f79c96f2fa9e4140500204c0515b"},"F082":{"path":"THÁNG 6/Ngày 11/11062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"8e9fc03340ca16687baf457173c14ac4608949d4c483bb607eda60518c1bd6ed"},"F083":{"path":"THÁNG 6/Ngày 11/11062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"5289f58f8ad247c31edc1df3f646617b31cc2a4233a9ce5e1bfd2069cb5c8e77"},"F084":{"path":"THÁNG 6/Ngày 11/11062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"d2bb007085b9e86f34958698f81f72f6aa409512690c163377887f4ae86adfb6"},"F100":{"path":"THÁNG 6/Ngày 13/13062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"723089fb33954aa52330a85077326609e7a46a1ea2d431ac1f06e346f07c973e"},"F116":{"path":"THÁNG 6/Ngày 15/15062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"1c7f38cfc3065489e18945d3cc62a9e2f0ce5851afc7d63289a3f55d07753820"},"F122":{"path":"THÁNG 6/Ngày 16/16062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"acb2e416b84dc5ba5a20cd72305019be107de3946c1abd18063f16d96cc02b15"},"F124":{"path":"THÁNG 6/Ngày 16/16062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"c73d6511ee785ebfb286fd64bbc21ca4ab6a77c3e0de692e849fde4049289e36"},"F129":{"path":"THÁNG 6/Ngày 17/17062026 THONG SO CO TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"60c47c5876c591df7e1fc4b66b2e6a8ff4fa5710986951f8dac10d8d5c0e98c1"},"F130":{"path":"THÁNG 6/Ngày 17/17062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"6993f4e36736be6e971c7f6529f42bd7291c45922be706c1dcde8b5bf00741f4"},"F131":{"path":"THÁNG 6/Ngày 17/17062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"466086b33c44c21ab1109dc85664e25a8beeedf06b83a546b8841cfe3c9256e0"},"F132":{"path":"THÁNG 6/Ngày 17/17062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"f440db38b621945f2da3728974cf71f4d2089b21a4d193432339fe28f6071d07"},"F139":{"path":"THÁNG 6/Ngày 18/18062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"9b13bc6b3e407bf716171fec0e5adf31fa96e5dc84771c79ba3959eb8696321d"},"F140":{"path":"THÁNG 6/Ngày 18/18062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"5f0a05523ba870df42ba68651789ea62317e9fb94a5ce1c6e2be05d0f8905477"},"F146":{"path":"THÁNG 6/Ngày 19/19062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"c246f08d74410aa03d9dd75aac5780167f90715f877abe950b213ca7e8b95d61"},"F147":{"path":"THÁNG 6/Ngày 19/19062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"e180fc7b72ff0625eea04188d02363cfffe5096787b9791e47cd0dea59620105"},"F148":{"path":"THÁNG 6/Ngày 19/19062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"0164269018929dfe987f615c7e51797e6d215b59ffa26ad3acc1afea9b53ea03"},"F155":{"path":"THÁNG 6/Ngày 20/20062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"31111e2ecc28dcf2e576c30a73da1fedae177f54d6955d79f8e1407251f27d09"},"F157":{"path":"THÁNG 6/Ngày 20/20062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"440877d45332f76054f18045ab866b40a5cc1a9fd37262c1fc6bf788fae9f908"},"F163":{"path":"THÁNG 6/Ngày 21/21062026 THONG SO CO TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"8550ff609cd2c32fc6e7086b8a711f2fc5b21c0845e73b237e78cbed634f0033"},"F165":{"path":"THÁNG 6/Ngày 21/21062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"7b72a89ff6ddf7a569bc56e6d1942e415ad68a45da60d0904844d7bf314e2d8b"},"F172":{"path":"THÁNG 6/Ngày 22/22062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"504cc11d354768781a73f275878a01e4482870f368e34f3ef876b19c9e9687e2"},"F179":{"path":"THÁNG 6/Ngày 23/23062026 THONG SO DIEN TO MAY H1 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"3955cff97e3090824fe4aff0f81138259d88b2aea3ff8bf3fc034f6fca68d500"},"F180":{"path":"THÁNG 6/Ngày 23/23062026 THONG SO DIEN TO MAY H2 BC_VanHanhTM.xls","sheet":"BC_Vận hành","sha256":"dcc2d20c5c9733f8d8b67c0af5e847d87ee1707641692dcf7d609afa85d84ee3"}},"assumptions":["Only load-bin medians for generating G are calibrated from the supplied logs. Low load, >last observed anchor, startup, SC, coastdown and stopped dynamics are engineering training assumptions.","Thermal time constants and heat effects of Q/U and missing cooling are training parameters, not identified transient tests or plant alarm/trip settings.","Stator A1/B1/C1/A2/B2/C2 provisionally maps to HMI U1/V1/W1/U2/V2/W2. Individual bearing RTD offsets are simulated around one recorded bearing value.","Gio vao/Gio ra provisionally maps to air cooler inlet/outlet. Confirm exact physical tag locations before commissioning use.","Constant 52 C lower bearing and 45 C lower bearing oil are retained as recorded reference levels, not evidence of zero dynamics.","No missing values are imputed in source logs and no statistical min/max becomes a plant protection setting."]};


// MODULE: thermal
/** Observed generating temperatures plus explicitly assumed training dynamics. */
const DEFAULT_THERMAL={ambient:28,waterIn:24,initial:['auto','auto']};
const thermalClip=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const thermalFinite=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
const THERMAL_MODES={STOPPED:'Dừng dự phòng / máy nguội',COOLING:'Dừng / đang nguội dần',PREPARATION:'Chuẩn bị phụ trợ',INLET:'Mở van tuabin',RUNUP:'Tăng tốc',NO_LOAD:'Quay không tải',EXCITATION:'Thành lập kích từ',SYNCHRONIZING:'Chờ hòa đồng bộ',PARALLEL:'Đã hòa / tải ban đầu',GENERATING:'Phát điện G',TO_SC:'Chuyển G → SC',SC:'Bù đồng bộ SC',TO_G:'Chuyển SC → G',UNLOADING:'Dừng / giảm tải',COASTDOWN:'Dừng / giảm tốc',TRIP:'Dừng sự cố'};
// Seconds of simulated time. These are training assumptions, not measured step responses.
const THERMAL_DYNAMICS={stator:600,core:1000,upper:720,lower:900,thrust:900,turbine:600,oil:1000,air:180,water:90,seal:240,control:900,transformer:1500,fault:240,passiveCoolingFactor:2.2};
const thermalChannels=[];
const addThermalChannel=(key,group,kind,offset=0)=>thermalChannels.push({key,group,kind,offset});
const bearingOffsets=[-.35,-.18,.05,-.42,-.12,.18,.36,-.24,-.08,.11,.29,.4,0,.2,-.1,.3];
for(let i=1;i<=12;i++)addThermalChannel('tempUpper'+i,'upperMetal','upper',bearingOffsets[i-1]);
for(let i=1;i<=16;i++)addThermalChannel('tempLower'+i,'lowerMetal','lower',bearingOffsets[i-1]);
for(let i=1;i<=6;i++){addThermalChannel('tempStator'+i,'stator'+i,'stator');addThermalChannel('tempMagnetic'+i,'core'+i,'core');}
addThermalChannel('tempThrust1','thrustMetal','thrust',-.15);addThermalChannel('tempThrust2','thrustMetal','thrust',.15);
addThermalChannel('tempTurbine3','turbineMetal','turbine',-.1);addThermalChannel('tempTurbine7','turbineMetal','turbine',.1);
for(const [key,group,kind] of [['tempUpperOil','upperOil','oil'],['tempLowerOil','lowerOil','oil'],['tempTurbineOil','turbineOil','oil'],['tempSeal','seal','seal'],['tempAirIn','airIn','air'],['tempAirOut','airOut','air'],['tempWaterIn','waterIn','water'],['tempWaterOut','waterOut','water'],['tempControlOil','controlOil','control'],['tempTransformerCoil','transformerCoil','transformer'],['tempTransformerOil','transformerOil','transformer']])addThermalChannel(key,group,kind);
const THERMAL_CHANNELS=Object.freeze(thermalChannels.map(Object.freeze));
const THERMAL_TREND_KEYS=['tempStator1','tempStator5','tempMagnetic1','tempUpper1','tempUpperOil','tempLower1','tempLowerOil','tempThrust1','tempTurbine3','tempTurbineOil','tempAirIn','tempAirOut','tempControlOil'];
const thermalByKey=Object.fromEntries(THERMAL_CHANNELS.map(c=>[c.key,c]));
const thermalMetalGroups=new Set(['upperMetal','lowerMetal','thrustMetal','turbineMetal']);

function validateThermalConfig(input){
 if(input===null||input!==undefined&&(typeof input!=='object'||Array.isArray(input)))throw new Error('Thiết lập nhiệt không hợp lệ.');
 if(input?.initial!==undefined&&(!Array.isArray(input.initial)||input.initial.length!==2))throw new Error('Cần trạng thái nhiệt cho cả hai tổ máy.');
 const c={...DEFAULT_THERMAL,...input,initial:[...(input?.initial||DEFAULT_THERMAL.initial)]};
 if(!thermalFinite(c.ambient,5,45)||!thermalFinite(c.waterIn,5,40)||!Array.isArray(c.initial)||c.initial.length!==2||c.initial.some(x=>!['auto','cold','warm'].includes(x)))throw new Error('Nhiệt độ môi trường/nước hoặc trạng thái nhiệt ban đầu không hợp lệ.');
 return c;
}
function thermalZero(group,unit){
 if(group.startsWith('stator'))return 52;
 if(group.startsWith('core'))return 50;
 return ({upperMetal:38,upperOil:30,lowerMetal:47,lowerOil:39,thrustMetal:52,turbineMetal:unit===1?50:54,turbineOil:52,seal:24,airIn:40,airOut:unit===1?31:35,waterIn:24,waterOut:25,controlOil:35,transformerCoil:38,transformerOil:35})[group];
}
function thermalCurve(unit,group,p){
 const record=THERMAL_REFERENCE.units['H'+unit]?.groups[group];
 if(!record||!Number.isFinite(p))throw new Error('Đường nhiệt không hợp lệ.');
 const anchors=record.anchors,x=Math.max(0,p),first=anchors[0],last=anchors.at(-1);
 if(x<first.p){const zero=thermalZero(group,unit);return {temperature:zero+(first.temperature-zero)*(x/first.p)**2,qSquared:first.q_squared,basis:'LOW_LOAD_ESTIMATE',min:first.p,max:last.p};}
 for(let i=1;i<anchors.length;i++)if(x<=anchors[i].p){const lo=anchors[i-1],hi=anchors[i],w=(x-lo.p)/(hi.p-lo.p);return {temperature:lo.temperature+(hi.temperature-lo.temperature)*w,qSquared:lo.q_squared+(hi.q_squared-lo.q_squared)*w,basis:'OBSERVED_INTERPOLATION',min:first.p,max:last.p};}
 const prev=anchors.at(-2)||last,slope=last.p===prev.p?0:thermalClip((last.temperature-prev.temperature)/(last.p-prev.p),-.15,1.2);
 return {temperature:last.temperature+slope*(x-last.p),qSquared:last.q_squared,basis:x===last.p?'OBSERVED_INTERPOLATION':'HIGH_LOAD_ESTIMATE',min:first.p,max:last.p};
}
function thermalMode(s,ambient=28){
 if(s.lockout)return 'TRIP';
 if(s.stopping)return s.stopStep===0?'UNLOADING':s.rpm>.1?'COASTDOWN':'COOLING';
 if(s.scReturning)return 'TO_G';
 if(s.workingMode==='SC'&&s.breaker)return 'SC';
 if(s.stage===7)return 'TO_SC';
 if(s.breaker)return s.p>5.25?'GENERATING':'PARALLEL';
 if(s.stage===5)return 'SYNCHRONIZING';
 if(s.stage===4)return 'EXCITATION';
 if(s.rpm>.1)return s.stageDone?'NO_LOAD':'RUNUP';
 if(s.stage===2)return 'INLET';
 if(s.stage===1)return 'PREPARATION';
 return s.thermal&&['tempStator5','tempTurbine3','tempThrust1'].some(k=>s.thermal.values[k]>ambient+3)?'COOLING':'STOPPED';
}
function thermalPowerBand(p){
 const x=Math.max(0,p);return x<25?'0–25 MW':x<50?'25–50 MW':x<70?'50–70 MW':x<80?'70–80 MW':x<90?'80–90 MW':x<=100?'90–100 MW':'100–105 MW';
}
function thermalCooling(s,group){
 if(group.startsWith('stator')||group.startsWith('core')||group.startsWith('air')||group==='waterOut')return !!s.flowAir;
 if(group.startsWith('upper'))return !!s.flowUpper;
 if(group.startsWith('lower')||group==='thrustMetal')return !!s.flowLower;
 if(group.startsWith('turbine')||group==='seal')return s.waterFlow>0&&!s.faults?.cooling;
 if(group==='controlOil')return s.waterFlow>0;
 return true; // Transformer cooling has no fault actuator in the current OTS.
}
function thermalTargets(s,unit,settings=DEFAULT_THERMAL){
 const ambient=settings.ambient,water=settings.waterIn,rotation=thermalClip(s.rpm/375,0,1.1),voltage=s.excited?thermalClip(s.kv/13.8,0,1.2):0;
 const generating=s.breaker&&Math.max(0,s.p)>0&&!((s.workingMode==='SC')&&s.draft<47.85),sc=s.breaker&&s.workingMode==='SC'&&s.draft<47.85;
 const p=generating?Math.max(0,s.p):0,q=s.breaker?s.q:0,mode=thermalMode(s,ambient),targets={},groups={},cooling={};
 const waterShift=water-24,airShift=ambient-28;
 for(const [group,record] of Object.entries(THERMAL_REFERENCE.units['H'+unit].groups)){
  let target=ambient;
  if(generating){
   const curve=thermalCurve(unit,group,p);target=curve.temperature;
   const iSquared=(p*p+q*q)*(13.8/Math.max(12.5,s.kv))**2,extraLoss=thermalClip((iSquared-(p*p+curve.qSquared))/1225,-.5,1.5);
   if(group.startsWith('stator'))target+=8*extraLoss;
   if(group.startsWith('core'))target+=1.5*(voltage*voltage-1);
   if(['airIn','airOut','waterOut'].includes(group))target+=(group==='airIn'?3:1.2)*extraLoss;
   if(group.startsWith('transformer'))target+=3*extraLoss;
   target+=group==='waterIn'?waterShift:group==='controlOil'?.5*airShift:waterShift+.2*airShift;
  }else if(rotation>.001){
   const mechanical={upperMetal:sc?39:38,upperOil:sc?32:31,lowerMetal:sc?48:47,lowerOil:sc?41:39,thrustMetal:sc?53:52,turbineMetal:sc?(unit===1?43:46):(unit===1?50:54),turbineOil:sc?44:50,seal:24};
   if(group.startsWith('stator'))target=ambient+rotation*7+voltage*17+(sc?8*(q/35)**2:0);
   else if(group.startsWith('core'))target=ambient+rotation*9+voltage*16+(sc?2*(q/35)**2:0);
   else if(Object.hasOwn(mechanical,group))target=ambient+(mechanical[group]-28)*rotation;
   else if(group==='airIn')target=ambient+rotation*8+voltage*7;
   else if(group==='airOut')target=ambient+rotation*(unit===1?3:6)+voltage*2;
   else if(group==='waterOut')target=water+rotation*1.5+voltage*.5;
   else if(group.startsWith('transformer'))target=ambient+(s.breaker?10+3*(q/35)**2:0);
   if(!group.startsWith('transformer')&&group!=='controlOil')target+=waterShift*.7;
  }
  if(group==='waterIn')target=water;
  if(group==='waterOut'&&!s.flowAir)target=rotation>.001?Math.max(target,water+5*rotation+3*voltage):ambient;
  if(group==='controlOil')target=ambient+(s.pumpA||s.pumpB?7:0);
  const cooled=thermalCooling(s,group);cooling[group]=cooled;
  const heat=thermalClip(rotation*.65+(generating?Math.max(0,p)/105*.35:0)+voltage*.15,0,1.2);
  if(!cooled&&heat>0){
   const extra=group.startsWith('stator')?65:group.startsWith('core')?35:group.startsWith('air')?25:group==='waterOut'?12:thermalMetalGroups.has(group)?65:group.endsWith('Oil')?35:10;
   target+=extra*heat;
  }
  groups[group]=thermalClip(target,-10,210);
 }
 // With no cooler water, outlet air tends toward the hot inlet, not a permanently cold source.
 if(!s.flowAir&&rotation>.01)groups.airOut=Math.max(groups.airOut,groups.airIn-1.5);
 for(const c of THERMAL_CHANNELS)targets[c.key]=thermalClip(groups[c.group]+c.offset,-10,215);
 return {targets,groups,cooling,mode,band:thermalPowerBand(p),p,q,reference:generating?(p<THERMAL_REFERENCE.units['H'+unit].groups.stator5.anchors[0].p?'LOW_LOAD_ESTIMATE':p>THERMAL_REFERENCE.units['H'+unit].groups.stator5.anchors.at(-1).p?'HIGH_LOAD_ESTIMATE':'OBSERVED_INTERPOLATION'):'MODE_ESTIMATE'};
}
function thermalBearingMaximum(thermal){return Math.max(...THERMAL_CHANNELS.filter(c=>thermalMetalGroups.has(c.group)).map(c=>thermal.values[c.key]));}
function createThermalState(s,unit,settings=DEFAULT_THERMAL,initial='auto',seedP=82,seedQ=0){
 const seed=initial==='warm'?{...s,stage:6,stopping:false,lockout:false,breaker:true,excited:true,rpm:375,p:seedP,q:seedQ,kv:13.8,workingMode:'G',draft:50,flowUpper:true,flowLower:true,flowAir:true,waterFlow:100}:s;
 const goal=thermalTargets(seed,unit,settings),live=thermalTargets(s,unit,settings),cold=initial==='cold'||initial==='auto'&&!s.breaker;
 const values=Object.fromEntries(THERMAL_CHANNELS.map(c=>[c.key,cold?(c.group==='waterIn'?settings.waterIn:settings.ambient+c.offset):goal.targets[c.key]]));
 return {version:1,mode:live.mode,band:live.band,reference:live.reference,initial:cold?'cold':initial==='warm'?'warm':'equilibrium',elapsed:0,values,targets:live.targets,tau:Object.fromEntries(THERMAL_CHANNELS.map(c=>[c.key,THERMAL_DYNAMICS[c.kind]]))};
}
function advanceThermal(s,unit,settings,dt){
 if(!thermalFinite(dt,0,1))throw new Error('Bước thời gian nhiệt không hợp lệ.');
 const state=s.thermal,goal=thermalTargets(s,unit,settings);
 for(const c of THERMAL_CHANNELS){
  const old=state.values[c.key],target=goal.targets[c.key],hasCooling=goal.cooling[c.group];
  let tau=THERMAL_DYNAMICS[c.kind];
  if(!hasCooling&&s.rpm>1&&target>old)tau=THERMAL_DYNAMICS.fault;
  else if(target<old)tau*=hasCooling?.85:THERMAL_DYNAMICS.passiveCoolingFactor;
  state.values[c.key]=old+(target-old)*(-Math.expm1(-dt/tau));state.tau[c.key]=tau;
 }
 state.targets=goal.targets;state.mode=goal.mode;state.band=goal.band;state.reference=goal.reference;state.elapsed+=dt;
 s.temp=thermalBearingMaximum(state);
 return state;
}
function validateThermalState(state){
 if(!state||state.version!==1||!Object.hasOwn(THERMAL_MODES,state.mode)||!['cold','warm','equilibrium','legacy'].includes(state.initial)||!['LOW_LOAD_ESTIMATE','HIGH_LOAD_ESTIMATE','OBSERVED_INTERPOLATION','MODE_ESTIMATE'].includes(state.reference)||!thermalFinite(state.elapsed,0,1e10)||typeof state.band!=='string'||state.band.length>40)throw new Error('Trạng thái nhiệt trong phiên không hợp lệ.');
 for(const field of ['values','targets','tau']){
  const dict=state[field];if(!dict||typeof dict!=='object'||Array.isArray(dict)||Object.keys(dict).length!==THERMAL_CHANNELS.length)throw new Error('Thiếu kênh nhiệt trong phiên.');
  for(const c of THERMAL_CHANNELS)if(!thermalFinite(dict[c.key],field==='tau'?1:-20,field==='tau'?6000:220))throw new Error('Giá trị nhiệt không hợp lệ: '+c.key);
 }
 return true;
}
function thermalTagInfo(s,unit,key){
 const c=thermalByKey[key];if(!c||!s.thermal)return null;
 const group=THERMAL_REFERENCE.units['H'+unit].groups[c.group];
 return {key,group:c.group,label:group.label,value:s.thermal.values[key],target:s.thermal.targets[key],tau:s.thermal.tau[key],basis:s.thermal.reference,mode:THERMAL_MODES[s.thermal.mode],individualEstimate:c.offset!==0||['upper','lower','thrust','turbine'].includes(c.kind),range:[group.anchors[0].p,group.anchors.at(-1).p]};
}


// MODULE: profiles
/** Document-backed watchdogs, separated from calibrated levels and assumed dynamics. */
const VERSION='04.25';
const WATCHDOGS={
 start:[0,60,180,240,60,60,60,360],
 stop:[180,120,60,180,180,180],scReturn:720
};
const LOAD_REJECTION_CONFIG=Object.freeze({
 inertiaSeconds:4,waterLagSeconds:.9,gateCloseSeconds:4,noLoadGate:12,
 mechanicalLossPU:.04,speedDamping:.6,holdSeconds:1,reopenSpeedPU:1.015,
 governorKp:150,governorKi:35,speedTolerancePU:.002,gateTolerance:.6,
 stableSeconds:3,timeoutSeconds:120,maxSimulationSpeedPU:2.2
});
function createRejectionState(ratedRPM=375){return {
 active:false,completed:false,reason:'',phase:'idle',elapsed:0,rejectedMW:0,
 initialGate:0,hydraulicPowerPU:0,speedPU:1,peakRPM:ratedRPM,minGate:100,
 closedOnce:false,closedAt:0,stableTime:0,integral:0,stopRequested:false,
 failure:'',sampleAt:-1,trace:[]
};}

const PROFILE={
 id:'AVC-JBLOCK-2023',name:'JBLOCK Rev.G · bản vẽ 2023',
 rpm:375,kv:13.8,pRated:105,pInitial:10.5,qInitial:0,
 speedExcitation:.9,voltageExcitation:.9,p92:.05,p92Delay:1,
 stopP:10.5,stopQ:3.25,scAirMin:7,scAirMax:8,scWaterLow:47.85,
 syncDf:.1,syncDu:.05,syncAngle:10,
 dynamics:{pumpStart:4,pumpStop:3,waterValve:12,liftStart:3,liftStop:2,liftPressure:6,
   bypass:18,seal:4,inlet:55,equalize:25,gate:8,runup:90,excitation:12,
   breaker:.6,loadRamp:.6,unloadRamp:.8,coast:140,brake:2,airValve:3,scDepress:30},
 illustrativeTrips:false,
 provenance:{
  watchdogs:'JBLOCK PDF 18–33, sheets 20–35; PLC U1 PDF 40–55.',
  p92:'JBLOCK sheet 27: P >5% qua TON 1 s. SET_GT/PT thực nạp chưa có giá trị trong bản in.',
  speed:'JBLOCK sheet 22 và DI0313: >90%; QT.AV.VH.604 Điều 19 mô tả 95%. Giữ dấu vết khác biệt.',
  stop:'JBLOCK sheet 30 chú thích P <10,5 MW, Q ±3,25 MVA; cơ sở đơn vị và giá trị online cần xác minh.',
  dynamics:'Các thời gian đáp ứng/hành trình là giá trị đào tạo để hiệu chỉnh; không phải timer PLC hay số đo nhà máy.',
  sync:'Cửa sổ hòa và tốc độ/điện áp danh định là tham số OTS; cần xác minh cấu hình thiết bị.',
  hardware:'Chưa có thân CMPT_CB/CMPT_DS/CMPT_CB_SS và bản in PLC U2 riêng.'
 }
};
const EXTRA_FAULTS={bypass:'Bypass không đáp ứng',seal:'Seal không đáp ứng',deltaP:'Không cân bằng áp lực van',
 coolingValve:'Van nước làm mát không đáp ứng',waterPump:'Bơm nước làm mát không chạy',
 upperFlow:'Lưu lượng ổ hướng trên thấp',lowerFlow:'Lưu lượng ổ hướng dưới thấp',airFlow:'Lưu lượng làm mát không khí thấp',
 liftStop:'Bơm nâng trục không dừng',field:'Máy cắt kích từ không đáp ứng',
 ebrake:'Phanh điện không vào',airValve:'Van khí nén không đáp ứng',waterSignal:'Mất tín hiệu WATER DEPRESSED'};
const clone=x=>JSON.parse(JSON.stringify(x));
const LESSON_CATALOG={
 startup:['Khởi động phát G','H1 từ dừng dự phòng → kiểm tra điều kiện → LOAD / ACTION → theo dõi 1X.'],
 stop:['Dừng bình thường','Giảm tải, mở máy cắt, dừng kích từ, tuabin, van và phụ trợ theo 5X.'],
 steady:['Vận hành ổn định','Điều chỉnh P/Q/U, theo dõi thông số và xu hướng.'],
 sc_start:['Khởi động bù SC','Từ dừng → hòa lưới → đóng cánh hướng/van → nén nước; nhánh SC riêng.'],
 sc:['Chuyển G ↔ SC','Theo dõi giảm tải, hệ khí và mực nước; giữ phản hồi máy cắt theo trình tự.'],
 agc:['Bàn giao AGC','Kiểm tra điều kiện, AGC ON, giao quyền A0/A3 và theo dõi lệnh.'],
 blocked:['Điều kiện khởi động chưa đạt','Tìm và khắc phục tín hiệu chưa đạt trước khi phát lệnh.'],
 prep:['Quá thời gian PREPARATION','Chờ phản hồi phụ trợ, nhận biết báo hiệu và khắc phục nguyên nhân.'],
 cooling:['Bất thường nước làm mát','Phân biệt lỗi nguồn chung với lỗi nhánh của tổ máy.'],
 dcs:['Truyền thông DCS','Mất một/hai kênh; quan sát BQ và quyền điều khiển.'],
 bs:['Nghiên cứu khởi động đen BS','Hướng dẫn theo quy trình; chưa có mô hình điện động và liên động đóng điện đầy đủ.'],
 ch:['Nghiên cứu thử đường dây CH','Hướng dẫn theo quy trình; chưa có mô hình kích từ CH và đóng điện đầy đủ.']
};
const DEFAULT_SESSION={lesson:'startup',unit:0,method:'guided',states:['stopped','stopped'],
 location:'OPS1',speed:1,speedBasis:'jblock',pTarget:82,qTarget:0,operator:'',
 fault:{key:'none',unit:0,trigger:'stage',stage:2,after:10},dynamics:clone(PROFILE.dynamics),thermal:clone(DEFAULT_THERMAL),illustrativeTrips:false};


// MODULE: control
/* AVC OTS 04. Process model for offline training.
 * Procedure: QT.AV.VH.604, issue 05, supplied June 2024 document.
 * Rates, rated speed, protection thresholds, synchronizer window and dynamics
 * are educational assumptions. This is not the plant's executable ABB logic.
 */
const MODEL={pMax:105,pMin:10,qMax:35,rpm:375,kv:13.8,oilNominal:4.6,oilAlarm:3.5,oilTrip:2.5,tempAlarm:75,tempTrip:90};
// Illustrative P-Q envelope; not a manufacturer curve or protection setting.
const CAPABILITY_OTS={pMax:105,statorMVA:117,fieldOffset:55,fieldRadius:145,underQ0:-40,underSlope:.22};
function capabilityBounds(p,profile=CAPABILITY_OTS){
 const stator=Math.sqrt(Math.max(0,profile.statorMVA**2-p**2));
 return {minQ:Math.max(-stator,profile.underQ0+profile.underSlope*p),maxQ:Math.min(stator,Math.sqrt(Math.max(0,profile.fieldRadius**2-p**2))-profile.fieldOffset)};
}
function capabilityAssessment({p,q,quality=true,online=true,rpm=375},profile=CAPABILITY_OTS){
 if(!quality||!Number.isFinite(p)||!Number.isFinite(q))return {state:'bad',text:'BQ · CHƯA ĐÁNH GIÁ'};
 if(!online)return {state:'idle',text:rpm<.1?'TỔ MÁY ĐANG DỪNG':'CHƯA NỐI LƯỚI'};
 const bounds=capabilityBounds(p,profile),inside=p>=0&&p<=profile.pMax&&q>=bounds.minQ&&q<=bounds.maxQ;
 return {state:inside?'inside':'outside',text:inside?'TRONG VÙNG OTS':'NGOÀI VÙNG OTS',...bounds};
}
function capabilityPoint(p,q){return {x:85+(q+70)/170*650,y:440-p/120*365};}
function capabilitySvg(){
 const points=[];for(let p=0;p<=105;p++)points.push(capabilityPoint(p,capabilityBounds(p).minQ));for(let p=105;p>=0;p--)points.push(capabilityPoint(p,capabilityBounds(p).maxQ));
 const region=points.map((v,i)=>(i?'L':'M')+v.x.toFixed(2)+' '+v.y.toFixed(2)).join(' ')+'Z',zero=capabilityPoint(0,0);
 let grid='';for(const q of [-60,-40,-20,0,20,40,60,80,100]){const x=capabilityPoint(0,q).x;grid+=`<path d="M${x} 55V440" class="pq-grid"/><text x="${x}" y="461" text-anchor="middle">${q}</text>`;}
 for(const p of [0,20,40,60,80,100,120]){const y=capabilityPoint(p,0).y;grid+=`<path d="M85 ${y}H735" class="pq-grid"/><text x="72" y="${y+4}" text-anchor="end">${p}</text>`;}
 return `<svg viewBox="0 0 820 515" role="img" aria-label="Capability curve: công suất P trục tung MW, vô công Q trục hoành MVAr; điểm hiện tại cập nhật trực tiếp"><defs><clipPath id="pq-clip"><rect x="85" y="55" width="650" height="400"/></clipPath></defs>${grid}<path d="${region}" class="pq-region"/><path d="M85 440H748M${zero.x} 450V43" class="pq-axis"/><text x="85" y="30" class="pq-axis-label">P · MW</text><text x="748" y="486" text-anchor="end" class="pq-axis-label">Q · MVAr</text><text x="95" y="486">Q &lt; 0</text><text x="${capabilityPoint(55,10).x}" y="${capabilityPoint(55,10).y}" text-anchor="middle" class="pq-zone-label">VÙNG VẬN HÀNH</text><g clip-path="url(#pq-clip)"><path data-pq-crosshair class="pq-crosshair"/><circle data-pq-point r="7" class="pq-point"><title data-pq-point-title>Điểm P, Q hiện tại</title></circle></g></svg>`;
}
const STAGES=[
 {en:'STOP',vi:'Dừng dự phòng',limit:0},
 {en:'PREPARATION',vi:'Chuẩn bị phụ trợ',limit:60},
 {en:'INLET VALVE',vi:'Mở van tuabin',limit:180},
 {en:'TURBINE START',vi:'Khởi động tuabin',limit:240},
 {en:'EXCITATION',vi:'Thành lập điện áp',limit:60},
 {en:'PARALLEL IN',vi:'Hòa đồng bộ',limit:60},
 {en:'LOAD',vi:'Phát điện G',limit:60},
 {en:'SYNCHRO COND',vi:'Bù đồng bộ SC',limit:360}
];
const CONTROL_FAULTS={cbopen:'Máy cắt không mở',cbclose:'Máy cắt không đóng',valve:'Van tuabin không đáp ứng',oil:'Áp lực dầu giảm',cooling:'Mất nước làm mát',prep:'Bơm nâng trục khởi động chậm',governor:'Điều tốc đáp ứng chậm',excitation:'Kích từ không thành lập điện áp',sync:'Bộ hòa tự động hỏng',load:'Tăng tải không thành công',brake:'Phanh cơ không vào',vent:'Van xả khí SC không mở',power:'Nguồn PS1A hỏng, PS1B dự phòng',spc:'SPC800 A hỏng, B tiếp quản',io:'Mất toàn bộ I/O mô phỏng'};
const approach=(v,t,r,dt)=>v+Math.sign(t-v)*Math.min(Math.abs(t-v),r*dt);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class ControlPlant {
 constructor(){
  this.events=[];this.alarms=[];this.nextEventId=1;this.nextAlarmId=1;
  this.network={onet1:true,onet2:true,cnet1:true,cnet2:true,server1:true,server2:true,ops1:true,ops2:true};
  this.localUnit=1;this.gridVoltage=220;this.activeOps='OPS1';this.station='OPS1';this.role='AVOperator';this.t=0;this.frequencyOffset=0;
  this.penstock={actual:100,target:100,signal:true,forced:false,observer:false,remote:true,locked:false,oilOK:true};
  this.diesel=false;this.units=[new ControlUnit(this,1),new ControlUnit(this,2)];
 }
 get frequency(){return 50+this.frequencyOffset+0.006*Math.sin(this.t*.22)+0.003*Math.sin(this.t*.71);}
 get onetOK(){return this.network.onet1||this.network.onet2;}
 get cnetOK(){return this.network.cnet1||this.network.cnet2;}
 get serversOK(){return this.network.server1||this.network.server2;}
 get communicationOK(){return this.onetOK&&this.cnetOK&&this.serversOK;}
 get penstockOpen(){return this.penstock.actual>99&&(this.penstock.signal||this.penstock.forced);}
 record(kind,message,area='SYSTEM',detail={}){this.events.unshift({...detail,id:this.nextEventId++,t:this.t,kind,message,area});if(this.events.length>5000)this.events.length=5000;}
 log(kind,msg){this.record(kind,msg);this.units.forEach(u=>u.log(kind,msg,false));}
 get allAlarms(){return [...this.alarms,...this.units.flatMap(u=>u.s.alarms)].sort((a,b)=>b.t-a.t);}
 alarm(code,active,message,priority='WARN'){
  const found=this.alarms.find(a=>a.code===code&&a.active),area=code.startsWith('VH_')?'GATEWAY':code.startsWith('EQ_')?'SWITCHYARD':/^(NKT|SERVICE)/.test(code)?'AUXILIARY':'SYSTEM';
  if(active&&!found){this.alarms.unshift({id:'S'+this.nextAlarmId++,code,active:true,ack:false,t:this.t,clearedAt:null,message,priority,area});this.record('ALARM',message,area);this.units?.forEach(u=>u.s.silenced=false);}
  if(!active&&found){found.active=false;found.clearedAt=this.t;this.record('RETURN',code+' — hết nguyên nhân.',area);}
 }
 setNetwork(key,on){
  if(!Object.hasOwn(this.network,key))return {ok:false,message:'Kênh truyền không hợp lệ.'};
  this.network[key]=on;this.log('DCS',(on?'Khôi phục ':'Mất ')+key.toUpperCase()+'.');
  this.units.forEach(u=>u.refreshAlarms());
  return {ok:true,message:(on?'Đã khôi phục ':'Đã tạo lỗi ')+key.toUpperCase()+'.'};
 }
 handover(){
  const next=this.activeOps==='OPS1'?'OPS2':'OPS1';
  if(!this.network[next.toLowerCase()])return {ok:false,message:next+' đang OFFLINE; không chuyển quyền.'};
  if(!this.communicationOK)return {ok:false,message:'Truyền thông không sẵn sàng; không chuyển quyền OPS.'};
  this.activeOps=next;this.station=next;this.log('AUTHORITY','Chuyển quyền vận hành sang '+next+' (Điều 18.6).');
  return {ok:true,message:next+' điều khiển; máy còn lại giám sát.'};
 }
 setPenstock(target){
  const p=this.penstock;
  if(![0,100].includes(target))return {ok:false,message:'Van đường ống chỉ nhận đích OPEN hoặc CLOSE.'};
  const u=this.units.find(x=>x.controlBlockers(false).length===0);
  if(!u)return {ok:false,message:'Cần quyền điều khiển CCR hợp lệ.'};
  if(this.units.some(x=>x.s.rpm>1||x.s.inlet>1||x.s.breaker))return u.reject('Điều 28: phải dừng cả H1/H2 và đóng cả hai van tuabin.');
  if(!p.signal||!p.remote||!p.oilOK||!p.observer||!p.locked)return u.reject('Cần tín hiệu tốt, PAUZ9 REMOTE, dầu bình thường, van tuabin án động và người giám sát tại chỗ.');
  p.target=target;this.log('COMMAND','PENSTOCK VALVE '+(target?'OPEN':'CLOSE')+' — Điều 28.');
  return {ok:true,message:'Đã nhận lệnh van đường ống mô phỏng.'};
 }
 forcePenstock(){
  const p=this.penstock;
  if(p.signal||!p.observer||p.actual<99)return {ok:false,message:'Chỉ FORCE khi mất tín hiệu và đã xác minh tại chỗ van thực sự mở hoàn toàn.'};
  p.forced=true;this.log('FORCE','FORCE VH OPEN — đã xác minh tại chỗ; chất lượng tín hiệu vẫn BAD (Điều 47).');
  return {ok:true,message:'Đang dùng tín hiệu FORCE có ghi nhật ký. Hủy FORCE sau khi sửa đường truyền.'};
 }
}
class ControlUnit {
 constructor(plant,unit){this.plant=plant;this.unit=unit;this.reset('steady');}
 reset(scenario='steady'){
  this.scenario=scenario;
  const loaded=['steady','cooling','agc','dcs','sc'].includes(scenario);
  const f=Object.fromEntries(Object.keys(CONTROL_FAULTS).map(k=>[k,false]));if(scenario==='blocked')f.valve=true;
  this.s={t:0,stage:loaded?6:0,target:loaded?6:0,stageDone:loaded,stageTime:0,sub:0,
   mode:'REMOTE',avr:'AUTO',running:true,speed:1,workingMode:'G',stopping:false,stopStep:0,stopPhaseTime:0,
   sensorFaults:{},di:{},cbCommand:null,fSet:50,gateLimit:100,excV:120,excI:900,govMode:'LOAD',pHi:105,pLo:10,
   p:loaded?82+(this.unit-1)*2:0,pBase:loaded?82+(this.unit-1)*2:0,pSet:82+(this.unit-1)*2,
   q:loaded?-3.9:0,qBase:loaded?-3.9:0,qSet:-3.9,uSet:13.8,kv:loaded?13.8:0,kvBase:loaded?13.8:0,
   rpm:loaded?MODEL.rpm:0,gate:loaded?78:0,inlet:loaded?100:0,deltaP:loaded?0:100,bypass:0,seal:0,
   oil:4.6,temp:loaded?57.5:29,coolingPump:loaded,coolingValve:loaded,lift: false,liftPressure:0,
   pumpA:true,pumpB:false,standbyAuto:true,breaker:loaded,excited:loaded,eBrake:false,mBrake:false,dust:false,
   lockout:false,oilLowTime:0,stopComplete:false,compressor:true,air:7.5,draft:loaded?50:50,airValve:false,ventValve:false,
   scPhase:0,scReturning:false,scPhaseTime:0,angle:60,df:0.16,syncMode:'AUTO',silenced:false,
   switches:{rr1:'AV/DN',rr2:'A VUONG',om:'OPS',ch:'NOT USE',usm:'USE',alr:'USE',aqr:'USE',avr:'NOT USE',govf:'NOT USE',jlr:'NOT USE',jqr:'NOT USE',tac:'REMOTE',emc:'AUTO',er:'REMOTE'},
   agc:{on:false,selected:false,hiP:105,loP:this.unit===1?70:75,hiQ:25,loQ:-25,hiU:14.2,loU:13.6,p:85,q:0,u:13.8},
   faults:f,alarms:[],events:[],history:[],lastSample:-1,injections:{},timerKey:'',timerElapsed:0,stepTimedOut:false,loadLight:false,load10:false,frequencyOperating:false,
   guideMode:'BS',guideChecks:{},guideIndex:0,guideActive:false,guideDone:false,rejections:0};
  this.nextEvent=1;this.nextAlarm=1;
  this.log('SESSION','H'+this.unit+' — khởi tạo '+scenario+'.');this.sample();
  return this.s;
 }
 log(kind,message,record=true,detail={}){this.s.events.unshift({...detail,id:this.nextEvent++,t:this.plant.t,sessionT:this.s.t,kind,message,unit:this.unit});if(this.s.events.length>2000)this.s.events.length=2000;if(record)this.plant.record(kind,message,'UNIT-'+this.unit,detail);}
 reject(message){this.s.rejections++;this.log('REJECT',message);return {ok:false,message};}
 result(message){return {ok:true,message};}
 get qualityGood(){const p=this.plant,s=this.s;return p.communicationOK&&!s.faults.io&&(p.station!=='OPS1'||p.network.ops1)&&(p.station!=='OPS2'||p.network.ops2);}
 controlBlockers(local=true){
  const p=this.plant,s=this.s,x=s.switches,a=[];
  if(p.role==='AVGuest')a.push('vai trò AVGuest chỉ giám sát');
  if(!this.qualityGood)a.push('dữ liệu BAD / mất truyền thông, Điều 15');
  if(s.mode!=='REMOTE')a.push('43R chưa ở REMOTE');
  if(x.tac!=='REMOTE'||x.emc!=='AUTO'||x.er!=='REMOTE')a.push('TAC/EMC/kích từ chưa REMOTE–AUTO');
  if(p.station==='UMDU'){if(p.localUnit!==this.unit)a.push('Trạm U'+p.localUnit+'MDU không có quyền tổ máy H'+this.unit);if(x.om!=='UMDU')a.push('43_O/M chưa chọn U'+this.unit+'MDU');}
  else {
   if(x.om!=='OPS')a.push('43_O/M chưa chọn OPS');
   if(p.station!==p.activeOps)a.push(p.station+' đang GIÁM SÁT, '+p.activeOps+' giữ quyền');
   if(local&&x.rr1!=='AV/DN')a.push('43RR-1 đang giao quyền A0/A3');
   if(x.rr2!=='A VUONG')a.push('43RR-2 chưa chọn A Vương');
  }
  return a;
 }
 blockers(includeStopped=true){
  const s=this.s,a=this.controlBlockers();
  if(s.lockout)a.push('khóa bảo vệ 86 chưa reset');
  if(s.avr!=='AUTO')a.push('43-90 chưa AUTO');
  if(s.switches.ch!=='NOT USE')a.push('43CH phải NOT USE cho G/SC');
  if(!this.plant.penstockOpen)a.push('van đường ống chưa có tín hiệu mở hợp lệ');
  if(this.plant.penstock.locked)a.push('van tuabin đang án động cho thao tác van đường ống');
  if(s.oil<MODEL.oilAlarm||s.faults.oil)a.push('áp lực dầu điều khiển chưa đủ');
  if(s.faults.cooling)a.push('nước làm mát chưa sẵn sàng');
  if(s.faults.valve)a.push('INLET VALVE READY FOR START chưa đạt');
  if(s.stage===0){for(const c of [...this.conditions(1),...this.conditions(2)])if(!c.ok&&!c.info)a.push(c.vi);}
  if(includeStopped&&s.stage===0){
   if(s.breaker||s.rpm>1||s.inlet>1||s.gate>1||s.excited||s.mBrake||s.eBrake)a.push('phản hồi dừng/van/cánh hướng/phanh chưa đủ');
  }
  return [...new Set(a)];
 }
 get ready(){return this.s.stage===0&&!this.s.stopping&&this.blockers().length===0;}
 get healthy(){return !this.s.lockout&&!Object.values(this.s.faults).some(Boolean)&&this.qualityGood;}
 setMode(mode){
  if(!['REMOTE','LOCAL AUTO','TEST'].includes(mode))return this.reject('43R không hợp lệ.');
  if(this.s.stopping||(this.s.stage>0&&this.s.stage<6))return this.reject('Không chuyển 43R trong khi trình tự đang chạy.');
  this.s.mode=mode;this.log('AUTHORITY','43R → '+mode);return this.result('43R: '+mode);
 }
 setSwitch(key,value){
  if(this.plant.role==='AVGuest')return this.reject('Vai trò AVGuest chỉ được giám sát.');
  const options={rr1:['AV/DN','A0/A3'],rr2:['A VUONG','DA NANG'],om:['OPS','UMDU'],ch:['USE','NOT USE'],usm:['USE','NOT USE'],alr:['USE','NOT USE'],aqr:['USE','NOT USE'],avr:['USE','NOT USE'],jlr:['USE','NOT USE'],jqr:['USE','NOT USE'],govf:['USE','NOT USE'],tac:['REMOTE','LOCAL'],emc:['AUTO','MANUAL'],er:['REMOTE','LOCAL']};
  if(!options[key]?.includes(value))return this.reject('Giá trị khóa không hợp lệ.');
  if(key==='ch'&&this.s.stage!==0)return this.reject('Bài G/SC chỉ đổi 43CH khi tổ máy dừng.');
  this.s.switches[key]=value;
  if((key==='rr1'&&value==='AV/DN')||(key==='alr'&&value==='NOT USE'))this.s.agc.selected=false;
  if(key==='rr1'&&value==='AV/DN')this.s.agc.on=false;
  this.log('AUTHORITY','43 '+key.toUpperCase()+' → '+value);return this.result('Đã chuyển khóa '+key.toUpperCase()+'.');
 }
 setAvr(mode){
  if(!['AUTO','MANUAL'].includes(mode))return this.reject('AVR không hợp lệ.');
  if(this.controlBlockers().length)return this.reject(this.controlBlockers().join('; '));
  this.s.avr=mode;this.log('COMMAND','43-90 → '+mode);return this.result('AVR '+mode);
 }
 setpoint(key,value){
  const s=this.s,ctl=this.controlBlockers();if(ctl.length)return this.reject(ctl.join('; '));
  if(!['p','q','u'].includes(key)||!Number.isFinite(value))return this.reject('Giá trị đặt không hợp lệ.');
  if(s.lockout||s.stopping||s.guideActive)return this.reject('Không nhận giá trị đặt trong trạng thái hiện tại.');
  if(s.scReturning||s.workingMode==='G→SC')return this.reject('Chờ hoàn thành chuyển đổi chế độ.');
  const joint=(key==='p'&&s.switches.jlr==='USE')||(key==='q'&&s.switches.jqr==='USE');
  const bounds={p:[s.pLo*(joint?2:1),s.pHi*(joint?2:1)],q:[-35*(joint?2:1),35*(joint?2:1)],u:[13.6,14.2]},[lo,hi]=bounds[key];
  if(value<lo||value>hi)return this.reject('Giới hạn bài tập '+lo+'…'+hi+' '+({p:'MW',q:'MVAr',u:'kV'}[key])+'.');
  if(key==='p'&&s.workingMode==='SC')return this.reject('SC chỉ điều chỉnh Q/U; chuyển LOAD để phát G.');
  if(['q','u'].includes(key)&&s.avr!=='AUTO')return this.reject('Bài này yêu cầu AVR AUTO khi đặt Q/U.');
  if(key==='p'&&s.switches.alr!=='USE')return this.reject('43ALR phải USE để nhận ALR Set Point.');
  if(key==='q'&&s.switches.aqr!=='USE')return this.reject('43AQR phải USE để nhận AQR Set Point.');
  if((key==='p'&&s.switches.jlr==='USE')||(key==='q'&&s.switches.jqr==='USE')){
   const other=this.plant.units.find(u=>u!==this);
   if(!other.s.breaker||other.s.workingMode!=='G'||s.workingMode!=='G'||other.controlBlockers().length||other.s.switches[key==='p'?'alr':'aqr']!=='USE')return this.reject('Điều khiển chung cần cả hai tổ phát G, cùng quyền CCR và khóa ALR/AQR USE.');
   const half=value/2;
   if(key==='p'&&half<MODEL.pMin)return this.reject('Giá trị chung chia đôi thấp hơn giới hạn bài tập mỗi tổ.');
   this.plant.units.forEach(u=>{u.s[key+'Set']=half;u.log('JOINT','Đặt tổng '+key.toUpperCase()+' = '+value+'; mỗi tổ = '+half);});
   return this.result('Đã chia đều giá trị chung cho H1/H2.');
  }
  s[key==='u'?'uSet':key+'Set']=value;this.log('COMMAND',key.toUpperCase()+' SET POINT = '+value);return this.result('Đã nhận giá trị đặt '+key.toUpperCase()+'.');
 }
 enableAGC(on){
  const s=this.s;
  if(this.controlBlockers(false).length)return this.reject(this.controlBlockers(false).join('; '));
  if(on&&(!s.breaker||s.stage!==6||s.workingMode!=='G'||s.p<s.agc.loP))return this.reject('AGC yêu cầu phát G và P ≥ '+s.agc.loP+' MW cho H'+this.unit+' (Điều 25).');
  s.agc.on=on;s.agc.selected=false;if(!on)s.switches.rr1='AV/DN';
  this.log('AGC','AGC MODE '+(on?'ON':'OFF'));return this.result('AGC '+(on?'ON; chuyển 43RR-1 A0/A3 và chọn A0 SELECT.':'OFF.'));
 }
 selectAGC(on){
  const s=this.s;
  if(this.controlBlockers(false).length)return this.reject(this.controlBlockers(false).join('; '));
  if(on&&(!s.agc.on||s.switches.rr1!=='A0/A3'||s.switches.alr!=='USE'))return this.reject('Cần AGC ON, 43RR-1 A0/A3 và 43ALR USE.');
  s.agc.selected=on;this.log('AGC','A0 '+(on?'SELECT':'DESELECT'));return this.result(on?'A0 đã giữ quyền P; giới hạn đang có hiệu lực.':'Đã bỏ A0 SELECT.');
 }
 applyA0(p,q,u){
  const s=this.s,a=s.agc;
  if(this.plant.role==='AVGuest')return this.reject('Vai trò AVGuest chỉ được giám sát.');
  if(![p,q,u].every(Number.isFinite))return this.reject('Lệnh A0 phải là các giá trị số hữu hạn.');
  if(!a.on||!a.selected||s.switches.rr1!=='A0/A3'||s.stopping||s.lockout||!this.qualityGood)return this.reject('AGC chưa đủ điều kiện nhận lệnh.');
  a.p=p;a.q=q;a.u=u;
  s.pSet=clamp(p,a.loP,a.hiP);
  if(s.switches.aqr==='USE')s.qSet=clamp(q,a.loQ,a.hiQ);
  if(s.switches.avr==='USE')s.uSet=clamp(u,a.loU,a.hiU);
  this.log('A0','SP(A0) P='+p+', Q='+q+', U='+u+'; đã áp giới hạn.');return this.result('Đã gửi lệnh A0 mô phỏng; giá trị điều khiển được giới hạn.');
 }
 setFault(key,on){
  if(!Object.hasOwn(CONTROL_FAULTS,key))return this.reject('Lỗi không hợp lệ.');
  this.s.faults[key]=on;this.log('INSTRUCTOR',(on?'Tạo':'Gỡ')+' lỗi: '+CONTROL_FAULTS[key]);this.refreshAlarms();return this.result((on?'Đã tạo':'Đã gỡ')+' tình huống.');
 }
 pump(id,on){
  if(this.controlBlockers().length)return this.reject(this.controlBlockers().join('; '));
  if(!['A','B'].includes(id))return this.reject('Bơm không hợp lệ.');
  this.s['pump'+id]=on;this.log('COMMAND','Bơm dầu '+id+' '+(on?'START':'STOP'));return this.result('Đã điều khiển bơm '+id+'.');
 }
 alarm(code,active,message,priority='WARN'){
  if(/^(ONET|CNET|SERVER|OPS|CCR_|VH_)/.test(code)){this.plant.alarm(code,active,message,priority);return;}
  const found=this.s.alarms.find(a=>a.code===code&&a.active);
  if(active&&!found){this.s.alarms.unshift({id:'U'+this.unit+'-'+this.nextAlarm++,code,active:true,ack:false,t:this.plant.t,clearedAt:null,message,priority,area:'UNIT-'+this.unit});this.s.silenced=false;this.log(priority==='TRIP'?'TRIP':'ALARM',message);}
  if(!active&&found){found.active=false;found.clearedAt=this.plant.t;this.log('RETURN',code+' — hết nguyên nhân.');}
  if(this.s.alarms.length>500)this.s.alarms.length=500;
 }
 acknowledge(){[...this.s.alarms,...this.plant.alarms].forEach(a=>a.ack=true);this.log('ACK','Xác nhận cảnh báo; giữ nguyên trạng thái nguyên nhân.');return this.result('Đã ACK; nguyên nhân và khóa bảo vệ được giữ nguyên.');}
 silence(){this.s.silenced=true;this.log('SILENCE','Giải trừ tín hiệu còi; chưa ACK và chưa reset bảo vệ.');return this.result('Đã SILENCE. Cảnh báo mới sẽ bật lại chỉ báo còi.');}
 refreshAlarms(){
  const s=this.s,p=this.plant;
  this.alarm('OIL_LOW',s.oil<MODEL.oilAlarm,'Áp lực dầu thấp — ngưỡng bài tập.');
  this.alarm('COOLING_LOST',s.faults.cooling,'Mất nước làm mát — kiểm tra hệ thống nước.');
  this.alarm('TEMP_HIGH',s.temp>=MODEL.tempAlarm,'Nhiệt độ ổ hướng cao — ngưỡng bài tập.');
  this.alarm('PS1A_FAIL',s.faults.power,'Power Supply PS1A FAIL; PS1B dự phòng — Điều 49.');
  this.alarm('SPC_REDUNDANCY',s.faults.spc,'SPC800 Redundancy Fail; B đang tiếp quản — Điều 50.');
  this.alarm('IO_FAIL',s.faults.io,'Mất toàn bộ AI/DI/AO/DO mô phỏng; chặn CCR — Điều 15, 51.');
  for(const [key,on] of Object.entries(p.network))this.alarm(key.toUpperCase()+'_OFFLINE',!on,key.toUpperCase()+' OFFLINE — kiểm tra DCS.');
  this.alarm('CCR_UNAVAILABLE',!p.communicationOK,'CCR không đủ điều kiện điều khiển — Điều 15.');
  this.alarm('VH_SIGNAL_BAD',!p.penstock.signal,'GHLCU / truyền thông nhà van mất tín hiệu — Điều 47.');
  this.alarm('VH_FORCE',p.penstock.forced,'FORCE VH OPEN đang áp dụng; cần hủy sau sửa chữa.','INFO');
  const a=s.agc,active=a.on&&a.selected&&s.switches.rr1==='A0/A3';
  const clipped=active&&(a.p<a.loP||a.p>a.hiP||(s.switches.aqr==='USE'&&(a.q<a.loQ||a.q>a.hiQ))||(s.switches.avr==='USE'&&(a.u<a.loU||a.u>a.hiU)));
  this.alarm('A0_LIMIT',clipped,'Lệnh A0 ngoài MIN–MAX; báo A0/A3 theo Điều 25.');
  const deviation=active&&(Math.abs(a.p-s.p)>0.03*105||(s.switches.aqr==='USE'&&Math.abs(a.q-s.q)>0.03*25)||(s.switches.avr==='USE'&&Math.abs(a.u-s.kv)>0.03*13.8));
  this.alarm('A0_TRACKING',deviation,'Sai lệch SP(A0)/thực tế >3% theo cơ sở định mức bài tập; kiểm tra, báo A0 (Điều 25).');
 }
 tick(dt){
  const s=this.s;dt=clamp(dt,0,1);s.t+=dt;this.tickActuators(dt);
  const ot=s.faults.oil?1.8:(s.pumpA||s.pumpB)?4.6:1;
  s.oil=approach(s.oil,ot,.5,dt);
  if(s.standbyAuto&&!s.pumpA&&!s.pumpB&&s.oil<4.1){s.pumpB=true;this.log('AUTO','Bơm dầu B tự khởi động dự phòng (logic bài tập).');}
  s.temp=approach(s.temp,s.faults.cooling&&s.rpm>1?103:s.breaker?43+Math.max(0,s.p)*.18:29,s.faults.cooling?.6:.35,dt);
  s.liftPressure=approach(s.liftPressure,s.lift&&!s.faults.prep?1:0,.35,dt);
  if(s.stage>0&&!s.lockout){
   s.oilLowTime=s.oil<MODEL.oilTrip?s.oilLowTime+dt:0;
   if(s.oilLowTime>2)this.trip('Áp lực dầu rất thấp — bảo vệ minh họa.');
   if(s.temp>=MODEL.tempTrip)this.trip('Nhiệt độ ổ hướng rất cao — bảo vệ minh họa.');
  }
  if(s.lockout)this.tickTrip(dt);
  else if(s.stopping)this.tickStop(dt);
  else if(s.scReturning)this.tickReturn(dt);
  else if(s.stage===7)this.tickSC(dt);
  else this.tickStart(dt);
  this.refreshAlarms();
  if(s.t-s.lastSample>=1)this.sample();
 }
 conditions(page=1){
  const s=this.s,p=this.plant;
  const rows=page===1?[
   ['272-7 DS CLOSE','DCL 272-7 đóng',true,true,'switchyard'],
   ['271-1 DS CLOSE','DCL 271-1 đóng',true,true,'switchyard'],
   ['271-2 DS CLOSE','DCL 271-2 đóng',true,true,'switchyard'],
   ['273-7 DS CLOSE','DCL 273-7 đóng',true,true,'switchyard'],
   ['273-1 DS CLOSE','DCL 273-1 đóng',true,true,'switchyard'],
   ['273-3 DS CLOSE','DCL 273-3 đóng',true,true,'switchyard'],
   ['SIMULATION FOR SWITCHYARD','Nhánh giả lập trạm: chưa kích hoạt',false,false,'switchyard'],
   ['231-3 DS CLOSE','DCL 231-3 đóng',true,true,'switchyard'],
   ['271 CB CLOSE','MC 271 đóng',true,true,'switchyard'],
   ['273 CB CLOSE','MC 273 đóng',true,true,'switchyard'],
   ['43CH RESET','43CH NOT USE',s.switches.ch==='NOT USE',true],
   ['901 OPEN POSITION','Máy cắt đầu cực mở',!s.breaker,true],
   ['GCB SYSTEM REMOTE','Máy cắt đầu cực REMOTE',true,true],
   ['901-3 DS CLOSE','DCL đầu cực đóng',true,true],
   ['901-0 DS OPEN','Dao tiếp địa mở',true,true],
   ['PRESSURE ABSENCE IN BRAKING SYSTEM','Hệ phanh đã nhả',!s.eBrake&&!s.mBrake,true],
   ['INLET VALVE CLOSED','Van tuabin đóng',s.inlet<1,true],
   ['INLET BY-PASS VALVE CLOSED','Van by-pass đóng',s.bypass<1,true],
   ['INLET VALVE READY FOR START','Van tuabin sẵn sàng',!s.faults.valve&&!p.penstock.locked,true],
   ['INLET VALVE LOCK APPLIED','Án động van tuabin',p.penstock.locked,false],
   ['INLET VALVE LOCAL CONTROL ON','Van ở LOCAL',false,false],
   ['INLET VALVE CONTROLLER POWER SUPPLY OFF','Nguồn điều khiển van mất',false,false]
  ]:[
   ['GUIDE VANE CLOSED','Cánh hướng đóng',s.gate<1,true],
   ['GENERATOR READY FOR START','Máy phát sẵn sàng',!s.lockout,true],
   ['GOVERNOR CONTROL MODE LOCAL','Điều tốc LOCAL',s.switches.tac==='LOCAL',false],
   ['GOVERNOR CONTROL MODE NOT AUTO','Điều tốc chưa AUTO',s.switches.emc!=='AUTO',false],
   ['GATE LOCK APPLIED','Án động cánh hướng',false,false],
   ['GOVERNOR SUMP TANK LEVEL LOW','Mức dầu bể điều tốc thấp',false,false],
   ['EMERGENCY VALVE OFF','Van sự cố ở trạng thái OFF',true,true],
   ['TURBINE GUIDE BEARING OIL LEVEL HIGH','Dầu ổ hướng tuabin cao',false,false],
   ['TURBINE GUIDE BEARING OIL LEVEL LOW','Dầu ổ hướng tuabin thấp',false,false],
   ['TURBINE COMPLETELY STOP (TIMER)','Tổ máy dừng hoàn toàn',s.rpm<1,true],
   ['PRESSURE ACCUMULATOR OIL LEVEL HIGH','Mức dầu bình tích áp cao',false,false],
   ['PRESSURE ACCUMULATOR OIL LEVEL LOW','Mức dầu bình tích áp thấp',false,false],
   ['SHEAR PIN FAILURE','Sự cố chốt cắt',false,false],
   ['EXCITATION OFF CONDITION','Kích từ đã cắt',!s.excited,true],
   ['AVR LOCAL','Kích từ tại chỗ',s.switches.er!=='REMOTE',false],
   ['43-90 AUTO','Kích từ AUTO',s.avr==='AUTO',true],
   ['GEN. UPPER BEARING OIL LEVEL NORMAL','Mức dầu ổ hướng trên bình thường',true,true],
   ['GEN. LOWER BEARING OIL LEVEL NORMAL','Mức dầu ổ hướng dưới bình thường',true,true],
   ['GENERATOR ROOM DOOR CLOSE','Cửa buồng máy phát đóng',true,true],
   ['CO2 SYSTEM SNAPPING FAIL','Sự cố hệ thống CO2',false,false],
   ['CO2 SYSTEM SHORT CIRCUIT FAIL','Ngắn mạch hệ CO2',false,false],
   ['MAINTENANCE SEAL PRESSURE ABNORMAL','Áp lực seal bảo trì bất thường',false,false],
   ['PENSTOCK VALVE OPEN','Van đường ống mở có tín hiệu hợp lệ',p.penstockOpen,true],
   ['SIMULATION FOR VALVE HOUSE','FORCE nhà van đang áp dụng',p.penstock.forced,p.penstock.forced],
   ['LOCK OUT RELAY 86-1(1) OPERATE','Khóa bảo vệ 86 tác động',s.lockout,false],
   ['LOCK OUT RELAY 86-2 OPERATE','Khóa 86-2 tác động',false,false],
   ['LOCK OUT RELAY 86-1(2) OPERATE','Khóa 86-1(2) tác động',false,false],
   ['901 CB IN AUTO','Máy cắt ở AUTO',true,true]
  ];
  return rows.map(([tag,vi,value,required,group])=>{const raw=Object.hasOwn(s.di,tag)?s.di[tag]:value;return conditionFeedback0411(this,page,rows.findIndex(row=>row[0]===tag),{tag:tag.replaceAll('901',this.unit===1?'901':'902'),key:tag,vi,raw,required,ok:raw===required,info:group==='switchyard',ref:group==='switchyard'?'JBLOCK / nhánh trạm giản lược':'HMI / OTS'});});
 }
 sample(){const s=this.s;s.history.push({t:this.plant.t,lessonT:s.t,p:s.p,pSet:s.pSet,q:s.q,rpm:s.rpm,kv:s.kv,frequency:s.rpm/MODEL.rpm*50,oil:s.oil,temp:s.temp,gate:s.gate,inlet:s.inlet,quality:this.qualityGood?'GOOD':'BAD'});if(s.history.length>1800)s.history.shift();s.lastSample=s.t;}
}


// MODULE: devices
/** Actuator command, movement and feedback are independent of display quality. */
class Device {
 constructor(name,{kind='valve',value=0,openTime=1,closeTime=openTime}={},emit=()=>{}){
  this.name=name;this.kind=kind;this.value=value;this.target=value;this.openTime=openTime;this.closeTime=closeTime;
  this.elapsed=0;this.failed=false;this.emit=emit;this.moving=false;this.lastFeedback=value;
 }
 command(target){target=this.kind==='motor'?Number(!!target):Math.max(0,Math.min(100,target));
  if(target===this.target)return;const previous=this.target;this.target=target;this.elapsed=0;this.moving=this.value!==target;
  const cb=/^(CB\d|41 \/)/.test(this.name);
  if(this.kind==='motor'||target===0||target===100||Math.abs(target-previous)>1)this.emit('OUTPUT',this.name+' '+(this.kind==='motor'?(cb?(target?'CLOSE':'OPEN'):(target?'START/ON':'STOP/OFF')):(target?'OPEN':'CLOSE'))+' COMMAND',{tag:this.name,state:this.kind==='motor'?(cb?(target?'CLOSE COMMAND':'OPEN COMMAND'):(target?'START COMMAND':'STOP COMMAND')):(target?'OPEN COMMAND':'CLOSE COMMAND'),source:'OTS'});
 }
 tick(dt){
  if(this.value===this.target){this.moving=false;return;}
  this.elapsed+=dt;this.moving=true;if(this.failed)return;
  const duration=this.target>this.value?this.openTime:this.closeTime;
  if(this.kind==='motor'){
   if(this.elapsed+1e-8>=duration)this.value=this.target;
  }else{const delta=duration>0?100*dt/duration:100;this.value+=Math.sign(this.target-this.value)*Math.min(Math.abs(this.target-this.value),delta);}
  if(Math.abs(this.value-this.target)<1e-7){this.value=this.target;this.moving=false;}
  const feedback=this.kind==='motor'?this.value:this.value>=99.9?100:this.value<=.1?0:-1;
  if(feedback!==-1&&feedback!==this.lastFeedback){this.lastFeedback=feedback;const cb=/^(CB\d|41 \/)/.test(this.name);this.emit('FEEDBACK',this.name+' '+(this.kind==='motor'?(cb?(feedback?'CLOSE POSITION':'OPEN POSITION'):(feedback?'RUN/ON':'STOP/OFF')):(feedback?'OPEN POSITION':'CLOSED POSITION')),{tag:this.name,state:this.kind==='motor'?(cb?(feedback?'CLOSED':'OPEN'):(feedback?'RUN':'STOP')):(feedback?'OPEN':'CLOSED'),source:'OTS'});}
 }
 set(value){this.value=value;this.target=value;this.elapsed=0;this.moving=false;this.lastFeedback=value;}
 get on(){return this.kind==='motor'?this.value===1:this.value>=99.9;}
 get closed(){return this.kind==='motor'?this.value===0:this.value<=.1;}
 snapshot(){return {value:this.value,target:this.target,elapsed:this.elapsed,failed:this.failed,moving:this.moving,lastFeedback:this.lastFeedback};}
 restore(x){for(const k of ['value','target','elapsed','failed','moving','lastFeedback'])this[k]=x[k];}
}
class CoolingSystem {
 constructor(plant){this.plant=plant;this.reset();}
 reset(){this.requests=[false,false];this.source=true;this.header=0;this.fault=false;this.manualReserve=false;this.demandAge=0;
  this.pumps=[0,1,2].map(i=>new Device('NK-1MB'+(i+1),{kind:'motor',openTime:this.plant.profile.dynamics.pumpStart,closeTime:this.plant.profile.dynamics.pumpStop},(kind,msg,detail)=>this.plant.record(kind,msg,'AUXILIARY',detail)));
 }
 tick(dt){
  this.pumps.forEach((d,i)=>{d.failed=i<2?!!this.plant.units[i]?.s.faults.waterPump:false;d.command(this.plant.equipment?.auxOverrides['NK-1MB'+(i+1)]??(i<2?this.requests[i]:this.manualReserve));d.tick(dt);});
  const capacity=this.source&&!this.fault?this.pumps.filter(d=>d.on).length*.45:0;
  const target=Math.min(.55,capacity),delta=.06*dt;this.header+=Math.sign(target-this.header)*Math.min(Math.abs(target-this.header),delta);
  this.demandAge=this.requests.some(Boolean)?this.demandAge+dt:0;
  this.plant.alarm('NKT_COMMON_LOW',this.requests.some(Boolean)&&this.header<.18&&this.demandAge>this.plant.profile.dynamics.pumpStart+6,'NKT: áp lực đường góp thấp — mốc mô phỏng.');
 }
}


// MODULE: operator-logic
/** Reviewed control paths. This module projects permissives without changing plant state. */
const SELECTOR_OPTIONS={rr1:['AV/DN','A0/A3'],rr2:['A VUONG','DA NANG'],om:['OPS','UMDU'],ch:['USE','NOT USE'],usm:['USE','NOT USE'],alr:['USE','NOT USE'],aqr:['USE','NOT USE'],avr:['USE','NOT USE'],jlr:['USE','NOT USE'],jqr:['USE','NOT USE'],govf:['USE','NOT USE'],tac:['REMOTE','LOCAL'],emc:['AUTO','MANUAL'],er:['REMOTE','LOCAL']};
const SELECTOR_NAMES={rr1:'43RR-1',rr2:'43RR-2',om:'43_O/M',ch:'43CH',usm:'43USM',alr:'43ALR',aqr:'43AQR',avr:'43AVR',jlr:'43JLR',jqr:'43JQR',govf:'43GOVF',tac:'TAC',emc:'EMC',er:'EXCITATION +ER'};
const permit=(label,ok,tag='',source='')=>({label,ok:!!ok,tag,source});
function analogHealthy(unit,key){const s=unit.s,id=key==='p'?'AI0007':key==='q'?'AI0008':'AI0009';return !s.faults.io&&!Object.entries(s.sensorFaults).some(([k,v])=>v&&(k===key||k.includes(id)));}
function regulatorRequirements(unit,key){
 const s=unit.s,x=s.switches,p=unit.plant;
 const cb=unit.yes('breakerClosed',unit.devices.breaker.on),live=!s.stopping&&!s.lockout&&s.stage>0;
 const common=[permit('5X OFF / không dừng hoặc khóa 86',live,'SH005_02 · NOT','JBLOCK SH70–73')];
 if(key==='alr')return [...common,permit('GOVERNOR LOAD CONTROL',unit.yes('governorLoad',s.govMode==='LOAD'),'DI0305','SH70'),permit('UNIT CIRCUIT BREAKER CLOSED',cb,'DI0149','SH70'),permit('92P ON · P >5% qua TON 1 s',s.loadLight,'SH027_01','SH70'),permit('43S-CS LOAD',s.target===6&&s.workingMode==='G','SH004_08','SH70'),permit('ACTIVE POWER SIGNAL GOOD',analogHealthy(unit,'p'),'AI0007.SEA · NOT','SH70'),permit('43GOVF NOT USE',x.govf==='NOT USE','43GOVF','QT.AV.VH.604 Điều 26')];
 if(key==='aqr')return [...common,permit('UNIT CIRCUIT BREAKER CLOSED',cb,'DI0149','SH71'),permit('43-90 AUTO',unit.yes('avrAuto',s.avr==='AUTO'),'DI0110','SH71'),permit('LOAD + 92P hoặc SC + WATER DEPRESSED',(s.target===6&&s.loadLight&&s.workingMode==='G')||(s.target===7&&unit.yes('waterDepressed',s.draft<p.profile.scWaterLow)&&unit.completed.sc),'SH027 / DI0391','SH71'),permit('REACTIVE POWER SIGNAL GOOD',analogHealthy(unit,'q'),'AI0008.SEA · NOT','SH71')];
 if(key==='jlr'||key==='jqr'){const base=key==='jlr'?'alr':'aqr';return [...common,permit('UNIT CIRCUIT BREAKER CLOSED',cb,'DI0149',key==='jlr'?'SH72':'SH73'),permit(key==='jlr'?'43ALR USE':'43AQR USE',x[base]==='USE'&&regulatorRequirements(unit,base).every(r=>r.ok),key==='jlr'?'SH070_01':'SH071_01',key==='jlr'?'SH72':'SH73'),permit('AL-LCU NORMAL',p.yard.auxiliaryNormal!==false,'ALLCU_NORMAL','PLC U1 SH072/073')];}
 if(key==='avr')return [...common,permit('43-90 AUTO',s.avr==='AUTO','43-90','Điều 4.42; điều kiện chức năng OTS'),permit('Kích từ đã thành lập',s.excited&&s.kv>.9*p.profile.kv,'91E2','Điều kiện chức năng OTS')];
 if(key==='govf')return [...common,permit('Tổ máy đang phát G',cb&&s.stage===6&&s.workingMode==='G','G / 90M','Điều 26'),permit('43ALR NOT USE',x.alr==='NOT USE','43ALR','Điều 26')];
 if(key==='ch')return [permit('Tổ máy dừng dự phòng',s.stage===0&&!s.stopping&&!s.breaker,'STAND STILL','Phạm vi bài G/SC')];
 return [];
}
function selectorAuthority(unit){
 const p=unit.plant,s=unit.s,a=[];
 if(p.role==='AVGuest')a.push('Vai trò AVGuest chỉ giám sát.');
 if(!unit.qualityGood)a.push('Dữ liệu BAD hoặc mất truyền thông.');
 if(p.station==='UMDU'){if(p.localUnit!==unit.unit)a.push('MDU không có quyền tổ máy này.');}
 else if(p.station!==p.activeOps)a.push(p.station+' chỉ giám sát; '+p.activeOps+' giữ quyền.');
 return a;
}
function selectorBlockers(unit,kind,key,value){
 const s=unit.s,a=selectorAuthority(unit);
 const valid=kind==='switch'?SELECTOR_OPTIONS[key]?.includes(value):kind==='mode'?['REMOTE','LOCAL AUTO','TEST'].includes(value):kind==='avr'?['AUTO','MANUAL'].includes(value):kind==='gov'?['NETWORK','ISOLATED','LOAD','OPENING','FREQUENCY','INLET'].includes(value):false;
 if(!valid)return [...a,'Lựa chọn chế độ không hợp lệ.'];
 if(kind==='mode'){if(s.stopping||(s.stage>0&&s.stage<6))a.push('Không đổi 43R khi trình tự đang chạy.');return [...new Set(a)];}
 if(kind==='switch'&&['rr1','rr2','om','tac','emc','er'].includes(key))return [...new Set(a)];
 a.push(...unit.controlBlockers(kind==='switch'&&['alr','aqr','avr','jlr','jqr'].includes(key)?false:true));
 if(kind==='switch'){
  if(key==='ch'&&s.stage!==0)a.push('Chỉ đổi 43CH khi tổ máy dừng.');
  if(value==='USE')a.push(...regulatorRequirements(unit,key).filter(r=>!r.ok).map(r=>r.label+' chưa đạt.'));
 }
 if(kind==='gov'&&(s.stopping||s.lockout))a.push('Không đổi chế độ điều tốc khi dừng hoặc khóa 86.');
 if(kind==='gov'&&key==='network'&&(value!=='NETWORK'||!s.breaker))a.push('NETWORK theo trạng thái máy cắt; ISOLATED chưa có mô hình được xác minh.');
 return [...new Set(a)];
}
function setpointBlockers(unit,key){
 const s=unit.s,x=s.switches,a=unit.controlBlockers();
 if(s.rejection?.active)a.push('Đang sa thải phụ tải: chặn giá trị đặt.');if(s.lockout||s.stopping||s.guideActive)a.push('Không nhận giá trị đặt khi dừng, khóa 86 hoặc chạy bài BS/CH.');
 if(s.scReturning||['G→SC','START→SC'].includes(s.workingMode))a.push('Chờ hoàn thành chuyển chế độ.');
 const cb=unit.yes('breakerClosed',unit.devices.breaker.on);
 if(['p','manualP','jointP'].includes(key)){
  if(!cb||s.stage!==6||s.workingMode!=='G')a.push('Cần máy cắt đóng và tổ máy phát G.');
  if(s.switches.ch!=='NOT USE')a.push('43CH phải NOT USE.');
  if(key==='manualP'){
   if(x.alr!=='NOT USE')a.push('43ALR đang USE; chọn NOT USE để dùng 7-65P Raise/Lower (SH62).');
   if(!unit.yes('speed90',s.rpm>unit.plant.profile.speedExcitation*unit.plant.profile.rpm))a.push('Phản hồi tốc độ chưa đạt.');
  }else{
   if(!unit.completed.load)a.push('Chờ hoàn thành nhận tải ban đầu.');
   if(x.alr!=='USE')a.push('43ALR phải USE để đặt công suất ALR.');
   a.push(...regulatorRequirements(unit,'alr').filter(r=>!r.ok).map(r=>r.label+' chưa đạt.'));
   if(!analogHealthy(unit,'p'))a.push('Tín hiệu công suất tác dụng BAD.');
   if(key==='p'&&x.jlr==='USE')a.push('43JLR USE: đặt tại JOINT ACTIVE POWER.');
   if(key==='jointP'&&x.jlr!=='USE')a.push('43JLR phải USE để đặt công suất chung.');
   if(key==='jointP')a.push(...regulatorRequirements(unit,'jlr').filter(r=>!r.ok).map(r=>r.label+' chưa đạt.'));
  }
 }
 if(['q','jointQ'].includes(key)){
  if(!cb||!((s.stage===6&&unit.completed.load)||(s.stage===7&&unit.completed.sc)))a.push('Chờ tổ máy hoàn thành G hoặc SC.');
  if(s.avr!=='AUTO')a.push('43-90 phải AUTO.');
  if(x.aqr!=='USE')a.push('43AQR phải USE để đặt Q.');
  a.push(...regulatorRequirements(unit,'aqr').filter(r=>!r.ok).map(r=>r.label+' chưa đạt.'));
  if(!analogHealthy(unit,'q'))a.push('Tín hiệu công suất phản kháng BAD.');
  if(key==='q'&&x.jqr==='USE')a.push('43JQR USE: đặt tại JOINT REACTIVE POWER.');
  if(key==='jointQ'&&x.jqr!=='USE')a.push('43JQR phải USE để đặt Q chung.');
  if(key==='jointQ')a.push(...regulatorRequirements(unit,'jqr').filter(r=>!r.ok).map(r=>r.label+' chưa đạt.'));
 }
 if(key==='u'){if(s.avr!=='AUTO'||!s.excited)a.push('Cần 43-90 AUTO và kích từ đã làm việc.');if(x.avr!=='USE')a.push('43AVR phải USE để đặt điện áp.');}
 if(key==='e'&&s.avr!=='MANUAL')a.push('7-70E chỉ điều chỉnh khi 43-90 MANUAL.');
 if(key==='f'&&s.breaker)a.push('Máy cắt đã đóng; tăng/giảm tải bằng 7-65P.');
 return [...new Set(a)];
}

/** One read-only Permit result drives P, the value field and command buttons. */
function controlPermission(unit,key){
 const known=['manualP','p','q','u','e','f','gate','pHi','pLo','air','jointP','jointQ'].includes(key);
 const reasons=known?unit.setpointBlockers(key):['Đường điều khiển không hợp lệ.'];
 return {key,allowed:reasons.length===0,reasons,interaction:key==='manualP'?'raise-lower':'setpoint'};
}

/** Direction-specific projection: a 5X display never inherits an idle 1X timer. */
function sequenceDisplay(unit,direction='start'){
 const s=unit.s,q=unit.sequence,c=unit.completed,stop=direction==='stop';
 const matching=stop?(s.stopping||s.stopComplete):!s.stopping&&!s.stopComplete&&q.kind!=='trip';
 const running=matching&&(stop?s.stopping:(q.kind==='start'||q.kind==='return'||q.kind==='rejection')&&!q.done&&s.stage>0);
 const active=!matching?-1:stop?(s.stopping?s.stopStep:6):s.scReturning?(q.phase==='return.load'?6:5):s.stage;
 const completed=stop?Array.from({length:7},(_,n)=>matching&&(s.stopComplete||s.stopping&&n<s.stopStep)):[s.stage===0&&!s.lockout,!!c.prep,!!c.inlet,!!c.turbine,!!c.excitation,!!c.parallel,!!c.load&&s.loadLight,!!c.sc];
 const state=n=>!matching?'idle':running&&n===active?'running':completed[n]?'complete':'idle';
 let metricKeys=[];
 if(matching){if(stop)metricKeys=[['p','q','gate'],['breaker'],['kv','excV'],['rpm','gate','eBrake','mBrake'],['inlet','bypass','seal'],['coolingPump','lift','mBrake','rpm'],['rpm','inlet','gate']][active]||[];
  else metricKeys=s.scReturning?['q','inlet','draft','p']:({1:['waterPressure','coolingPosition','liftPressure','lift'],2:['bypass','deltaP','seal','inlet'],3:['rpm','gate','lift'],4:['kv','excV','excited'],5:['df','angle','kv','breaker'],6:['p','pSet','p92Time'],7:['gate','inlet','draft','air']}[active]||[]);}
 const metrics={waterPressure:['NKT HEADER','MPa'],coolingPosition:['88CWV','%'],liftPressure:['63QT','p.u. OTS'],lift:['88QT','ON/OFF'],bypass:['33BS','%'],deltaP:['INLET ΔP','%'],seal:['SEAL','%'],inlet:['33S','%'],rpm:['TURBINE SPEED','RPM'],gate:['65S','%'],kv:['GEN VOLTAGE','kV'],excV:['EXCITATION','V'],excited:['41 FIELD CB','ON/OFF'],df:['Δf','Hz'],angle:['PHASE ANGLE','°'],breaker:['90M CB','CLOSE/OPEN'],p:['ACTIVE POWER','MW'],q:['REACTIVE POWER','MVAr'],pSet:['LOAD REFERENCE','MW'],p92Time:['TON 92P','s'],draft:['DRAFT WATER LEVEL','m'],air:['SC AIR','kg/cm²'],eBrake:['ELECTRIC BRAKE','ON/OFF'],mBrake:['MECHANICAL BRAKE','ON/OFF'],coolingPump:['NKT PUMP','ON/OFF']};
 return {direction,matching,running,active,states:Array.from({length:stop?7:9},(_,n)=>state(n)),phase:matching?(s.stopComplete?'STOP COMPLETE':q.phase||(s.stage===0?'STAND STILL':'STEADY '+s.workingMode)):'',elapsed:matching&&running?q.elapsed:0,phaseTime:matching&&running?q.phaseTime:0,limit:matching&&q.kind!=='idle'?q.limit:0,timeout:matching&&s.stepTimedOut,done:matching&&(s.stopComplete||q.done),requirements:matching&&!s.stopComplete?q.requirements:[],metrics:metricKeys.map(key=>({key,label:metrics[key][0],unit:metrics[key][1],value:key==='p92Time'?Math.min(s[key],unit.plant.profile.p92Delay):s[key]}))};
}


// MODULE: engine
const FAULTS={...CONTROL_FAULTS,...EXTRA_FAULTS};
const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
const unitTags={waterOpen:'U1V_1DI0351',liftRun:'U1V_1DI0401',liftPressure:'U1V_1DI0285',heaterOn:'U1V_1DI0403',upperLow:'U1V_1DI0279',lowerLow:'U1V_1DI0281',airLow:'U1V_1DI0283',
 inletOpen:'U1V_1DI0293',inletClosed:'U1V_1DI0294',brakeReleased:'U1V_1DI0276',speed90:'U1V_1DI0313',
 breakerClosed:'U1V_1DI0149',breakerOpen:'U1V_1DI0150',gateClosed:'U1V_1DI0316',waterDepressed:'U1V_1DI0391',governorLoad:'U1V_1DI0305',avrAuto:'U1V_1DI0110'};
// Training duty cycle shared by all displays, using simulation seconds.
function drainPumpState(plant,name){
 const running=plant.units.some(u=>u.s.rpm>.1),t=plant.service.drainElapsed||0,slot=Math.floor((t+1e-7)/180),phase=(t+1e-7)%180;
 const lead=slot%2===0?1:2,on=running&&phase<60&&(name==='DOP'||Number(name.slice(-1))===lead);
 return {on,bad:!plant.communicationOK,lead,phase,remaining:phase<60?60-phase:180-phase};
}

// Edge-based SOE: observe the model, never create events from animation or analogue noise.
function soeSnapshot0425(p){
 const values=new Map(),add=(area,key,label,value,quality='GOOD',kind='SIGNAL',tag='',source='OTS',initial=false)=>{
  if(value===undefined||value===null)return;
  values.set(area+':'+key,{area,key,label,state:typeof value==='boolean'?(value?'ON':'OFF'):String(value),quality,kind,tag:tag||'OTS:'+key,source,initial});
 };
 for(const u of p.units){
  const st=u.s,area='UNIT-'+u.unit,quality=u.qualityGood?'GOOD':'BAD';
  for(const [key,d]of Object.entries(u.devices||{})){
   if(d.kind==='motor')add(area,'H'+u.unit+'.'+key+'.RUN',d.name+' · '+(/CB|FIELD/.test(d.name)?'CLOSED':'RUN'),d.on,quality,'FEEDBACK');
   else{add(area,'H'+u.unit+'.'+key+'.OPEN',d.name+' · OPEN LIMIT',d.on,quality,'FEEDBACK');add(area,'H'+u.unit+'.'+key+'.CLOSED',d.name+' · CLOSED LIMIT',d.closed,quality,'FEEDBACK');}
  }
  for(const [key,value]of Object.entries(st.signals||{})){
   const ref=SEQUENCE_INPUT0411[key],input=ref?u.raw(ref[0],ref[2]?!value:value):{value,quality};
   const address=u.unit===1?(ref?.[1]||SEQUENCE_DIRECT_DI0411[key]||''):({cbOpen:'SYV_2DI0150',inletClosed:'ALV_2DI0294'}[key]||'');
   const label=({startCondition:'STARTING CONDITION AVAILABLE',auxStart:'AUXILIARY START CONDITION',coolingValve:'COOLING WATER VALVE OPEN',coolingGood:'COOLING WATER FLOW NORMAL',lift:'OIL LIFT PUMP RUN',heaterOff:'SPACE HEATER ON',liftPressure:'JACKING OIL PRESSURE NORMAL',flowUpper:'UPPER GUIDE BEARING WATER FLOW LOW',flowLower:'LOWER GUIDE BEARING WATER FLOW LOW',flowAir:'GENERATOR AIR COOLER WATER FLOW LOW',inletOpen:'INLET VALVE OPEN',bypassClosed:'BYPASS VALVE CLOSED',speed90:'UNIT SPEED > '+Math.round(p.profile.speedExcitation*100)+'%',voltage90:'GENERATOR VOLTAGE > 90%',excited:'FIELD BREAKER CLOSED',breaker:'GENERATOR BREAKER CLOSED',p5:'92P LOAD DETECTED',q5:'REACTIVE POWER STOP CONDITION',gateClosed:'GUIDE VANES CLOSED',inletClosed:'INLET VALVE CLOSED',draftLow:'DRAFT TUBE WATER DEPRESSED',cbOpen:'GENERATOR BREAKER OPEN',excOff:'FIELD BREAKER OPEN',eBrake:'ELECTRIC BRAKE ON',mBrake:'MECHANICAL BRAKE ON',auxStopped:'AUXILIARY STOP CONDITION',standstill:'UNIT STANDSTILL',noLoad:'GUIDE VANES NO LOAD POSITION',stopP:'ACTIVE POWER STOP CONDITION'})[key]||key;
   add(area,'H'+u.unit+'.signal.'+key,label,input.value,quality==='BAD'||input.quality==='BAD'?'BAD':'GOOD','SIGNAL',address,address?'PLC REF / OTS':'OTS');
  }
  for(const part of [1,2])for(const [index,c]of u.conditions(part).entries()){
   const ref=c.refs?.find(x=>x.role.startsWith('DI'));
   add(area,'H'+u.unit+'.condition.'+part+'.'+index,c.tag,c.raw,c.quality,'CONDITION',ref?.address,ref?'PLC REF / OTS':'OTS');
  }
  add(area,'H'+u.unit+'.stage','MAIN SEQUENCE STEP',STAGES[st.stage]?.en||st.stage,quality,'SEQUENCE');
  add(area,'H'+u.unit+'.phase','SEQUENCE PHASE',u.sequence?.phase||'idle',quality,'SEQUENCE');
  add(area,'H'+u.unit+'.done','SEQUENCE FEEDBACK COMPLETE',!!u.sequence?.done,quality,'SEQUENCE');
  add(area,'H'+u.unit+'.stopComplete','NORMAL STOP COMPLETE',!!st.stopComplete,quality,'SEQUENCE');
  add(area,'H'+u.unit+'.86_1_1','86-1(1) OPERATE · 5E LATCH',st.lockout,quality,'PROTECTION',u.unit===1?'U1V_1DI0157':'');
  for(const [k,v]of Object.entries(st.switches||{}))add(area,'H'+u.unit+'.selector.'+k,'SELECTOR '+k,v,quality,'SELECTOR');
  for(const k of ['mode','avr','govMode','syncMode','workingMode','pSet','qSet','uSet','fSet','gateLimit'])add(area,'H'+u.unit+'.'+k,k,st[k],quality,['pSet','qSet','uSet','fSet','gateLimit'].includes(k)?'SETPOINT':'SELECTOR');
  for(const r of u.sequence?.requirements||[])add(area,'H'+u.unit+'.requirement.'+u.sequence.phase+'.'+r.label,r.label,r.ok,quality==='BAD'||r.quality==='BAD'?'BAD':'GOOD','PERMISSIVE',r.tag,'OTS',true);
  for(let k=0;k<QUICK_INPUTS0411.length;k++){
   const address=u.unit===1?(k===18?'':k===19?'U1V_2PDI0070':QUICK_INPUTS0411[k][1]):'',raw=k===13?st.rpm>.1:k===26?st.lockout:address&&Object.hasOwn(st.di,address)?st.di[address]:null;
   const q=quickSimulationState0423(u,'quick',k,raw,quality==='BAD'||address&&st.sensorFaults[address]?'BAD':'GOOD');
   add(area,'H'+u.unit+'.quick.'+k,QUICK_INPUTS0411[k][0],k===26&&st.lockout?true:q.raw,q.quality,'SIGNAL',address,address?'PLC REF / OTS':'OTS');
  }
  for(const [k,label]of Object.entries(QUICK_OUTPUT_LABELS0423)){const q=quickSimulationState0423(u,'quickoutput',k,null,quality);add(area,'H'+u.unit+'.quickoutput.'+k,label,q.raw,q.quality,'SIGNAL');}
 }
 const quality=p.communicationOK?'GOOD':'BAD';
 for(const [i,d]of p.cooling.pumps.entries())add('AUXILIARY','CWP'+(i+1),'CWP'+(i+1)+' RUN',d.on,quality,'FEEDBACK');
 for(const name of ['DOP','DP1','DP2','DWP1','DWP2'])add('AUXILIARY',name,name+' RUN',drainPumpState(p,name).on,quality,'FEEDBACK');
 for(const [key,value]of Object.entries(p.network))add('SYSTEM',key,'DCS '+key.toUpperCase(),value,'GOOD','NETWORK');
 for(const [id,item]of Object.entries(p.equipment.items))add(/^(CB2|DS2|ES2)/.test(id)?'SWITCHYARD':'AUXILIARY',id,id+' CLOSED',!!item.value,item.bad||quality==='BAD'?'BAD':'GOOD','FEEDBACK',id);
 add('AUXILIARY','SERVICE_SOURCE','STATION SERVICE SOURCE',p.service.source,quality,'SERVICE');add('AUXILIARY','DG','DIESEL GENERATOR RUN',p.diesel,quality,'FEEDBACK');
 return values;
}
function recordSoeEdges0425(p){
 const current=soeSnapshot0425(p),previous=p._soeSnapshot;
 p._soeSnapshot=current;if(!previous)return;
 for(const [key,next]of current){
  const before=previous.get(key);if(!before&&!next.initial)continue;
  const qualityChanged=before&&before.quality!==next.quality;
  if(!qualityChanged&&before&&(next.quality==='BAD'||before.state===next.state))continue;
  const state=next.quality==='BAD'?'BQ':next.state,old=before?(before.quality==='BAD'?'BQ':before.state):'—';
  const kind=qualityChanged?'QUALITY':next.kind,detail={tag:next.tag,state,previous:old,quality:next.quality,source:next.source};
  const message=next.label+' · '+old+' → '+state;
  const unit=/^UNIT-([12])$/.exec(next.area);
  if(unit)p.units[+unit[1]-1].log(kind,message,true,detail);else p.record(kind,message,next.area,detail);
 }
}
function soeTime0425(t){const ms=Math.max(0,Math.round(t*1000)),s=Math.floor(ms/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':')+'.'+String(ms%1000).padStart(3,'0');}

class Plant extends ControlPlant {
 constructor(){super();this.profile=clone(PROFILE);this.t=0;this.events=[];this.alarms=[];this.nextEventId=1;this.nextAlarmId=1;
  this.units=[new Simulator(this,1),new Simulator(this,2)];this.cooling=new CoolingSystem(this);
  this.yard={gridPath:true};this.session=null;this.schedule=[];this.sessionState='SETUP';this.service={source:1,available:[true,true,true],voltage:400,dgCommand:false,dgElapsed:0,transferTime:0,phase:'NORMAL',drainElapsed:0};this.equipment=new PlantEquipment(this);
 }
 tick(dt){
  if(!finite(dt,0,1))throw new Error('dt phải trong 0…1 giây.');
  this.t+=dt;this.equipment.tick(dt);this.penstock.actual=approach(this.penstock.actual,this.penstock.target,5,dt);
  this.cooling.tick(dt);this.tickService(dt);this.units.forEach(u=>u.tick(dt));
  this.service.drainElapsed=this.units.some(u=>u.s.rpm>.1)?this.service.drainElapsed+dt:0;
  for(const item of this.schedule){if(item.fired)continue;const u=this.units[item.unit];
   const due=item.trigger==='time'?this.t>=item.after:u.s.stage===item.stage&&u.s.stageTime>=item.after;
   if(due){item.fired=true;if(item.key==='nktCommon'){this.cooling.fault=true;this.record('INSTRUCTOR','Mất nguồn nước/góp NKT chung.','AUXILIARY');}else u.setFault(item.key,true);}
  }
  recordSoeEdges0425(this);
 }
 validateSession(input){
  if(!input||typeof input!=='object')throw new Error('Cấu hình bài không hợp lệ.');
  const c={...clone(DEFAULT_SESSION),...clone(input),dynamics:{...PROFILE.dynamics,...input.dynamics}};
  c.thermal=validateThermalConfig(input.thermal);
  if(!Object.hasOwn(LESSON_CATALOG,c.lesson)||![0,1].includes(c.unit)||!['guided','practice','exam'].includes(c.method))throw new Error('Bài tập hoặc hình thức không hợp lệ.');
  if(!Array.isArray(c.states)||c.states.length!==2||c.states.some(v=>!['stopped','G','SC'].includes(v)))throw new Error('Cần trạng thái hợp lệ cho cả H1 và H2.');
  if(c.states.includes('G')&&c.states.includes('SC'))throw new Error('Theo Điều 20, cấu hình bài không phối hợp một tổ G và một tổ SC.');
  if(['startup','sc_start','blocked','prep','bs','ch'].includes(c.lesson)&&c.states[c.unit]!=='stopped')throw new Error('Bài này yêu cầu tổ máy thực hành đang dừng dự phòng.');
  if(c.lesson==='stop'&&c.states[c.unit]==='stopped')throw new Error('Bài dừng máy cần khởi tạo tổ máy đang phát hoặc đang bù.');
  if(['steady','agc'].includes(c.lesson)&&c.states[c.unit]!=='G')throw new Error('Bài vận hành/AGC cần khởi tạo tổ máy đang phát G.');
  if(c.lesson==='sc'&&c.states[c.unit]==='stopped')throw new Error('Bài chuyển G ↔ SC cần tổ máy đang phát hoặc đang bù.');
  if(!['OPS1','OPS2','U1MDU','U2MDU'].includes(c.location)||![1,2,5,10].includes(c.speed))throw new Error('Trạm hoặc tốc độ mô phỏng không hợp lệ.');
  if(!['jblock','procedure'].includes(c.speedBasis))throw new Error('Căn cứ tốc độ không hợp lệ.');
  if(!finite(c.pTarget,10,105)||!finite(c.qTarget,-35,35))throw new Error('P/Q nằm ngoài phạm vi bài tập.');
  for(const [key,v] of Object.entries(c.dynamics))if(!Object.hasOwn(PROFILE.dynamics,key)||!finite(v,.1,600))throw new Error('Thời gian mô phỏng không hợp lệ: '+key);
  if(!c.fault||!['none','nktCommon',...Object.keys(FAULTS)].includes(c.fault.key)||![0,1].includes(c.fault.unit)||!['time','stage'].includes(c.fault.trigger)||!Number.isInteger(c.fault.stage)||c.fault.stage<0||c.fault.stage>7||!finite(c.fault.after,0,7200))throw new Error('Cấu hình sự cố không hợp lệ.');
  c.operator=String(c.operator||'').slice(0,80);return c;
 }
 configure(input){
  const c=this.validateSession(input); // validate every field before mutating a running plant
  this.profile=clone(PROFILE);this.profile.dynamics=c.dynamics;this.profile.speedExcitation=c.speedBasis==='procedure'?.95:.9;this.profile.illustrativeTrips=!!c.illustrativeTrips;
  this.t=0;this.events=[];this.alarms=[];this.nextEventId=1;this.nextAlarmId=1;this.network={onet1:true,onet2:true,cnet1:true,cnet2:true,server1:true,server2:true,ops1:true,ops2:true};
  this.penstock={actual:100,target:100,signal:true,forced:false,observer:false,remote:true,locked:false,oilOK:true};
  this.station=c.location.startsWith('U')?'UMDU':c.location;this.localUnit=c.location.startsWith('U')?Number(c.location[1]):c.unit+1;
  this.activeOps=c.location==='OPS2'?'OPS2':'OPS1';this.role='AVOperator';this.frequencyOffset=0;this.yard={gridPath:true};
  this.session=c;this.schedule=[];this.diesel=false;this.service={source:1,available:[true,true,true],voltage:400,dgCommand:false,dgElapsed:0,transferTime:0,phase:'NORMAL',drainElapsed:0};
  this.units.forEach((u,i)=>{u.reset(c.states[i]==='stopped'?'startup':c.states[i]==='SC'?'SC':'steady');u.scenario=i===c.unit?c.lesson:'steady';u.s.switches.om=this.station==='UMDU'?'UMDU':'OPS';u.s.pSet=c.states[i]==='G'?c.pTarget:this.profile.pInitial;u.s.qSet=c.qTarget;if(c.states[i]==='G'){u.s.p=u.s.pBase=c.pTarget;u.s.q=u.s.qBase=c.qTarget;u.devices.gate.set(clamp(10+c.pTarget/this.profile.pRated*83,0,u.s.gateLimit));u.s.gate=u.devices.gate.value;}else if(c.states[i]==='SC'){u.s.q=u.s.qBase=c.qTarget;}u.s.thermal=createThermalState(u.s,i+1,c.thermal,c.thermal.initial[i],c.pTarget,c.qTarget);u.s.temp=thermalBearingMaximum(u.s.thermal);});
  this.cooling.reset();this.units.forEach((u,i)=>{const on=c.states[i]!=='stopped';this.cooling.requests[i]=on;this.cooling.pumps[i].set(+on);});this.cooling.header=c.states.some(x=>x!=='stopped')?.45:0;
  this.equipment.reset();this.units.forEach(u=>{u.s.history=[];u.sample();});
  if(c.lesson==='blocked')this.units[c.unit].setFault('valve',true);
  if(c.lesson==='prep')this.units[c.unit].setFault('prep',true);
  if(c.lesson==='cooling'&&c.fault.key==='none')this.schedule.push({key:'cooling',unit:c.unit,trigger:'time',after:30,stage:6,fired:false});
  if(c.fault.key!=='none')this.schedule.push({...c.fault,fired:false});
  this._soeSnapshot=soeSnapshot0425(this);this.sessionState='RUNNING';this.record('SESSION','Bắt đầu bài: '+LESSON_CATALOG[c.lesson][0]+' · '+(c.operator||'Học viên')+'.');
  return {ok:true,message:'Đã khởi tạo bài cho cả hai tổ máy.'};
 }
 tickService(dt){
  const a=this.service;a.dgElapsed=a.dgCommand?a.dgElapsed+dt:0;this.diesel=a.dgCommand&&a.dgElapsed>=8;
  if(a.source===4&&!this.diesel){a.source=0;a.phase='TRANSFER';a.transferTime=0;this.record('SERVICE','Nguồn DG mất; điện tự dùng gián đoạn trong mô hình.','AUXILIARY');}
  if(a.source>=1&&a.source<=3&&!a.available[a.source-1]){a.source=0;a.phase='TRANSFER';a.transferTime=0;this.record('SERVICE','Mất nguồn tự dùng; bắt đầu chuyển nguồn mô phỏng.','AUXILIARY');}
  if(a.phase==='TRANSFER'){a.transferTime+=dt;if(a.transferTime>=3){const next=a.available.findIndex(Boolean);if(next>=0){a.source=next+1;a.phase='NORMAL';this.record('SERVICE','Đã nhận nguồn tự dùng ST'+a.source+' — mô hình chức năng giản lược.','AUXILIARY');}else{a.dgCommand=true;if(this.diesel){a.source=4;a.phase='DG';}}}}
  a.voltage=a.source>0?400:0;this.alarm('SERVICE_LOSS',a.voltage===0,'Mất điện tự dùng mô phỏng; kiểm tra nguồn và chuyển nguồn.');
 }
 exportState(){return {format:'AVC-OTS-04',version:3,equipment:this.equipment.snapshot(),config:clone(this.session||DEFAULT_SESSION),
  plant:{t:this.t,events:clone(this.events),alarms:clone(this.alarms),nextEventId:this.nextEventId,nextAlarmId:this.nextAlarmId,network:clone(this.network),penstock:clone(this.penstock),service:clone(this.service),station:this.station,activeOps:this.activeOps,role:this.role,localUnit:this.localUnit,frequencyOffset:this.frequencyOffset,schedule:clone(this.schedule),yard:clone(this.yard)},
  cooling:{requests:clone(this.cooling.requests),source:this.cooling.source,header:this.cooling.header,fault:this.cooling.fault,manualReserve:this.cooling.manualReserve,demandAge:this.cooling.demandAge,pumps:this.cooling.pumps.map(d=>d.snapshot())},
  units:this.units.map(u=>({scenario:u.scenario,s:clone(u.s),sequence:clone(u.sequence),completed:clone(u.completed),devices:Object.fromEntries(Object.entries(u.devices).map(([k,d])=>[k,d.snapshot()])),nextEvent:u.nextEvent,nextAlarm:u.nextAlarm}))};}
 importState(data){
  if(!data||data.format!=='AVC-OTS-04'||![1,2,3].includes(data.version))throw new Error('Sai định dạng phiên AVC OTS 04.');
  this.validateSession(data.config);
  if(data.plant?.service?.drainElapsed===undefined){data=clone(data);data.plant.service.drainElapsed=0;}
  if(!finite(data.plant?.service?.drainElapsed,0,1e9))throw Error('Chu kỳ bơm tiêu nước không hợp lệ.');
  if(data.version<3){data=clone(data);for(const v of data.units||[]){if(v.s&&!v.s.rejection)v.s.rejection=createRejectionState(this.profile.rpm);}}
  if(data.equipment!==undefined){
   if([1,2].includes(data.equipment.schema)){
    data=clone(data);const saved=data.equipment;
    if(!saved.items||typeof saved.items!=='object'||Array.isArray(saved.items))throw Error('Thiếu thiết bị trạm trong phiên cũ');
    for(const [id,,,on]of REAL_EXTRA_SERVICE_DEVICES)if(!Object.hasOwn(saved.items,id))saved.items[id]={value:+on,target:+on,elapsed:0,moving:false,failed:false,bad:false,ready:true,timeout:false};
    saved.schema=3;saved.topology='AVC-SY-HMI-C25-SS-v3';
   }
   PlantEquipment.validate(data.equipment);
  }
  // Require the complete supported shape, reject non-finite/deep/oversized data before assignment.
  if(JSON.stringify(data).length>5000000||!data.plant||!finite(data.plant.t,0,1e9)||!Array.isArray(data.units)||data.units.length!==2||!data.cooling)throw new Error('Dữ liệu phiên không đầy đủ.');
  const probe=new Plant();probe.configure(data.config);const expected=probe.exportState();
  if(data.version===1){
   data=clone(data);data.config=this.validateSession(data.config);
   for(let i=0;i<2;i++){const saved=data.units[i]?.s;if(!saved)throw new Error('Thiếu tổ máy trong phiên cũ.');if(!saved.thermal){saved.thermal=createThermalState(saved,i+1,data.config.thermal,'auto',data.config.pTarget,data.config.qTarget);saved.thermal.initial='legacy';if(finite(saved.temp,-20,220))for(const c of THERMAL_CHANNELS)if(['upper','lower','thrust','turbine'].includes(c.kind))saved.thermal.values[c.key]=saved.temp+c.offset;saved.temp=thermalBearingMaximum(saved.thermal);}}
  }
  function check(actual,template,path='',depth=0){
   if(depth>20||actual===undefined||actual===null&&template!==null)throw new Error('Thiếu dữ liệu '+path);
   if(typeof template==='number'){if(!Number.isFinite(actual)||Math.abs(actual)>1e12)throw new Error('Số không hợp lệ '+path);}
   else if(typeof template==='boolean'){if(typeof actual!=='boolean')throw new Error('Bit không hợp lệ '+path);}
   else if(typeof template==='string'){if(typeof actual!=='string'||actual.length>2000)throw new Error('Chuỗi không hợp lệ '+path);}
   else if(Array.isArray(template)){if(!Array.isArray(actual)||actual.length>5000)throw new Error('Danh sách không hợp lệ '+path);if(template.length&&path.includes('devices'))actual.forEach((v,i)=>check(v,template[0],path+'.'+i,depth+1));}
   else if(template&&typeof template==='object'){if(!actual||typeof actual!=='object'||Array.isArray(actual))throw new Error('Đối tượng không hợp lệ '+path);for(const k of Object.keys(template))check(actual[k],template[k],path+'.'+k,depth+1);}
  }
  check(data.plant,expected.plant,'plant');check(data.cooling,expected.cooling,'cooling');
  data.units.forEach((v,i)=>{check(v,expected.units[i],'units.'+i);if(!Number.isInteger(v.s.stage)||v.s.stage<0||v.s.stage>7||!finite(v.s.rpm,0,1000)||!finite(v.s.p,-10,150)||!Array.isArray(v.s.events)||!Array.isArray(v.s.history)||!Array.isArray(v.s.alarms))throw new Error('Trạng thái tổ máy không hợp lệ.');for(const d of Object.values(v.devices))if(!finite(d.value,0,100)||!finite(d.target,0,100))throw new Error('Vị trí thiết bị không hợp lệ.');});
  const bools=(xs,n)=>Array.isArray(xs)&&xs.length===n&&xs.every(v=>typeof v==='boolean');
  if(!bools(data.cooling.requests,2)||!Array.isArray(data.cooling.pumps)||data.cooling.pumps.length!==3||!finite(data.cooling.header,0,2)||!bools(data.plant.service.available,3)||!Number.isInteger(data.plant.service.source)||data.plant.service.source<0||data.plant.service.source>4)throw new Error('Dữ liệu hệ thống chung không hợp lệ.');
  if(data.plant.yard.auxiliaryNormal!==undefined&&typeof data.plant.yard.auxiliaryNormal!=='boolean')throw new Error('Trạng thái AL-LCU không hợp lệ.');
  for(const d of data.cooling.pumps){check(d,expected.cooling.pumps[0],'cooling.pump');if(![0,1].includes(d.value)||![0,1].includes(d.target))throw new Error('Phản hồi bơm không hợp lệ.');}
  for(const item of data.plant.schedule){this.validateSession({...DEFAULT_SESSION,fault:item});if(typeof item.fired!=='boolean')throw new Error('Lịch sự cố không hợp lệ.');}
  const eventOK=x=>x&&finite(x.t,0,1e9)&&typeof x.message==='string'&&x.message.length<=2000&&typeof x.kind==='string'&&/^[A-Z_]{1,30}$/.test(x.kind)&&(!x.area||['SYSTEM','AUXILIARY','SWITCHYARD','GATEWAY','UNIT-1','UNIT-2'].includes(x.area));
  if(!data.plant.events.every(eventOK)||!data.plant.alarms.every(x=>x&&typeof x.code==='string'&&typeof x.active==='boolean'&&typeof x.ack==='boolean'&&typeof x.message==='string'&&x.message.length<=2000))throw new Error('Nhật ký hoặc cảnh báo không hợp lệ.');
  for(let i=0;i<2;i++){const v=data.units[i],s=v.s;
   validateThermalState(s.thermal);const lr=s.rejection;if(!lr||!['idle','close','hold','recover','complete','aborted'].includes(lr.phase)||!finite(lr.speedPU,.2,2.2)||!finite(lr.rejectedMW,0,150)||!finite(lr.hydraulicPowerPU,0,5)||!finite(lr.elapsed,0,1e9)||!finite(lr.integral,-.3,.3)||!finite(lr.peakRPM,0,1000)||!Array.isArray(lr.trace)||lr.trace.length>2400||lr.trace.some(r=>!r||!finite(r.t,0,1e9)||!finite(r.rpm,0,1000)||!finite(r.gate,0,100)||!finite(r.p,-10,150)||!finite(r.pm,0,525)))throw Error('Dữ liệu quá độ sa thải không hợp lệ.');
   if(!finite(s.temp,-20,220)||Math.abs(s.temp-thermalBearingMaximum(s.thermal))>1e-6)throw new Error('Nhiệt độ ổ tổng hợp không khớp các kênh đã lưu.');
   if(!['REMOTE','LOCAL AUTO','TEST'].includes(s.mode)||!['AUTO','MANUAL'].includes(s.avr)||!['AUTO','MANUAL'].includes(s.syncMode)||!['G','SC','G→SC','START→SC','SC→G'].includes(s.workingMode)||!Object.hasOwn(LESSON_CATALOG,v.scenario)&&!['SC'].includes(v.scenario))throw new Error('Chế độ tổ máy không hợp lệ.');
   if(!['idle','start','stop','return','trip','rejection'].includes(v.sequence.kind)||!/^[a-z.\-]*$/.test(v.sequence.phase)||!Array.isArray(v.sequence.requirements)||v.sequence.requirements.some(r=>typeof r.label!=='string'||r.label.length>200||typeof r.ok!=='boolean'||typeof r.tag!=='string'))throw new Error('Trình tự trong phiên không hợp lệ.');
   if(!s.events.every(eventOK)||s.history.some(r=>!r||!finite(r.t,0,1e9)||!finite(r.rpm,0,1000)||!finite(r.p,-10,150)))throw new Error('Dữ liệu lịch sử tổ máy không hợp lệ.');
   for(const row of s.history){for(const key of THERMAL_TREND_KEYS)if(Object.hasOwn(row,key)&&row[key]!==null&&!finite(row[key],-20,220))throw new Error('Lịch sử nhiệt không hợp lệ: '+key);if(row.thermalMode!==undefined&&!Object.hasOwn(THERMAL_MODES,row.thermalMode))throw new Error('Chế độ nhiệt trong lịch sử không hợp lệ.');}
   for(const dict of [s.di,s.sensorFaults])if(!dict||Object.entries(dict).some(([k,v])=>k.length>120||typeof v!=='boolean'||['__proto__','constructor','prototype'].includes(k)))throw new Error('Tín hiệu đầu vào không hợp lệ.');
   for(const [k,d] of Object.entries(v.devices)){const kind=probe.units[i].devices[k]?.kind;if(!kind||kind==='motor'&&(![0,1].includes(d.value)||![0,1].includes(d.target)))throw new Error('Thiết bị trong phiên không hợp lệ.');}
  }
  // Unknown keys are never copied into prototypes or model objects.
  this.configure(data.config);for(const k of Object.keys(expected.plant))this[k]=clone(data.plant[k]);
  this.cooling.requests=clone(data.cooling.requests);for(const k of ['source','header','fault','manualReserve','demandAge'])this.cooling[k]=data.cooling[k];this.cooling.pumps.forEach((d,i)=>d.restore(data.cooling.pumps[i]));
  this.units.forEach((u,i)=>{const v=data.units[i];u.s=clone(v.s);u.scenario=v.scenario;u.sequence=clone(v.sequence);u.completed=clone(v.completed);u.nextEvent=v.nextEvent;u.nextAlarm=v.nextAlarm;Object.keys(u.devices).forEach(k=>u.devices[k].restore(v.devices[k]));});
  if(data.equipment)this.equipment.restore(data.equipment);
  this._soeSnapshot=soeSnapshot0425(this);this.sessionState='PAUSED';return {ok:true,message:'Đã nạp phiên; đang tạm dừng để kiểm tra.'};
 }
}

class Simulator extends ControlUnit {
 constructor(plant,unit){super(plant,unit);this.reset('startup');}
 reset(scenario='startup'){
  super.reset(scenario==='SC'?'steady':scenario);const s=this.s,p=this.plant.profile||PROFILE,d=p.dynamics;
  for(const k of Object.keys(FAULTS))if(!(k in s.faults))s.faults[k]=false;
  const online=s.breaker,sc=scenario==='SC';s.pSet=online?s.pSet:p.pInitial;s.qSet=online?s.qSet:0;
  s.cbCommand=null;s.seqFlags={};s.deviceFaults={};s.flowUpper=online;s.flowLower=online;s.flowAir=online;s.waterFlow=online?100:0;s.coolingPosition=online?100:0;s.heater=online?false:true;
  s.p92Time=online?1:0;s.loadLight=online&&!sc;s.load10=online&&!sc;s.waterPressure=online?.45:0;s.bypass=0;s.deltaP=online?0:100;
  s.sub=0;s.stopStep=0;s.profileId=p.id;s.lamp={};s.signals={};s.brakeSeen={electric:false,mechanical:false};s.brakeRequired=false;
  this.completed={prep:online,inlet:online&&!sc,turbine:online&&!sc,excitation:online,parallel:online,load:online&&!sc,sc};
  const emit=(kind,msg,detail)=>this.log(kind,msg,true,detail);
  this.devices={
   waterValve:new Device('88CWV',{value:online?100:0,openTime:d.waterValve},emit),
   lift:new Device('88QT',{kind:'motor',value:0,openTime:d.liftStart,closeTime:d.liftStop},emit),
   bypass:new Device('33BS',{value:0,openTime:d.bypass},emit),seal:new Device('SEAL',{value:0,openTime:d.seal},emit),
   inlet:new Device('33S',{value:online&&!sc?100:0,openTime:d.inlet},emit),gate:new Device('65S / GUIDE VANE',{value:online&&!sc?78:0,openTime:d.gate},emit),
   field:new Device('41 / FIELD CB',{kind:'motor',value:+online,openTime:2,closeTime:1},emit),
   breaker:new Device('CB'+(this.unit===1?'901':'902'),{kind:'motor',value:+online,openTime:d.breaker},emit),
   eBrake:new Device('ELECTRIC BRAKE',{kind:'motor',openTime:d.brake},emit),mBrake:new Device('MECHANICAL BRAKE',{kind:'motor',openTime:d.brake},emit),
   air:new Device('KN-3VĐ2',{value:0,openTime:d.airValve},emit),vent:new Device('KN-3VĐ4',{value:0,openTime:d.airValve},emit)
  };
  s.rejection=createRejectionState(p.rpm);this.sequence={kind:'idle',phase:'',phaseTime:0,elapsed:0,limit:0,done:online,requirements:[],timerEnabled:false};
  if(sc){s.stage=7;s.target=7;s.workingMode='SC';s.p=s.pBase=-.8;s.gate=0;s.inlet=0;s.draft=47.7;s.stageDone=true;}
  if(!online||sc)s.switches.alr='NOT USE';
  if(!online)s.switches.aqr='NOT USE';
  this.syncDevices();s.thermal=createThermalState(s,this.unit,this.plant.session?.thermal||DEFAULT_THERMAL);s.temp=thermalBearingMaximum(s.thermal);s.history=[];this.sample();this.updateSignals();return s;
 }
 selectorBlockers(kind,key,value){return selectorBlockers(this,kind,key,value);}
 setpointBlockers(key){return setpointBlockers(this,key);}
 setMode(value){const a=this.selectorBlockers('mode','mode',value);if(a.length)return this.reject(a.join('; '));return super.setMode(value);}
 setSwitch(key,value){
  if(!SELECTOR_OPTIONS[key]?.includes(value))return this.reject('Giá trị khóa không hợp lệ.');
  const a=this.selectorBlockers('switch',key,value);if(a.length)return this.reject(a.join('; '));
  const previous=this.s.switches[key],r=super.setSwitch(key,value);if(r.ok){if(previous==='USE'&&value==='NOT USE')this.holdRegulator(key);this.refreshRegulation();}return r;
 }
 setAvr(value){const a=this.selectorBlockers('avr','avr',value);if(a.length)return this.reject(a.join('; '));const r=super.setAvr(value);if(r.ok)this.refreshRegulation();return r;}
 setGovernor(value){const a=this.selectorBlockers('gov',value==='NETWORK'?'network':'gov',value);if(a.length)return this.reject(a.join('; '));if(value==='NETWORK')return this.result('NETWORK: tổ máy đang nối lưới; chế độ điều chỉnh hiện tại '+this.s.govMode+'.');this.s.govMode=value;this.log('COMMAND','GOV MODE → '+value);this.refreshRegulation();return this.result('GOV MODE: '+value);}
 holdRegulator(key){const s=this.s;if(key==='alr')s.pSet=clamp(s.pBase,0,s.pHi);if(key==='aqr')s.qSet=clamp(s.qBase,-35,35);if(key==='avr'&&s.kvBase>0)s.uSet=clamp(s.kvBase,13.6,14.2);}
 refreshRegulation(){
  const s=this.s;
  for(const key of ['alr','aqr','jlr','jqr','avr','govf']){
   if(s.switches[key]!=='USE')continue;
   const missing=regulatorRequirements(this,key).filter(r=>!r.ok);
   if(missing.length){s.switches[key]='NOT USE';this.holdRegulator(key);this.log('INTERLOCK','43'+key.toUpperCase()+' → NOT USE: '+missing.map(r=>r.label).join('; '));}
  }
  if(s.switches.alr!=='USE')s.agc.selected=false;
 }
 setFault(key,on){if(!Object.hasOwn(FAULTS,key))return this.reject('Lỗi không hợp lệ.');this.s.faults[key]=!!on;this.log('INSTRUCTOR',(on?'Tạo':'Gỡ')+' lỗi: '+FAULTS[key]);this.refreshAlarms();return this.result((on?'Đã tạo':'Đã gỡ')+' tình huống.');}
 raw(name,fallback){const tag=(unitTags[name]||name).replace('U1','U'+this.unit);const aliases=[tag,name];const bad=aliases.some(k=>this.s.sensorFaults[k])||this.s.faults.io;
  const override=aliases.find(k=>Object.hasOwn(this.s.di,k));return {tag,value:override?!!this.s.di[override]:!!fallback,quality:bad?'BAD':'GOOD'};
 }
 yes(name,fallback){const x=this.raw(name,fallback);return x.quality==='GOOD'&&x.value;}
 resetTimer(){this.s.timerKey='';this.s.timerElapsed=0;this.s.stepTimedOut=false;}
 enter(stage,phase=''){
  const s=this.s;s.stage=stage;s.stageTime=0;s.stageDone=false;s.sub=0;this.resetTimer();
  if(this.plant.equipment)for(const key of Object.keys(this.plant.equipment.auxOverrides))if(key.startsWith('NK-1MB'))delete this.plant.equipment.auxOverrides[key];
  this.sequence={kind:'start',phase:phase||({1:'prep.feedback',2:'valve.bypass',3:'turbine.runup',4:'excitation.voltage',5:'parallel.sync',6:'load.initial',7:'sc.unload'}[stage]),phaseTime:0,elapsed:0,limit:WATCHDOGS.start[stage],done:false,requirements:[],timerEnabled:false};
  if(stage===6)s.govMode='LOAD';if(stage===7){this.completed.load=false;s.loadLight=false;s.p92Time=0;}
  this.log('SEQUENCE','1X → '+STAGES[stage].en+' · '+this.sequence.phase);
 }
 phase(name){if(this.sequence.phase===name)return;this.sequence.phase=name;this.sequence.phaseTime=0;this.log('SEQUENCE',name);}
 command(target){
  const s=this.s;if(!Number.isInteger(target)||target<0||target>7)return this.reject('Bước đích không hợp lệ.');if(s.rejection.active){if(target===0){s.rejection.stopRequested=true;this.log('COMMAND','STOP được giữ: hoàn tất sa thải trước 5X.');return this.result('Đã giữ yêu cầu STOP; theo dõi sa thải rồi chuyển 5X.');}return this.reject('Đang sa thải phụ tải; chờ ổn định EX trước khi hòa hoặc nhận tải.');}if(target>=5&&s.stage<5&&this.plant.equipment&&!this.plant.equipment.gridPath(this.unit-1))return this.reject('Chưa khôi phục đường nối lưới: không cho hòa/nhận tải.');
  const ctl=this.controlBlockers();if(ctl.length)return this.reject(ctl.join('; '));
  if(s.lockout)return this.reject('Khóa bảo vệ 86 đang giữ.');if(s.stopping)return this.reject('Đang thực hiện trình tự dừng.');
  if(s.guideActive)return this.reject('Kết thúc bài hướng dẫn BS/CH trước.');
  if(target===0){if(s.stage===0)return this.reject('Tổ máy đang dừng.');if(this.plant.equipment)for(const key of Object.keys(this.plant.equipment.auxOverrides))if(key.startsWith('NK-1MB'))delete this.plant.equipment.auxOverrides[key];s.target=0;s.stopping=true;s.stopStep=0;s.stopPhaseTime=0;s.agc.on=false;s.agc.selected=false;s.brakeRequired=s.rpm>.1;
   this.sequence={kind:'stop',phase:'stop.unload',phaseTime:0,elapsed:0,limit:WATCHDOGS.stop[0],done:false,requirements:[],timerEnabled:false};this.resetTimer();this.refreshRegulation();this.log('COMMAND','STOP → ACTION; 5X khởi động.');return this.result('Đã nhận lệnh dừng bình thường.');}
  if(target===7){
   if(s.stage===7&&!s.scReturning)return this.reject('Tổ máy đã ở SC.');
   if(s.avr!=='AUTO'||s.switches.ch!=='NOT USE'||!s.compressor||s.air<7||s.air>8)return this.reject('SC cần AVR AUTO, 43CH NOT USE, máy nén sẵn sàng và khí 7–8 kg/cm².');
   if(this.plant.units.some(u=>u!==this&&u.s.breaker&&u.s.workingMode==='G'))return this.reject('Điều 20: cần dừng tổ phát còn lại trước khi chạy SC.');
  }
  if(s.stage===7&&target===6){if(s.scReturning)return this.reject('Đang chuyển SC → G.');if(this.plant.units.some(u=>u!==this&&u.s.workingMode==='SC'&&u.s.breaker))return this.reject('Cần dừng tổ SC còn lại trước khi phát G.');
   s.target=6;s.scReturning=true;s.scPhase=0;s.scPhaseTime=0;s.workingMode='SC→G';this.sequence={kind:'return',phase:'return.qmin',phaseTime:0,elapsed:0,limit:720,done:false,requirements:[],timerEnabled:false};this.resetTimer();this.log('COMMAND','LOAD → ACTION; SC → G, giữ máy cắt.');return this.result('Đã bắt đầu chuyển SC → G.');}
  if(s.stage===6&&target===7){s.target=7;s.workingMode='G→SC';this.enter(7);return this.result('Đang chuyển G → SC.');}
  if(s.stage>=6)return this.reject('Chọn STOP hoặc chuyển đổi G/SC.');
  if(target<s.stage)return this.reject('Dùng STOP để dừng theo trình tự.');
  if(s.stage===0){const b=this.blockers();if(!this.plant.yard.gridPath||this.plant.equipment&&!this.plant.equipment.gridPath(this.unit-1))b.push('Nhánh đấu nối trạm chưa sẵn sàng trong cấu hình bài.');if(b.length)return this.reject(b.join('; '));
   Object.keys(this.completed).forEach(k=>this.completed[k]=false);s.stopComplete=false;s.loadLight=false;s.load10=false;s.p92Time=0;s.workingMode=target===7?'START→SC':'G';this.enter(1);}
  s.target=target;s.agc.on=false;s.agc.selected=false;
  this.log('COMMAND','43S-CS '+STAGES[target].en+' → ACTION.');return this.result('Đã nhận đích '+STAGES[target].en+'. Hệ thống tự chạy từng bước theo phản hồi.');
 }
 setpoint(key,value){
  if(!['p','q','u'].includes(key))return this.reject('Giá trị đặt không hợp lệ.');
  const a=this.setpointBlockers(key);if(a.length)return this.reject(a.join('; '));
  return super.setpoint(key,value);
 }
 jointSetpoint(key,value){
  if(!['p','q'].includes(key)||!Number.isFinite(value))return this.reject('Giá trị chung không hợp lệ.');
  const name=key==='p'?'jointP':'jointQ',a=this.setpointBlockers(name);if(a.length)return this.reject(a.join('; '));
  const sw=key==='p'?'jlr':'jqr',participants=this.plant.units.filter(u=>u.s.switches[sw]==='USE'&&u.s.breaker&&u.s.workingMode==='G');
  if(!participants.includes(this)||participants.some(u=>u.setpointBlockers(name).length))return this.reject('Tổ tham gia điều khiển chung chưa đủ điều kiện.');
  const fixed=this.plant.units.filter(u=>!participants.includes(u)).reduce((sum,u)=>sum+(u.s.breaker?u.s[key]:0),0),per=(value-fixed)/participants.length;
  if(participants.some(u=>per<(key==='p'?u.s.pLo:-35)||per>(key==='p'?u.s.pHi:35)))return this.reject('Phân phối giá trị chung vượt giới hạn tổ tham gia.');
  participants.forEach(u=>{u.s[key+'Set']=per;u.log('JOINT','Tổng '+key.toUpperCase()+'='+value+'; phần tổ tham gia='+per+'; ngoài nhóm='+fixed+' (phân phối chức năng OTS; SH74 có ghi chú không dùng, cần xác minh cấu hình thực nạp).');});
  return this.result('Đã phân phối cho '+participants.length+' tổ tham gia trong mô hình OTS.');
 }
 manualPower(value){const s=this.s,a=this.setpointBlockers('manualP');if(a.length)return this.reject(a.join('; '));if(!finite(value,0,s.pHi))return this.reject('Giá trị 7-65P ngoài giới hạn.');s.pSet=value;this.log('COMMAND','7-65P '+(value>=s.p?'RAISE':'LOWER')+'; LOAD REFERENCE = '+value+' MW.');return this.result('Đã nhận điều chỉnh 7-65P.');}
 raiseLowerPower(direction){if(![-1,1].includes(direction))return this.reject('Chỉ nhận lệnh Raise hoặc Lower.');return this.manualPower(clamp(this.s.pSet+direction*.5,0,this.s.pHi));}
 commandBreaker(closed){const d=this.devices.breaker;if(d.target===+closed)return;d.command(+closed);this.s.cbCommand={closed,remaining:this.plant.profile.dynamics.breaker};}
 syncDevices(){const s=this.s,d=this.devices,wasClosed=s.breaker;
  s.inlet=d.inlet.value;s.bypass=d.bypass.value;s.seal=d.seal.value;s.gate=d.gate.value;s.coolingPosition=d.waterValve.value;
  s.coolingValve=d.waterValve.on;s.lift=d.lift.on;s.excited=d.field.on;s.breaker=d.breaker.on;s.eBrake=d.eBrake.on;s.mBrake=d.mBrake.on;s.airValve=d.air.on;s.ventValve=d.vent.on;
  if(s.cbCommand&&s.breaker===s.cbCommand.closed)s.cbCommand=null;
  if(wasClosed&&!s.breaker&&!s.stopping&&!s.lockout)this.onBreakerOpenFeedback();
 }
 manualOpenBreaker(){
  const b=this.controlBlockers();if(b.length)return this.reject(b.join('; '));
  const s=this.s,d=this.devices.breaker;
  if(s.stopping||s.lockout||s.workingMode!=='G'||s.scReturning)return this.reject('Đang dừng/bảo vệ/chế độ SC; dùng trình tự phù hợp.');
  if(!d.on||d.moving)return this.reject('CB chưa đóng ổn định hoặc đang chờ phản hồi.');
  this.commandBreaker(false);this.log('COMMAND',d.name+' OPEN riêng; không phát STOP 5X hoặc lệnh tới CB khác.');return this.result('Đã phát lệnh mở riêng '+d.name+'; chờ phản hồi.');
 }
 onBreakerOpenFeedback(){
  if(this.s.rejection.active)return;
  this.beginLoadRejection('CB'+(900+this.unit)+' OPEN · SA THẢI ĐẦU CỰC');
 }
 beginLoadRejection(reason,openTerminal=false){
  const s=this.s,d=this.devices,cfg=LOAD_REJECTION_CONFIG;
  if(s.lockout||s.rejection.active)return false;
  const r=createRejectionState(this.plant.profile.rpm),prior=Math.max(0,s.p);
  Object.assign(r,{active:true,reason,phase:'close',rejectedMW:prior,initialGate:d.gate.value,
   hydraulicPowerPU:prior/this.plant.profile.pRated+cfg.mechanicalLossPU,
   speedPU:Math.max(.2,s.rpm/this.plant.profile.rpm),peakRPM:s.rpm,minGate:d.gate.value,
   stopRequested:s.stopping});
  s.rejection=r;s.p=s.q=s.pBase=s.qBase=0;s.pSet=this.plant.profile.pInitial;
  s.p92Time=0;s.loadLight=false;s.load10=false;s.agc.on=false;s.agc.selected=false;
  for(const key of ['alr','aqr','jlr','jqr'])s.switches[key]='NOT USE';
  s.stopping=false;s.scReturning=false;s.stopComplete=false;s.workingMode='G';s.govMode='FREQUENCY';
  this.completed.parallel=false;this.completed.load=false;this.completed.sc=false;
  s.stage=4;s.target=4;s.stageTime=0;s.stageDone=false;
  this.sequence={kind:'rejection',phase:'rejection.close',phaseTime:0,elapsed:0,limit:cfg.timeoutSeconds,done:false,requirements:[],timerEnabled:true};
  this.resetTimer();d.gate.command(0);if(openTerminal)this.commandBreaker(false);
  r.trace.push({t:0,rpm:s.rpm,gate:s.gate,p:prior,pm:r.hydraulicPowerPU*this.plant.profile.pRated},{t:0,rpm:s.rpm,gate:s.gate,p:0,pm:r.hydraulicPowerPU*this.plant.profile.pRated});
  this.alarm('LOAD_REJECTION',true,reason+' · P sa thải '+prior.toFixed(1)+' MW; đóng nhanh cánh hướng, theo dõi quá tốc (OTS).');
  this.log('LOAD_REJECTION',reason+' · '+prior.toFixed(1)+' MW · 65S CLOSE ngay, hành trình '+cfg.gateCloseSeconds+' s/toàn hành trình (OTS).'+(openTerminal?' Cắt riêng CB'+(900+this.unit)+' theo quy ước bài mất lưới; không giả định mã rơle thực.':''));
  return true;
 }
 tickLoadRejection(dt){
  const s=this.s,r=s.rejection,d=this.devices,p=this.plant.profile,cfg=LOAD_REJECTION_CONFIG;
  r.elapsed+=dt;s.p=s.q=s.pBase=s.qBase=0;
  // Water power lags actual guide-vane movement. Rotor speed follows power imbalance.
  const g=d.gate.value,ng=cfg.noLoadGate;
  const target=cfg.mechanicalLossPU*Math.min(g/ng,1)+Math.max(0,g-ng)/83;
  r.hydraulicPowerPU+=(target-r.hydraulicPowerPU)*(1-Math.exp(-dt/cfg.waterLagSeconds));
  const torque=r.hydraulicPowerPU-cfg.mechanicalLossPU-cfg.speedDamping*(r.speedPU-1);
  r.speedPU=clamp(r.speedPU+dt*torque/(2*cfg.inertiaSeconds*Math.max(.3,r.speedPU)),.2,cfg.maxSimulationSpeedPU);
  s.rpm=r.speedPU*p.rpm;r.peakRPM=Math.max(r.peakRPM,s.rpm);r.minGate=Math.min(r.minGate,g);
  s.df=s.rpm/p.rpm*50-this.plant.frequency;
  // Keep excitation and cooling; never close the inlet valve for a normal rejection.
  s.kvBase=approach(s.kvBase,d.field.on&&!s.faults.excitation?s.uSet:0,p.kv/p.dynamics.excitation,dt);
  s.kv=s.kvBase+.003*Math.sin(s.t*.4);this.plant.cooling.requests[this.unit-1]=true;
  if(r.phase==='close'){
   d.gate.command(0);
   if(d.gate.closed){r.closedOnce=true;r.closedAt=r.elapsed;r.phase='hold';this.phase('rejection.hold');this.log('FEEDBACK','65S CLOSED · sa thải, chờ tốc độ giảm trước mở không tải.');}
  }else if(r.phase==='hold'){
   d.gate.command(0);
   if(r.elapsed-r.closedAt>=cfg.holdSeconds&&r.speedPU<=cfg.reopenSpeedPU){r.phase='recover';this.phase('rejection.recover');this.log('GOV','Mở lại cánh hướng về vùng không tải, điều chỉnh theo tốc độ.');}
  }else if(r.phase==='recover'){
   const error=1-r.speedPU;r.integral=clamp(r.integral+error*dt,-.3,.3);
   d.gate.command(clamp(ng+cfg.governorKp*error+cfg.governorKi*r.integral,0,25));
  }
  const healthy=this.yes('breakerOpen',d.breaker.closed)&&d.field.on&&!s.faults.governor&&this.qualityGood;
  const stable=r.phase==='recover'&&healthy&&Math.abs(r.speedPU-1)<=cfg.speedTolerancePU&&Math.abs(g-ng)<=cfg.gateTolerance;
  r.stableTime=stable?r.stableTime+dt:0;
  this.require([['CB đầu cực OPEN',this.yes('breakerOpen',d.breaker.closed),'DI0150'],['Cánh hướng đã qua 0%',r.closedOnce,'65S · OTS'],['Tốc độ về vùng định mức',Math.abs(r.speedPU-1)<=cfg.speedTolerancePU,'RPM · OTS'],['Cánh hướng vùng không tải',Math.abs(g-ng)<=cfg.gateTolerance,'65S · OTS'],['Ổn định liên tục 3 s',r.stableTime>=cfg.stableSeconds,'OTS TIMER']]);
  this.sequence.elapsed=r.elapsed;s.timerElapsed=r.elapsed;s.timerKey='LOAD REJECTION';s.stepTimedOut=r.elapsed>cfg.timeoutSeconds;
  this.alarm('REJECTION_TIMEOUT',s.stepTimedOut,'Sa thải chưa ổn định quá '+cfg.timeoutSeconds+' s (OTS): kiểm tra điều tốc, CB và phản hồi.');
  if(r.elapsed-r.sampleAt>=.25){r.sampleAt=r.elapsed;r.trace.push({t:r.elapsed,rpm:s.rpm,gate:g,p:s.p,pm:r.hydraulicPowerPU*p.pRated});if(r.trace.length>2400)r.trace.splice(1,1);}
  if(r.stableTime>=cfg.stableSeconds){
   r.active=false;r.completed=true;r.phase='complete';s.stageDone=true;this.completed.excitation=true;
   d.gate.command(ng);s.gate=d.gate.value;
   this.sequence={kind:'idle',phase:'rejection.complete',phaseTime:0,elapsed:0,limit:0,done:true,requirements:[],timerEnabled:false};this.resetTimer();
   this.alarm('LOAD_REJECTION',false,'Sa thải hoàn tất, EX không tải có kích từ.');this.alarm('REJECTION_TIMEOUT',false,'Sa thải đã ổn định.');
   this.log('SEQUENCE','SA THẢI HOÀN TẤT → EX không tải có kích từ · P cắt '+r.rejectedMW.toFixed(1)+' MW · nmax '+r.peakRPM.toFixed(1)+' rpm · '+r.elapsed.toFixed(1)+' s. Không tự hòa lại.');
   if(r.stopRequested)this.command(0);
  }
 }

 drive(dt){const s=this.s,d=this.devices,f=s.faults;
  d.waterValve.failed=f.coolingValve;d.lift.failed=d.lift.target===1?f.prep:f.liftStop;d.bypass.failed=f.bypass;d.seal.failed=f.seal;d.inlet.failed=f.valve;
  d.gate.closeTime=s.rejection.active?LOAD_REJECTION_CONFIG.gateCloseSeconds:this.plant.profile.dynamics.gate;d.gate.failed=f.governor;d.field.failed=f.field;d.breaker.failed=d.breaker.target===1?f.cbclose:f.cbopen;d.eBrake.failed=f.ebrake;d.mBrake.failed=f.brake;d.air.failed=f.airValve;d.vent.failed=f.vent;
  for(const x of Object.values(d))x.tick(dt);this.syncDevices();
  if(s.cbCommand)s.cbCommand.remaining=Math.max(0,s.cbCommand.remaining-dt);
 }
 monitor(dt,complete){const s=this.s,q=this.sequence;
  const key=q.kind==='stop'?'5X STEP '+s.stopStep:q.kind==='return'?'SC TO G':STAGES[s.stage]?.en;
  q.done=complete;q.timerEnabled=!complete&&s.switches.usm==='USE';
  if(q.timerEnabled)q.elapsed+=dt;else q.elapsed=0;
  s.timerKey=key;s.timerElapsed=q.elapsed;s.stepTimedOut=q.timerEnabled&&q.elapsed>q.limit;
  this.alarm('SEQUENCE_TIME_OVER',s.stepTimedOut,'U'+this.unit+' '+key+' SEQ MON TIMER PV · '+q.phase+' · '+q.limit+' s (JBLOCK).');
  s.seqFlags[key]={start:!complete,complete,timeout:s.stepTimedOut};
 }
 require(rows){this.sequence.requirements=rows.map(([label,value,tag])=>{const id=String(tag||'').match(/DI\d{4}/)?.[0],alias=id?Object.keys(unitTags).find(k=>unitTags[k].endsWith(id)):null;return {label,ok:!!value,tag:tag||'',quality:this.s.faults.io?'BAD':alias?this.raw(alias,true).quality:'GOOD'};});return this.sequence.requirements.every(r=>r.ok&&r.quality==='GOOD');}
 tick(dt){const s=this.s,p=this.plant.profile,d=p.dynamics;s.t+=dt;s.stageTime+=dt;this.sequence.phaseTime+=dt;
  this.drive(dt);
  s.coolingPump=this.plant.cooling?.pumps[this.unit-1].on||false;s.waterPressure=this.plant.cooling?.header||0;
  const flow=s.waterPressure>=.18&&this.devices.waterValve.value>95&&!s.faults.cooling;
  const notLow=(alias,value)=>{const x=this.raw(alias,!value);return x.quality==='GOOD'&&!x.value;};
  s.flowUpper=notLow('upperLow',flow&&!s.faults.upperFlow);s.flowLower=notLow('lowerLow',flow&&!s.faults.lowerFlow);s.flowAir=notLow('airLow',flow&&!s.faults.airFlow);s.waterFlow=flow?100:0;
  s.liftPressure=approach(s.liftPressure,s.lift&&!s.faults.prep?1:0,1/d.liftPressure,dt);
  const oilTarget=s.faults.oil?1.8:(s.pumpA||s.pumpB)?4.6:1;s.oil=approach(s.oil,oilTarget,.5,dt);
  if(s.standbyAuto&&!s.pumpA&&!s.pumpB&&s.oil<4.1){s.pumpB=true;this.log('AUTO','Bơm dầu dự phòng B tự khởi động — mô hình đào tạo.');}
  if(s.lockout)this.tickTrip(dt);else if(s.rejection.active)this.tickLoadRejection(dt);else if(s.stopping)this.tickStop(dt);else if(s.scReturning)this.tickReturn(dt);else if(s.stage===7)this.tickSC(dt);else this.tickStart(dt);
  advanceThermal(s,this.unit,this.plant.session?.thermal||DEFAULT_THERMAL,dt);
  if(p.illustrativeTrips&&s.stage>0&&!s.lockout){s.oilLowTime=s.oil<2.5?s.oilLowTime+dt:0;if(s.oilLowTime>2||s.temp>=90)this.trip('Bảo vệ minh họa OTS; ngưỡng chưa xác nhận.');}
  this.refreshRegulation();this.updateSignals();this.refreshAlarms();this.alarm('NKT_BRANCH_FLOW',s.rpm>1&&!(s.flowUpper&&s.flowLower&&s.flowAir),'Nước làm mát: lưu lượng nhánh thấp.');
  if(s.t-s.lastSample>=1)this.sample();
 }
 sample(){super.sample();const r=this.s.history.at(-1);if(!r||!this.s.thermal)return;for(const key of THERMAL_TREND_KEYS)r[key]=this.s.sensorFaults[key]?null:this.s.thermal.values[key];r.thermalMode=this.s.thermal.mode;r.thermalBand=this.s.thermal.band;}
 tickStart(dt){const s=this.s,q=this.sequence,d=this.devices,p=this.plant.profile;
  if(s.stage===0)return;
  let done=false;
  if(s.stage===1){this.plant.cooling.requests[this.unit-1]=true;d.waterValve.command(100);d.lift.command(1);s.heater=false;
   const heater=this.raw('heaterOn',s.heater);
   done=this.require([['88CWV OPEN',this.yes('waterOpen',d.waterValve.on),'DI0351'],['OIL LIFT PUMP RUN',this.yes('liftRun',d.lift.on),'DI0401'],['63QT PRESSURE',this.yes('liftPressure',s.liftPressure>.98),'DI0285'],['UPPER FLOW NOT LOW',s.flowUpper,'DI0279 · NOT'],['LOWER FLOW NOT LOW',s.flowLower,'DI0281 · NOT'],['AIR COOLER FLOW NOT LOW',s.flowAir,'DI0283 · NOT'],['HEATER OFF',heater.quality==='GOOD'&&!heater.value,'DI0403 · NOT']]);
   if(done)this.completed.prep=true;
  }else if(s.stage===2){done=this.inletOpening(dt);if(done)this.completed.inlet=true;
  }else if(s.stage===3){d.gate.command(12);
   if(!s.faults.governor&&s.inlet>99&&d.gate.value>2)s.rpm=approach(s.rpm,p.rpm*s.fSet/50, p.rpm/p.dynamics.runup,dt);
   const speed=this.yes('speed90',s.rpm>p.speedExcitation*p.rpm);
   if(speed)d.lift.command(0);
   done=this.require([['SPEED >'+p.speedExcitation*100+'%',speed,'DI0313'],['LIFT PUMP STOP',d.lift.closed,'DI0401 · OFF'],['OIL FLOW NOT LOW',!s.faults.cooling,'DI0284 · NOT'],['MECHANICAL BRAKE RELEASED',this.yes('brakeReleased',d.mBrake.closed),'DI0276']]);
   if(done)this.completed.turbine=true;
  }else if(s.stage===4){if(s.rejection.completed&&s.target===4){d.gate.command(LOAD_REJECTION_CONFIG.noLoadGate);s.rpm=approach(s.rpm,p.rpm,p.rpm/p.dynamics.runup,dt);s.p=s.q=s.pBase=s.qBase=0;}else s.rpm=approach(s.rpm,p.rpm,p.rpm/p.dynamics.runup,dt);d.field.command(1);
   s.kvBase=approach(s.kvBase,d.field.on&&!s.faults.excitation?s.uSet:0,p.kv/p.dynamics.excitation,dt);s.kv=s.kvBase;
   done=this.require([['41 FIELD CB CLOSED',d.field.on,'DI0126'],['GENERATOR VOLTAGE >90%',s.kv>p.voltageExcitation*p.kv,'91E2']]);if(done)this.completed.excitation=true;
  }else if(s.stage===5){s.rpm=approach(s.rpm,p.rpm,5,dt);s.kvBase=approach(s.kvBase,s.uSet,.4,dt);s.kv=s.kvBase;
   if(!s.faults.sync&&s.syncMode==='AUTO'){s.df=approach(s.df,0,.012,dt);s.angle=approach(s.angle,0,5,dt);}
   const window=this.syncWindow();if(window&&s.syncMode==='AUTO'&&!s.faults.sync)this.commandBreaker(true);
   done=this.require([['SYNCHRONIZER WINDOW',window,'OTS Δf/ΔU/angle'],['901/902 CLOSE FEEDBACK',this.yes('breakerClosed',d.breaker.on),'DI0149']]);
   if(done)this.completed.parallel=true;
  }else if(s.stage===6){this.online(dt);
   done=this.require([['P >5%',s.p>p.pRated*p.p92,'AI0007'],['TON 92P 1 s',s.loadLight,'SH027_01']]);
   if(done&&!this.completed.load)this.log('FEEDBACK','92P ON — P >5% qua TON 1 s; LOAD STEP COMPLETION (JBLOCK SH27).');
   this.completed.load=done;
  }
  s.stageDone=done;this.monitor(dt,done);
  if(done&&s.stage<s.target){if(s.stage===5&&s.target===7)this.enter(7);else if(s.stage<6)this.enter(s.stage+1);}
 }
 inletOpening(dt){const s=this.s,d=this.devices,p=this.plant.profile,q=this.sequence;
  if(q.phase.endsWith('bypass')){s.sub=0;d.bypass.command(100);if(d.bypass.on)this.phase(q.kind==='return'?'return.equalize':'valve.equalize');}
  else if(q.phase.endsWith('equalize')){if(!s.faults.deltaP)s.deltaP=approach(s.deltaP,0,100/p.dynamics.equalize,dt);if(s.deltaP<20)this.phase(q.kind==='return'?'return.seal':'valve.seal');}
  else if(q.phase.endsWith('seal')){s.sub=1;d.seal.command(100);if(d.seal.on)this.phase(q.kind==='return'?'return.inlet':'valve.inlet');}
  else if(q.phase.endsWith('inlet')){if(d.seal.on&&s.deltaP<20)d.inlet.command(100);if(this.yes('inletOpen',d.inlet.on))this.phase(q.kind==='return'?'return.cleanup':'valve.cleanup');}
  else if(q.phase.endsWith('cleanup')){s.sub=2;d.bypass.command(0);d.seal.command(0);}
  return this.require([['BYPASS OPEN / CYCLE',q.phase.endsWith('cleanup')||d.bypass.on,'33BS'],['ΔP <20%',s.deltaP<20,'IV ΔP'],['INLET OPEN',this.yes('inletOpen',d.inlet.on),'DI0293'],['BYPASS CLOSED',q.phase.endsWith('cleanup')&&d.bypass.closed,'33BLB'],['SEAL CLOSED',q.phase.endsWith('cleanup')&&d.seal.closed,'SEAL']]);
 }
 online(dt){const s=this.s,p=this.plant.profile,d=this.devices;if(!d.breaker.on){s.p=s.q=s.pBase=s.qBase=0;return;}
  let target=Math.min(s.pSet,clamp((s.gateLimit-10)/83*p.pRated,0,p.pRated));
  const primary=s.switches.govf==='USE'&&s.switches.alr==='NOT USE'&&Math.abs(this.plant.frequency-50)>=.1;
  if(primary)target=clamp(target-(this.plant.frequency-50)*20,s.pLo,s.pHi);
  if(primary!==s.frequencyOperating){s.frequencyOperating=primary;this.log('GOV',primary?'PRIMARY FREQUENCY OPERATING':'PRIMARY FREQUENCY RETURN');}
  s.pBase=approach(s.pBase,s.faults.load?Math.min(3,target):target,p.dynamics.loadRamp,dt);
  s.qBase=approach(s.qBase,s.avr==='AUTO'?s.qSet:clamp((s.excV-120)*.6,-35,35),1.2,dt);
  s.kvBase=approach(s.kvBase,s.avr==='AUTO'?s.uSet:clamp(13.8+(s.excV-120)*.003,13.5,14.3),.15,dt);
  s.p=s.pBase+.12*Math.sin(s.t*.6)*clamp(s.pBase/20,0,1);s.q=s.qBase+.04*Math.sin(s.t*.7);s.kv=s.kvBase+.003*Math.sin(s.t*.4);s.rpm=p.rpm*this.plant.frequency/50;
  s.p92Time=s.p>p.pRated*p.p92?Math.min(p.p92Delay,s.p92Time+dt):0;s.loadLight=s.p92Time+1e-8>=p.p92Delay;
  d.gate.command(clamp(10+s.pBase/p.pRated*83,0,s.gateLimit));
  if(s.avr==='AUTO')s.excV=approach(s.excV,120+s.qBase/.6,3,dt);s.excI=750+s.excV*1.25;
  if(s.p>=10&&!s.load10){s.load10=true;this.log('FEEDBACK','P đạt 10 MW — mốc vận hành QT Điều 39; tách với 92P.');}
 }
 tickSC(dt){const s=this.s,d=this.devices,q=this.sequence,p=this.plant.profile;s.rpm=p.rpm*this.plant.frequency/50;s.kvBase=approach(s.kvBase,s.uSet,.1,dt);s.kv=s.kvBase;s.qBase=approach(s.qBase,s.qSet,1,dt);s.q=s.qBase;
  if(this.completed.sc){s.pBase=-.8;s.p=-.8+.02*Math.sin(s.t*.4);s.stageDone=true;return;}
  if(q.phase==='sc.unload'){s.scPhase=0;s.pBase=approach(s.pBase,0,p.dynamics.unloadRamp,dt);s.p=s.pBase;if(Math.abs(s.pBase)<.1){d.lift.command(1);this.phase('sc.lift');}}
  else if(q.phase==='sc.lift'){if(d.lift.on&&s.liftPressure>.98){d.gate.command(0);this.phase('sc.gate');}}
  else if(q.phase==='sc.gate'){s.scPhase=1;if(this.yes('gateClosed',d.gate.closed)){d.seal.command(100);this.phase('sc.seal');}}
  else if(q.phase==='sc.seal'){if(d.seal.on){d.inlet.command(0);this.phase('sc.inlet');}}
  else if(q.phase==='sc.inlet'){s.scPhase=2;if(this.yes('inletClosed',d.inlet.closed)){d.seal.command(0);if(d.seal.closed){d.air.command(100);this.phase('sc.water');}}}
  else if(q.phase==='sc.water'){s.scPhase=3;if(d.air.on&&s.air>=7&&s.compressor)s.draft=approach(s.draft,47.7,2.3/p.dynamics.scDepress,dt);
   if(this.yes('waterDepressed',s.draft<p.scWaterLow&&!s.faults.waterSignal)){d.air.command(0);this.phase('sc.air-close');}}
  else if(q.phase==='sc.air-close'&&d.air.closed){this.completed.sc=true;s.scPhase=4;s.workingMode='SC';s.stageDone=true;this.log('SEQUENCE','SYNCHRO COND hoàn thành; WATER DEPRESSED, máy cắt giữ đóng.');}
  const done=this.require([['P NO LOAD',Math.abs(s.pBase)<.1,'SH028'],['GUIDE VANE CLOSED',this.yes('gateClosed',d.gate.closed),'DI0316'],['INLET CLOSED',this.yes('inletClosed',d.inlet.closed),'DI0294'],['WATER DEPRESSED',this.yes('waterDepressed',s.draft<p.scWaterLow&&!s.faults.waterSignal),'DI0391'],['AIR VALVE CLOSED',d.air.closed,'KN-3VĐ2']])&&this.completed.sc;
  this.monitor(dt,done);s.stageDone=done;
 }
 tickReturn(dt){const s=this.s,d=this.devices,q=this.sequence,p=this.plant.profile;s.scPhaseTime+=dt;s.rpm=p.rpm*this.plant.frequency/50;s.p=s.pBase;s.q=s.qBase;
  if(q.phase==='return.qmin'){s.qBase=approach(s.qBase,0,1,dt);if(Math.abs(s.qBase)<.1){d.vent.command(100);this.phase('return.water');}}
  else if(q.phase==='return.water'){if(d.vent.on)s.draft=approach(s.draft,50,.12,dt);if(s.draft>49.8){d.vent.command(0);this.phase('return.vent-close');}}
  else if(q.phase==='return.vent-close'){if(d.vent.closed){s.deltaP=100;this.phase('return.bypass');}}
  else if(['return.bypass','return.equalize','return.seal','return.inlet','return.cleanup'].includes(q.phase)){if(this.inletOpening(dt)){this.completed.inlet=true;d.gate.command(12);this.phase('return.load');}}
  else if(q.phase==='return.load'){s.pBase=approach(s.pBase,s.faults.load?3:p.pInitial,p.dynamics.loadRamp,dt);s.p92Time=s.pBase>p.pRated*p.p92?Math.min(p.p92Delay,s.p92Time+dt):0;if(s.p92Time+1e-8>=p.p92Delay){s.scReturning=false;s.workingMode='G';this.completed.sc=false;this.completed.load=true;this.completed.turbine=true;d.lift.command(0);s.pSet=p.pInitial;this.enter(6);this.log('SEQUENCE','SC→G hoàn thành; giữ máy cắt đóng.');return;}}
  this.require([['Q AT QMIN (OTS 0)',Math.abs(s.qBase)<.1,'QT Điều 22'],['WATER RETURNED',s.draft>49.8,'71WD OFF / mô hình'],['VENT CLOSED',d.vent.closed,'KN-3VĐ4'],['INLET OPEN',d.inlet.on,'DI0293'],['92P',s.p92Time+1e-8>=p.p92Delay,'SH027']]);this.monitor(dt,false);
 }
 stopNext(){const s=this.s;s.stopStep++;s.stopPhaseTime=0;this.resetTimer();this.sequence={kind:'stop',phase:['stop.unload','stop.breaker','stop.excitation','stop.turbine','stop.inlet','stop.auxiliary'][s.stopStep],phaseTime:0,elapsed:0,limit:WATCHDOGS.stop[s.stopStep],done:false,requirements:[],timerEnabled:false};this.log('SEQUENCE','5X → '+this.sequence.phase);}
 coast(dt){const s=this.s,d=this.devices,p=this.plant.profile;
  if(s.rpm>.1&&s.rpm<=p.rpm*.95)d.lift.command(1);
  if(s.rpm>.1&&s.rpm<=p.rpm*.5)d.eBrake.command(1);
  if(s.rpm>.1&&s.rpm<=p.rpm*.2){d.mBrake.command(1);s.dust=true;}
  if(d.eBrake.on)s.brakeSeen.electric=true;if(d.mBrake.on)s.brakeSeen.mechanical=true;
  const rate=p.rpm/p.dynamics.coast*(d.mBrake.on?2.2:d.eBrake.on?1.35:1);
  s.rpm=approach(s.rpm,0,rate,dt);
 }
 tickStop(dt){const s=this.s,d=this.devices,p=this.plant.profile;s.stopPhaseTime+=dt;let done=false;
  if(s.stopStep===0){s.pBase=approach(s.pBase,0,p.dynamics.unloadRamp,dt);s.qBase=approach(s.qBase,0,1,dt);s.p=s.pBase;s.q=s.qBase;d.gate.command(s.workingMode==='SC'?0:12);
   done=this.require([['P <10,5 MW',s.p<p.stopP,'SH030'],['Q IN WINDOW ±3,25',Math.abs(s.q)<p.stopQ,'SH030 · tham số bản vẽ'],['GATE NO LOAD',d.gate.value<=12.2,'DI0317']]);if(done)this.completed.load=false;
  }else if(s.stopStep===1){this.commandBreaker(false);done=this.require([['901/902 OPEN FEEDBACK',this.yes('breakerOpen',d.breaker.closed),'DI0150']]);if(done){s.p=s.q=s.pBase=s.qBase=0;this.completed.parallel=false;}}
  else if(s.stopStep===2){d.field.command(0);s.kvBase=approach(s.kvBase,0,p.kv/p.dynamics.excitation,dt);s.kv=s.kvBase;done=this.require([['FIELD CB OFF',d.field.closed,'41'],['GENERATOR U <30%',s.kv<p.kv*.3,'91E1 OFF']]);if(done)this.completed.excitation=false;}
  else if(s.stopStep===3){d.gate.command(0);this.coast(dt);s.kvBase=approach(s.kvBase,0,p.kv/p.dynamics.excitation,dt);s.kv=s.kvBase;
   done=this.require([['GUIDE VANE CLOSED',this.yes('gateClosed',d.gate.closed),'DI0316'],['UNIT STAND STILL',s.rpm<.1,'14LT / đáp ứng OTS'],['ELECTRIC BRAKE / NOT REQUIRED',!s.brakeRequired||d.eBrake.on,'PHANH ĐIỆN'],['MECHANICAL BRAKE / NOT REQUIRED',!s.brakeRequired||d.mBrake.on,'PHANH CƠ']]);if(done)this.completed.turbine=false;
  }else if(s.stopStep===4){if(qEnds(this.sequence.phase,'inlet')){d.seal.command(100);if(d.seal.on)d.inlet.command(0);if(this.yes('inletClosed',d.inlet.closed))this.phase('stop.inlet-cleanup');}
   else{d.seal.command(0);d.bypass.command(0);}
   done=this.require([['INLET CLOSED',this.yes('inletClosed',d.inlet.closed),'DI0294'],['SEAL CLOSED',d.seal.closed,'SEAL'],['BYPASS CLOSED',d.bypass.closed,'33BLB']]);if(done)this.completed.inlet=false;
  }else if(s.stopStep===5){d.lift.command(0);this.plant.cooling.requests[this.unit-1]=false;d.waterValve.command(0);d.eBrake.command(0);d.mBrake.command(0);d.air.command(0);d.vent.command(0);s.dust=false;
   done=this.require([['LIFT PUMP STOP',d.lift.closed,'DI0401 OFF'],['WATER PUMP STOP',!this.plant.cooling.pumps[this.unit-1].on,'88CWP'],['WATER VALVE CLOSED',d.waterValve.closed,'88CWV'],['BRAKES RELEASED',d.eBrake.closed&&d.mBrake.closed,'DI0276'],['STAND STILL',s.rpm<.1,'14LT']]);
   if(done){Object.keys(this.completed).forEach(k=>this.completed[k]=false);s.stage=0;s.target=0;s.stageDone=true;s.stopping=false;s.stopComplete=true;s.workingMode='G';s.scReturning=false;s.loadLight=false;s.p92Time=0;s.deltaP=100;s.heater=true;this.sequence.kind='idle';this.log('SEQUENCE','STOP / UNIT STAND STILL — phản hồi phụ trợ dừng, phanh nhả.');}
  }
  this.monitor(dt,done);if(done&&s.stopping)this.stopNext();
 }
 trip(reason='5E · dừng sự cố mô phỏng'){
  const s=this.s;if(s.lockout)return this.result('Khóa bảo vệ đang giữ.');if(s.rejection.active){s.rejection.active=false;s.rejection.phase='aborted';s.rejection.failure='Bảo vệ 86 ưu tiên dừng sự cố';this.alarm('LOAD_REJECTION',false,'Bảo vệ 86 tiếp quản sa thải.');}delete s.di.OTS_QUICK_QUICK_26;s.lockout=true;s.stopping=false;s.scReturning=false;s.target=0;s.agc.on=false;s.agc.selected=false;
  this.devices.breaker.command(0);s.cbCommand={closed:false,remaining:this.plant.profile.dynamics.breaker};this.devices.field.command(0);this.devices.gate.command(0);this.devices.inlet.command(0);
  this.sequence={kind:'trip',phase:'trip.outputs',phaseTime:0,elapsed:0,limit:0,done:false,requirements:[],timerEnabled:false};this.alarm('LOCKOUT',true,reason,'TRIP');this.log('PROTECTION','86 giữ; phát lệnh cắt máy cắt/kích từ và đóng van/cánh hướng. Chờ phản hồi.');return this.result('Đã phát lệnh dừng sự cố.');
 }
 tickTrip(dt){const s=this.s,d=this.devices,p=this.plant.profile;d.breaker.command(0);d.field.command(0);d.gate.command(0);d.inlet.command(0);d.bypass.command(0);d.seal.command(0);d.air.command(0);d.vent.command(0);
  if(!d.breaker.on)s.p=s.q=s.pBase=s.qBase=0;else{s.pBase=approach(s.pBase,0,10,dt);s.p=s.pBase;}
  s.kvBase=approach(s.kvBase,0,p.kv/5,dt);s.kv=s.kvBase;this.coast(dt);
  if(s.rpm<.1){s.stage=0;this.plant.cooling.requests[this.unit-1]=false;d.waterValve.command(0);d.lift.command(0);d.eBrake.command(0);d.mBrake.command(0);}
  this.require([['CB OPEN',this.yes('breakerOpen',d.breaker.closed),'DI0150'],['FIELD OFF',d.field.closed,'41'],['GATE CLOSED',d.gate.closed,'DI0316'],['INLET CLOSED',d.inlet.closed,'DI0294'],['STAND STILL',s.rpm<.1,'14LT']]);
 }
 resetProtection(){const s=this.s,d=this.devices;if(!s.lockout)return this.reject('Không có khóa 86 cần reset.');
  if(s.rpm>=.1||!d.breaker.closed||!d.inlet.closed||!d.gate.closed||!d.field.closed)return this.reject('Chờ phản hồi máy cắt mở, kích từ cắt, van/cánh hướng đóng và máy dừng.');
  if(Object.values(s.faults).some(Boolean)||s.oil<3.5||s.temp>=75)return this.reject('Khắc phục nguyên nhân và chờ thông số bình thường.');
  s.lockout=false;s.stage=0;s.target=0;s.stageDone=true;s.stopComplete=true;Object.keys(this.completed).forEach(k=>this.completed[k]=false);this.sequence.kind='idle';this.alarm('LOCKOUT',false,'LOCKOUT RETURN','TRIP');this.log('COMMAND','RESET 86 sau xác minh nguyên nhân.');return this.result('Đã reset bảo vệ 86.');
 }
 syncWindow(){const s=this.s,p=this.plant.profile;if(this.plant.equipment&&!this.plant.equipment.syncReady(this.unit-1))return false;return !s.rejection.active&&Math.abs(s.rpm/p.rpm*50-this.plant.frequency)<=p.syncDf&&Math.abs(s.df)<=p.syncDf&&Math.abs(s.angle)<=p.syncAngle&&Math.abs(s.kv/p.kv-1)<=p.syncDu;}
 manualSync(){const b=this.controlBlockers();if(b.length)return this.reject(b.join('; '));if(this.s.stage!==5||this.s.syncMode!=='MANUAL'||!this.syncWindow())return this.reject('Chưa ở PARALLEL IN / MANUAL hoặc chưa đạt cửa sổ hòa OTS.');this.commandBreaker(true);return this.result('Đã phát lệnh đóng, đang chờ phản hồi.');}
 updateSignals(){const s=this.s,d=this.devices;if(!d)return;const c=this.completed;
  s.signals={startCondition:this.ready,auxStart:c.prep||s.stage>0&&s.stage<6,coolingValve:s.coolingValve,coolingGood:s.flowUpper&&s.flowLower&&s.flowAir,
   lift:s.lift,heaterOff:!s.heater,liftPressure:s.liftPressure>.98,flowUpper:s.flowUpper,flowLower:s.flowLower,flowAir:s.flowAir,
   inletOpen:this.yes('inletOpen',d.inlet.on),bypassClosed:d.bypass.closed,speed90:this.yes('speed90',s.rpm>this.plant.profile.speedExcitation*this.plant.profile.rpm),voltage90:s.kv>.9*this.plant.profile.kv,
   excited:s.excited,breaker:this.yes('breakerClosed',s.breaker),p5:s.loadLight,q5:Math.abs(s.q)<this.plant.profile.stopQ,gateClosed:this.yes('gateClosed',d.gate.closed),inletClosed:this.yes('inletClosed',d.inlet.closed),draftLow:s.draft<47.85,
   cbOpen:this.yes('breakerOpen',d.breaker.closed),excOff:!s.excited,eBrake:s.eBrake,mBrake:s.mBrake,auxStopped:!s.coolingPump&&!s.lift,standstill:s.rpm<.1,noLoad:d.gate.value<=12.2,stopP:s.p<this.plant.profile.stopP};
  s.lamp={0:s.stage===0&&!s.lockout,ready:this.ready,1:c.prep&&!c.inlet,2:c.inlet&&!c.turbine,3:c.turbine&&!c.excitation,4:c.excitation&&!c.parallel,5:c.parallel,6:c.load&&s.loadLight,7:c.sc};
  s.signalQuality=Object.fromEntries(Object.entries({coolingValve:'waterOpen',lift:'liftRun',liftPressure:'liftPressure',flowUpper:'upperLow',flowLower:'lowerLow',flowAir:'airLow',speed90:'speed90',inletOpen:'inletOpen',inletClosed:'inletClosed',breaker:'breakerClosed',cbOpen:'breakerOpen',gateClosed:'gateClosed'}).map(([key,alias])=>[key,this.raw(alias,true).quality]));
 }
}
function qEnds(x,y){return x.endsWith(y);}


// 04.17: HMI contact states and documentary I/O references.
// Source addresses are literal declarations; never derive H2 addresses from H1.
const BINARY_COLORS0411={on:'#ff0000',off:'#00ef00',bad:'#ff00ef',unknown:'#666666'};
function binaryColor0411(raw,quality='GOOD'){
 return quality==='BAD'?BINARY_COLORS0411.bad:raw===true||raw===1?BINARY_COLORS0411.on:raw===false||raw===0?BINARY_COLORS0411.off:BINARY_COLORS0411.unknown;
}
function ioReference0411(address,role,extra={}){
 const found=window.__binaryIoRef0411.points[address];
 return found?{...found,role:role||found.role,...extra}:null;
}
function ioLogic0411(address,page,note=''){
 return {address,role:'LOGIC',source:'unit',page,note,description:'Tín hiệu logic; không phải địa chỉ card/channel'};
}
function equipmentRefs0411(id){return window.__binaryIoRef0411.equipment[id]||[];}
const CONDITION_UNIT_DI0411=[
 [null,null,null,null,null,null,'U1V_1DI0416',null,null,null,null,'U1V_1DI0150','U1V_1DI0152','U1V_1DI0061','U1V_1DI0066','U1V_1DI0270','U1V_1DI0294','U1V_1DI0295','U1V_1DI0296','U1V_1DI0291','U1V_1DI0290','U1V_1DI0289'],
 ['U1V_1DI0316','U1V_1DI0300','U1V_1DI0319','U1V_1DI0320','U1V_1DI0333','U1V_1DI0336','U1V_1DI0338','U1V_1DI0359','U1V_1DI0360',null,'U1V_1DI0345','U1V_1DI0347',null,'U1V_1DI0127','U1V_1DI0125','U1V_1DI0110','U1V_1DI0273','U1V_1DI0274','U1V_1DI0277','U1V_1DI0422','U1V_1DI0423','U1V_1DI0362',null,'U1V_1DI0415','U1V_1DI0157','U1V_1DI0158','U1V_1DI0202',null]
];
const CONDITION_BRANCH0411=[
 ['DS272-7','DS271-1','DS271-2','DS273-7','DS273-1','DS273-3',null,'DS231-3','CB271','CB273'],
 ['DS272-7','DS272-2','DS272-4','DS273-7','DS274-3','DS274-4',null,'DS232-3','CB272','CB274']
];
function conditionMetadata0411(unit,part,index){
 const n=unit.unit,branch=part===1?(index===13?'DS'+(900+n)+'-3':index===14?'DS'+(900+n)+'-0':CONDITION_BRANCH0411[n-1][index]):null,inverse=part===1&&index===14;
 let refs=[],label=null;
 if(branch){
  refs=equipmentRefs0411(branch).filter(r=>r.role===(inverse?'DI MỞ':'DI ĐÓNG')||r.role===(inverse?'DO MỞ':'DO ĐÓNG'));
  const shown=displayEquipmentId(branch);
  label=branch.startsWith('CB')?shown.replace('CB','')+' CB CLOSE':shown.replace(/^DS/,'')+' DS '+(inverse?'OPEN':'CLOSE');
 }else if(n===1){
  const address=CONDITION_UNIT_DI0411[part-1][index];
  if(address)refs=[ioReference0411(address,'DI')];
  if(part===1&&index===10)refs=[ioLogic0411('U1V_SH006_02',34,'43CH NOT USE là trạng thái logic đã xử lý; không phải DI 43CH SET.'),ioReference0411('U1V_1DO0278','DO RESET')];
  if(part===2&&index===9)refs=[ioLogic0411('U1V_SH033_03',35,'Đầu ra bộ trễ dừng máy, không phải DI tốc độ thô.')];
  if(part===2&&index===12)refs=[ioLogic0411('U1V_SH014_05',37,'Nhánh tổng chốt cắt theo bản in PLC; không đồng nhất với một DI chốt riêng.')];
  if(part===2&&index===22)refs=[ioReference0411('U1V_6MDI0045','DI truyền thông')];
 }else{
  // Only H2 references explicitly visible in SY/AL declarations or the supplied photographs.
  if(part===1&&index===11)refs=[ioReference0411('SYV_2DI0150','DI MỞ')];
  if(part===1&&index===16)refs=[ioReference0411('ALV_2DI0294','DI ĐÓNG')];
 }
 if(part===1&&index===10)label='43CH NOT USE';
 if(part===2&&index===1)label='GOVERNOR READY FOR START';
 if(part===2&&index===11)label='PRESSURE ACCUMULATOR PRESSURE LOW LOW';
 return {refs:refs.filter(Boolean),branch,label,inverse};
}
function conditionFeedback0411(unit,part,index,c){
 const meta=conditionMetadata0411(unit,part,index),state=meta.branch?unit.plant.equipment?.get(meta.branch):null;
 let raw=state?(meta.inverse?!state.value:!!state.value):c.raw,quality=unit.qualityGood&&!state?.bad?'GOOD':'BAD';
 const alias=part===1?({11:'breakerOpen',16:'inletClosed'}[index]):({0:'gateClosed',15:'avrAuto'}[index]);
 const aliases=[c.key,...meta.refs.filter(r=>r.role.startsWith('DI')).map(r=>r.address)];
 if(alias){const input=unit.raw(alias,raw);raw=input.value;if(input.quality==='BAD')quality='BAD';aliases.push(input.tag,alias);}
 const override=aliases.find(key=>Object.hasOwn(unit.s.di,key));
 if(override!==undefined)raw=unit.s.di[override];
 if(aliases.some(key=>unit.s.sensorFaults[key]))quality='BAD';
 if(part===2&&index===24&&unit.s.lockout)raw=true; // 5E latch cannot be hidden by an OFF indication override.
 // Visual names follow each unit's own switchyard branch; session keys remain compatible.
 const tag=meta.label||c.tag;
 return {...c,tag,vi:part===1&&index===14?'DCL phanh điện đầu cực mở':c.vi,raw,quality,ok:quality==='GOOD'&&raw===c.required,refs:meta.refs,branch:meta.branch};
}
function conditionPoint0411(part,index,unitIndex=selected){
 const unit=plant.units[unitIndex],c=unit.conditions(part)[index];
 if(!c)return null;
 return {kind:'condition',part,key:index,unit:unitIndex,label:c.tag,raw:c.raw,quality:c.quality,required:c.required,ok:c.ok,refs:c.refs,note:c.required===false?'Nhánh đảo: tín hiệu thô 0 mới đạt điều kiện. Màu ô vuông vẫn biểu diễn RAW.':'Màu ô vuông biểu diễn tín hiệu thô, độc lập với kết quả liên động.',modelNote:c.info?'Nhánh trạm trong mô hình khởi động còn giản lược.':''};
}
const SEQUENCE_INPUT0411={
 coolingValve:['waterOpen','U1V_1DI0351'],lift:['liftRun','U1V_1DI0401'],liftPressure:['liftPressure','U1V_1DI0285'],
 heaterOff:['heaterOn','U1V_1DI0403',true],flowUpper:['upperLow','U1V_1DI0279',true],flowLower:['lowerLow','U1V_1DI0281',true],flowAir:['airLow','U1V_1DI0283',true],
 inletOpen:['inletOpen','U1V_1DI0293'],inletClosed:['inletClosed','U1V_1DI0294'],speed90:['speed90','U1V_1DI0313'],
 breaker:['breakerClosed','U1V_1DI0149'],cbOpen:['breakerOpen','U1V_1DI0150'],gateClosed:['gateClosed','U1V_1DI0316'],
 draftLow:['waterDepressed','U1V_1DI0391']
};
const SEQUENCE_DIRECT_DI0411={bypassClosed:'U1V_1DI0295',excited:'U1V_1DI0114',excOff:'U1V_1DI0127',eBrake:'U1V_1DI0132',noLoad:'U1V_1DI0317'};
function sequencePoint0411(key,unitIndex=selected,label=''){
 const unit=plant.units[unitIndex],st=unit.s,m=SEQUENCE_INPUT0411[key];
 let raw=st.signals[key],quality=unit.qualityGood&&st.signalQuality?.[key]!=='BAD'?'GOOD':'BAD',refs=[],negated=false;
 if(m){
  negated=!!m[2];const x=unit.raw(m[0],negated?!raw:raw);raw=x.value;if(x.quality==='BAD')quality='BAD';
  if(unitIndex===0)refs=[ioReference0411(m[1],'DI')];
  else if(key==='cbOpen')refs=[ioReference0411('SYV_2DI0150','DI MỞ')];
  else if(key==='inletClosed')refs=[ioReference0411('ALV_2DI0294','DI ĐÓNG')];
 }else if(unitIndex===0&&SEQUENCE_DIRECT_DI0411[key])refs=[ioReference0411(SEQUENCE_DIRECT_DI0411[key],'DI')];
 if(unitIndex===0){
  if(key==='startCondition')refs=[ioLogic0411('U1V_SH014_01',38)];
  if(key==='auxStart')refs=[ioReference0411('U1V_1PDI0067','DI logic'),ioReference0411('U1V_1DO0279','DO START')];
  if(key==='auxStopped')refs=[ioReference0411('U1V_1PDI0068','DI logic'),ioReference0411('U1V_1DO0280','DO STOP')];
 }
 if(key==='lineBreaker'){const d=plant.equipment.get('CB271');raw=d?.value;quality=d?.bad?'BAD':quality;refs=equipmentRefs0411('CB271').filter(x=>x.role==='DI ĐÓNG');}
 // Do not relabel an aggregate comparison as a physical DI. Unknown signals remain grey.
 if(key==='lineCharge')raw=null;
 const input=refs.find(r=>r.role.startsWith('DI'));
 if(input&&Object.hasOwn(st.di,input.address))raw=st.di[input.address];
 if(input&&st.sensorFaults[input.address])quality='BAD';
 return {kind:'sequence',key,unit:unitIndex,label:label||key,raw,quality,refs:refs.filter(Boolean),negated,note:negated?'Ô vuông là RAW trước nhánh NOT. Đầu vào 0 qua nhánh đảo tạo điều kiện 1.':refs.length?'Tín hiệu trong phiên OTS; địa chỉ đối chiếu bản in PLC.':'Tín hiệu tổng hợp của OTS; chưa xác định một địa chỉ DO/DI vật lý tương ứng.'};
}
function equipmentPoint0411(id){
 const eq=plant.equipment,d=eq.get(id),a=eq.auxState(id),state=d||a;
 return {kind:'equipment',key:id,label:displayEquipmentId(id),raw:state?(d?d.value:a.on):null,quality:state?.bad?'BAD':'GOOD',refs:equipmentRefs0411(id),note:id==='DS273-3'?'Ảnh 2026 ghi DS273-5, bản in PLC 2023 ghi DS273-3. Địa chỉ dưới đây là đối chiếu bản in cũ, chưa xác nhận sau đổi nhãn.':'Địa chỉ là tham chiếu tài liệu. Trạng thái đang hiển thị lấy từ mô hình OTS.'};
}
const QUICK_INPUTS0411=[
 ['TB GUIDE BEARING NO.1 PAD TEMP. HIGH HIGH','U1V_1DI0354'],
 ['TB GUIDE BEARING NO.5 PAD TEMP. HIGH HIGH','U1V_1DI0356'],
 ['TURBINE GUIDE BEARING OIL TEMP. HIGH HIGH','U1V_1DI0358'],
 ['TURBINE GUIDE BEARING OIL LEVEL LOW','U1V_1DI0360'],
 ['HEAD COVER WATER LEVEL HIGH','U1V_1DI0361'],
 ['SHAFT SEAL WATER PRESSURE LOW','U1V_1DI0363'],
 ['SHAFT SEAL WATER FLOW LOW','U1V_1DI0364'],
 ['OIL COOLER NO.1 WATER FLOW LOW','U1V_1DI0365'],
 ['OIL COOLER NO.1 INLET WATER PRESSURE LOW','U1V_1DI0367'],
 ['OIL COOLER NO.2 WATER FLOW LOW','U1V_1DI0366'],
 ['OIL COOLER NO.2 INLET WATER PRESSURE LOW','U1V_1DI0368'],
 ['OIL COOLER NO.1 OUTLET WATER PRESSURE LOW','U1V_1DI0369'],
 ['OIL COOLER NO.2 OUTLET WATER PRESSURE LOW','U1V_1DI0370'],
 ['SPEED > 0% (UNIT STARTED)','U1V_1DI0309'],
 ['MAINTENANCE SEAL PRESSURE ABNORMAL','U1V_1DI0362'],
 ['SHAFT RUN OUT HIGH (TURBINE)','U1V_1DI0372'],
 ['PA OIL LEVEL LOW LOW','U1V_1DI0346'],
 ['PA OIL PRESSURE LOW LOW','U1V_1DI0347'],
 ['SHEAR PIN BROKEN (86-2)','U1V_1DI0398'],
 ['INLET VALVE FAULT (86-2) FROM OTHER UNIT',null],
 ['TURBINE OVER SPEED','U1V_1DI0314'],
 ['TURBINE RUNWAY SPEED','U1V_1DI0315'],
 ['GOVERNOR CONTROL POWER SUPPLY-1 FAULT','U1V_1DI0321'],
 ['GOVERNOR CONTROL POWER SUPPLY-2 FAULT','U1V_1DI0322'],
 ['STOP 3 FROM GOVERNOR CONTROL','U1V_1DI0335'],
 ['GOVERNOR MANUAL MODE','U1V_1DI0342'],
 ['86-1(1) OPERATE','U1V_1DI0157'],
 ['86-1(2) OPERATE','U1V_1DI0202'],
 ['86-2 OPERATE','U1V_1DI0158']
];
const QUICK_OUTPUT_LABELS0423={quick:'86-2 S/W QUICK STOP',cross:'INLET VALVE FAULT (86-2)',emergency:'EMERGENCY VALVE OPEN'};
function quickSimulationKey0423(kind,key){return 'OTS_QUICK_'+kind.toUpperCase()+'_'+key;}
function quickSimulationState0423(unit,kind,key,raw=null,quality='GOOD'){
 const tag=quickSimulationKey0423(kind,key),forced=Object.hasOwn(unit.s.di,tag);
 if(forced)raw=unit.s.di[tag];
 if(unit.s.sensorFaults[tag])quality='BAD';
 const assumed=raw===null;return {raw:assumed?false:raw,quality,modelSource:forced?'FORCED':assumed?'ASSUMED_NORMAL':'LIVE_MODEL'};
}
function quickOutputPoint0423(key,unitIndex=selected){
 const unit=plant.units[unitIndex];if(!unit||!Object.hasOwn(QUICK_OUTPUT_LABELS0423,key))return null;
 return {kind:'quickoutput',key,unit:unitIndex,label:QUICK_OUTPUT_LABELS0423[key]+(key==='cross'?' TO UNIT '+(2-unitIndex):''),...quickSimulationState0423(unit,'quickoutput',key,null,unit.qualityGood?'GOOD':'BAD'),refs:[],note:'Đầu ra OTS giả lập: mặc định không tác động, có thể chọn TÁC ĐỘNG / KHÔNG TÁC ĐỘNG / BQ. Đây là trạng thái huấn luyện, chưa mô phỏng hàm bảo vệ PLC hoặc phát lệnh trip.'};
}
function setQuickSimulation0423(p,unitIndex,kind,key,mode){
 if(![0,1].includes(unitIndex)||!['quick','quickoutput'].includes(kind)||!['auto','off','on','bad'].includes(mode))return {ok:false,message:'Lựa chọn tín hiệu không hợp lệ.'};
 if(kind==='quick'&&(!/^\d+$/.test(String(key))||Number(key)<0||Number(key)>=29)||kind==='quickoutput'&&!Object.hasOwn(QUICK_OUTPUT_LABELS0423,key))return {ok:false,message:'Không có tín hiệu này.'};
 if(p.role==='AVGuest')return {ok:false,message:'Vai trò chỉ giám sát.'};
 if(kind==='quick'&&Number(key)===26&&p.units[unitIndex].s.lockout&&['on','off'].includes(mode))return {ok:false,message:'86-1(1) đang giữ bởi bảo vệ 5E. Chỉ RESET 86 sau khi đủ điều kiện mới nhả.'};
 const unit=p.units[unitIndex],tag=quickSimulationKey0423(kind,key);
 if(mode==='auto'){delete unit.s.di[tag];delete unit.s.sensorFaults[tag];}
 else if(mode==='bad')unit.s.sensorFaults[tag]=true;
 else{unit.s.di[tag]=mode==='on';delete unit.s.sensorFaults[tag];}
 unit.log('INSTRUCTOR',tag+' → '+mode.toUpperCase()+' · giả lập chỉ thị QUICK STOP');
 return {ok:true,message:'Đã đổi trạng thái giả lập H'+(unitIndex+1)+'.'};
}
function quickPoint0411(index,unitIndex=selected){
 const row=QUICK_INPUTS0411[index],unit=plant.units[unitIndex];if(!row)return null;
 let refs=unitIndex===0&&row[1]?[ioReference0411(row[1],'DI')]:[],raw=null,quality=unit.qualityGood?'GOOD':'BAD';
 if(index===26)raw=!!unit.s.lockout; // Same latch as START CONDITION and 5E annunciation.
 if(index===13){raw=unit.s.rpm>.1;if(unitIndex===1)refs=[{address:'2DI0309',role:'DI',source:'photo0411',description:'SPEED > 0% (UNIT STARTED)',note:'Địa chỉ ngắn hiện trên dòng sự kiện của ảnh DCS 30/10/2026; chưa xác nhận tên biến PLC đầy đủ.'}];}
 if(index===19&&unitIndex===0)refs=[{address:'U1V_2PDI0070',role:'DI truyền thông',source:'unit',page:36,description:'86-2 từ tổ máy còn lại'}];
 if(index===18&&unitIndex===0)refs=[ioLogic0411('U1V_SH014_05',37,'Tổng chốt cắt theo nhánh PLC, từ nhóm DI0438–DI0461. Không gán DI0398 cho tín hiệu tổng này.')];
 if(index===15&&unitIndex===0&&refs[0])refs[0]={...refs[0],note:'Ảnh ghi HIGH; nhánh PLC 2023 dùng DI0372 HIGH HIGH. Cần đối chiếu mức và địa chỉ thực nạp hiện tại.'};
 const tag=refs.find(x=>x.role.startsWith('DI'))?.address;
 if(tag&&Object.hasOwn(unit.s.di,tag))raw=unit.s.di[tag];
 if(tag&&unit.s.sensorFaults[tag])quality='BAD';
 const simulated=quickSimulationState0423(unit,'quick',index,raw,quality);
 if(index===26&&unit.s.lockout){simulated.raw=true;simulated.modelSource='PROTECTION_LATCH';}
 return {kind:'quick',key:index,unit:unitIndex,...simulated,label:index===19?'INLET VALVE FAULT (86-2) FROM UNIT '+(2-unitIndex):row[0],refs:refs.filter(Boolean),note:simulated.modelSource==='PROTECTION_LATCH'?'86-1(1) đang tác động theo khóa bảo vệ 5E của tổ máy. ACK chỉ xác nhận báo động; RESET 86 khi đủ điều kiện mới nhả. 86-1(2) và 86-2 vẫn độc lập.':(simulated.modelSource==='ASSUMED_NORMAL'?'OTS giả định ban đầu: KHÔNG TÁC ĐỘNG. ':simulated.modelSource==='FORCED'?'OTS đang ép trạng thái tín hiệu. ':'Theo tín hiệu hiện có của mô hình. ')+'Chọn trạng thái để luyện tập; thay đổi chỉ thị này không tự phát lệnh trip.'};
}
function pointFromElement0411(node){
 const d=node.dataset,index=Number(d.ioUnit??selected),key=d.ioKey;
 if(d.ioKind==='condition')return conditionPoint0411(Number(d.ioPart),Number(key),index);
 if(d.ioKind==='sequence')return sequencePoint0411(key,index,d.ioLabel);
 if(d.ioKind==='equipment')return equipmentPoint0411(key);
 if(d.ioKind==='quick')return quickPoint0411(Number(key),index);
 if(d.ioKind==='quickphoto')return quickPhotoPoint0411(Number(key));
 if(d.ioKind==='permissive')return {kind:'permissive',key,unit:index,label:key==='1'?'STARTING CONDITION-1':'STARTING CONDITION',raw:key==='1'?plant.units[index].conditions(1).every(c=>c.ok||c.info):plant.units[index].ready,quality:plant.units[index].qualityGood?'GOOD':'BAD',refs:index===0?[ioLogic0411(key==='1'?'U1V_SH010_01':'U1V_SH014_01',key==='1'?34:38)]:[],note:'Đây là kết quả liên động tổng, khác tín hiệu thô ở từng đầu vào.'};
 if(d.ioKind==='quickoutput')return quickOutputPoint0423(key,index);
 return null;
}
function pointState0411(point){return (point.historical?'R · ':'')+(point.quality==='BAD'?'BQ':point.raw===true||point.raw===1?'1 · ON / CÓ TÍN HIỆU':point.raw===false||point.raw===0?'0 · OFF / KHÔNG CÓ TÍN HIỆU':'CHƯA CÓ PHẢN HỒI');}
function refSource0411(ref){
 const source=window.__binaryIoRef0411.sources[ref.source]?.title||(ref.source==='photo0411'?'Ảnh DCS 30/10/2026':'Tài liệu');
 return source+(ref.page?' · PDF '+ref.page:'');
}
function pointTitle0411(point){
 return point.label+'\n'+(point.refs.length?point.refs.map(r=>r.role+': '+r.address+(r.note?' · '+r.note:'')).join('\n'):'DI/DO: chưa xác minh')+'\nRAW: '+pointState0411(point)+(point.note?'\n'+point.note:'');
}
function pointAttrs0411(kind,key,index=selected,part='',label=''){
 return `data-io-kind="${kind}" data-io-key="${esc(key)}" data-io-unit="${index}"${part!==''?` data-io-part="${part}"`:''}${label?` data-io-label="${esc(label)}"`:''} tabindex="0"`;
}
function ioPanel0411(point){
 const refs=point.refs||[];
 return `<section class="io-detail0411"><div class="io-state0411" data-io-state0411><i style="background:${binaryColor0411(point.raw,point.quality)}"></i><strong>${esc(pointState0411(point))}</strong></div>${refs.length?`<table class="hmi-table io-addresses0411"><thead><tr><th>ĐIỂM</th><th>ĐỊA CHỈ DO / DI</th><th>NGUỒN</th></tr></thead><tbody>${refs.map(r=>`<tr><td>${esc(r.role)}</td><td><code>${esc(r.address)}</code>${r.note?`<small>${esc(r.note)}</small>`:''}</td><td>${esc(refSource0411(r))}</td></tr>`).join('')}</tbody></table>`:'<p class="io-unmapped0411">DI/DO: chưa xác minh trong tài liệu hiện có.</p>'}${point.required!==undefined?`<p data-io-evaluation0411>RAW = <b>${point.raw?1:0}</b> · REQUIRED = <b>${point.required?1:0}</b> · CONDITION = <b>${point.ok?'TRUE':'FALSE'}</b></p>`:''}<p>${esc(point.note||'')}</p>${point.modelNote?`<p>${esc(point.modelNote)}</p>`:''}<small>Địa chỉ đối chiếu tài liệu; chưa có xác nhận rack/card/channel và cấu hình online.</small></section>`;
}
let ioFace0411=null,ioHover0411=null,ioTipPosition0411={x:0,y:0};
function conditionModal0411(part,index,unitIndex=selected){
 const p=conditionPoint0411(part,index,unitIndex);if(!p)return;
 openModal(esc(p.label),'ĐỊA CHỈ DI / DO · STARTING CONDITION',ioPanel0411(p),btn('OTS: CHANGE INPUT','condition-override',`data-part="${part}" data-index="${index}" data-unit="${unitIndex}"`)+btn('CLOSE','close-modal'));
 ioFace0411={kind:'condition',part,key:index,unit:unitIndex};
}
function inspectPoint0411(node){
 const p=pointFromElement0411(node);if(!p)return;
 const simulation=!p.historical&&['quick','quickoutput'].includes(node.dataset.ioKind);
 const controls=simulation?[['auto','TỰ ĐỘNG / MẶC ĐỊNH'],['off','KHÔNG TÁC ĐỘNG'],['on','TÁC ĐỘNG'],['bad','BQ']].map(([mode,label])=>btn(label,'quick-simulation0423',`data-mode="${mode}" data-kind="${node.dataset.ioKind}" data-key="${p.key}" data-unit="${p.unit}"`)).join(''):'';
 openModal(esc(p.label),simulation?'MÔ PHỎNG TÍN HIỆU OTS · 0 XANH / 1 ĐỎ / BQ TÍM':'ĐỊA CHỈ DO / DI · GIÁM SÁT',ioPanel0411(p),controls+(p.historical?btn('ẢNH QUICK STOP','quick-photo-reference0411'):'')+btn('CLOSE','close-modal'));
 ioFace0411={kind:node.dataset.ioKind,key:node.dataset.ioKey,part:node.dataset.ioPart,unit:Number(node.dataset.ioUnit??selected),label:node.dataset.ioLabel};
}
function plcInputModal0411(key){
 const st=s(),d=u().devices,map={waterOpen:d.waterValve.on,liftRun:d.lift.on,liftPressure:st.liftPressure>.98,upperLow:!st.flowUpper,lowerLow:!st.flowLower,airLow:!st.flowAir,speed90:st.rpm>plant.profile.speedExcitation*plant.profile.rpm,inletOpen:d.inlet.on,breakerClosed:d.breaker.on,gateClosed:d.gate.closed,waterDepressed:st.draft<47.85};
 const raw=u().raw(key,map[key]),ref=selected===0?ioReference0411(unitTags[key],'DI'):null;
 const point={label:'H'+(selected+1)+' · '+key,raw:raw.value,quality:raw.quality,refs:ref?[ref]:[],note:'Thay phản hồi để luyện tìm nguyên nhân kẹt bước. Đầu vào LOW được xét qua nhánh đảo; BQ không xác nhận điều kiện đạt.'};
 openModal(point.label,'DI · OTS INSTRUCTOR',ioPanel0411(point),['auto','off','on','bad'].map(mode=>btn(mode.toUpperCase(),'input-override',`data-input="${key}" data-mode="${mode}"`)).join('')+btn('CLOSE','close-modal'));
}
function binaryLegend0411(){return '<span class="binary-legend0411"><span><i style="background:#f00"></i>1 · ĐÓNG</span><span><i style="background:#00ef00"></i>0 · CẮT</span><span><i style="background:#ff00ef"></i>BQ</span><span><i style="background:#666"></i>Chưa có phản hồi</span></span>';}
function quickPhotoPoint0411(index){
 const p=quickPoint0411(index,0);if(!p)return null;
 return {...p,kind:'quickphoto',historical:true,raw:index===13,quality:index===11?'BAD':'GOOD',label:'H1 · '+p.label,note:'R · Ảnh DCS thực tế do người dùng cung cấp ngày 30/10/2026. Màu và giá trị thuộc thời điểm chụp, không phải phản hồi của phiên OTS. Địa chỉ đối chiếu bản in PLC U1.'};
}
function quickStopPhotoModal0411(){
 let rows='';
 for(let i=0;i<QUICK_INPUTS0411.length;i++){
  const p=quickPhotoPoint0411(i),y=172+i*16.65;
  rows+=`<g class="photo-point0411" data-action="io-inspect0411" ${pointAttrs0411('quickphoto',i,0)}><title>${esc(pointTitle0411(p))}</title><rect x="84" y="${y}" width="294" height="16.4" fill="transparent"/></g>`;
 }
 const body=`<div class="quick-photo0411"><p><b>R · ẢNH THAM CHIẾU H1</b> · Rê chuột hoặc bấm từng dòng để tra DI. Đây là ảnh thực tế, không dùng màu trong ảnh làm phản hồi cho phiên mô phỏng.</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1282 706" aria-label="Ảnh QUICK STOP thực tế H1 và vùng tra địa chỉ DI"><image href="${window.__binaryPhotoRefs0411.quick}" width="1282" height="706"/>${rows}</svg></div>`;
 openModal('UNIT 1 CONDITION TO QUICK STOP · HMI THỰC TẾ','ẢNH THAM CHIẾU · KHÔNG PHẢI TRẠNG THÁI PHIÊN OTS',body,btn('CLOSE','close-modal'));$('#modal').classList.add('reference-modal');decorateBinaryObjects0411($('#modal-content'));
}

function quickStopHTML0422(){
 const i=selected,n=i+1,W=1600,H=780,y=k=>24+k*25;
 const text=(x,yy,value,size=13,anchor='start')=>`<text x="${x}" y="${yy}" text-anchor="${anchor}" style="font-size:${size}px">${esc(value)}</text>`;
 const wire=(d,arrow=false)=>`<path d="${d}" class="wire"${arrow?' marker-end="url(#quick-arrow-'+n+')"':''}/>`;
 const dot=(x,yy)=>`<circle cx="${x}" cy="${yy}" r="3" fill="#ddd"/>`;
 const gate=(x,yy,type='and')=>`<g class="quick-gate"><title>Cấu trúc nhánh theo ảnh HMI; chưa xác minh hàm PLC thực nạp.</title><path d="M${x} ${yy-12}h12q32 12 0 24h-12Z" fill="#000" stroke="#ddd" stroke-width="1.5"/>${type==='delay'?wire(`M${x+3} ${yy}h13`,true):''}</g>`;
 const collector=(x,a,b,cy)=>wire(`M${x} ${a}V${b}`)+`<circle cx="${x+9}" cy="${cy}" r="8" fill="#000" stroke="#ddd" stroke-width="1.5"/>`;
 let d=`<defs><marker id="quick-arrow-${n}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#ddd"/></marker></defs>`;
 // Seven direct/conditioned inputs into upper branch; six cooler inputs below.
 for(let k=0;k<=6;k++){if(k===4)d+=wire(`M440 ${y(k)}H690`,true)+gate(690,y(k),'delay')+wire(`M718 ${y(k)}H875`,true);else d+=wire(`M440 ${y(k)}H875`,true);}
 d+=collector(875,y(0)-6,y(6)+6,y(2))+wire(`M892 ${y(2)}H1305`,true);
 for(const [a,b]of [[7,8],[9,10]]){d+=wire(`M440 ${y(a)}H690`,true)+wire(`M440 ${y(b)}H690`,true)+wire(`M690 ${y(a)-5}V${y(b)+5}`)+wire(`M700 ${(y(a)+y(b))/2}H875`,true)+`<path d="M690 ${y(a)-5}h10v${y(b)-y(a)+10}h-10" fill="none" stroke="#ddd" stroke-width="1.5"/>`;}
 for(const k of [11,12])d+=wire(`M440 ${y(k)}H875`,true);
 const coolY=y(9)-7;
 d+=collector(875,y(7)-6,y(12)+6,coolY)+wire(`M892 ${coolY}H1040`,true)+gate(1040,coolY+10)+wire(`M1068 ${coolY+10}H1170`,true)+gate(1170,coolY+10,'delay')+wire(`M1198 ${coolY+10}H1305`,true);
 const speedY=y(13),sealY=(y(14)+y(15))/2;
 d+=wire(`M440 ${speedY}H1000`)+dot(1000,speedY)+wire(`M1000 ${speedY}V${coolY+18}H1040`,true)+wire(`M1000 ${speedY}V${sealY+15}H1040`,true);
 for(const k of [14,15])d+=wire(`M440 ${y(k)}H875`,true);
 d+=collector(875,y(14)-6,y(15)+6,sealY)+wire(`M892 ${sealY}H1040`,true)+gate(1040,sealY+5)+wire(`M1068 ${sealY+5}H1305`,true);
 d+=wire(`M440 ${y(16)}H690`,true)+gate(690,y(16),'delay')+wire(`M718 ${y(16)}H1305`,true);
 for(const k of [17,18,19])d+=wire(`M440 ${y(k)}H1305`,true);
 for(const k of [20,21])d+=wire(`M440 ${y(k)}H690`,true)+gate(690,y(k),'delay')+wire(`M718 ${y(k)}H790`,true);
 const speedTripY=(y(20)+y(21))/2,powerY=(y(22)+y(23))/2,tripY=powerY+5;
 d+=collector(790,y(20)-6,y(21)+6,speedTripY)+wire(`M807 ${speedTripY}H875`,true);
 for(const k of [22,23])d+=wire(`M440 ${y(k)}H790`,true);
 d+=wire(`M790 ${y(22)-6}V${y(23)+6}`)+`<path d="M790 ${y(22)-6}h10v${y(23)-y(22)+12}h-10" fill="none" stroke="#ddd"/>`+wire(`M800 ${powerY}H875`,true);
 d+=wire(`M440 ${y(24)}H875`,true)+collector(875,speedTripY-5,y(24)+6,tripY)+wire(`M892 ${tripY}H1305`,true)+dot(1150,tripY)+wire(`M1150 ${tripY}V675H1305`,true);
 d+=wire(`M440 ${y(25)}H875`,true);
 for(const k of [26,27,28])d+=wire(`M440 ${y(k)}H695`,true);
 d+=collector(695,y(26)-6,y(28)+6,y(27))+wire(`M712 ${y(27)}H875`,true)+wire(`M875 ${y(25)-6}V${y(27)+6}`)+`<path d="M875 ${y(25)-6}h12v${y(27)-y(25)+12}h-12" fill="none" stroke="#ddd"/>`+wire(`M887 ${(y(25)+y(27))/2}H1305`,true);
 d+=collector(1305,y(2)-15,tripY+15,310)+wire('M1322 310H1410',true)+collector(1305,667,708,694)+wire('M1322 694H1410',true);
 for(const [key,yy,lines]of [['quick',310,['86-2 S/W','QUICK STOP']],['cross',510,['INLET VALVE FAULT','(86-2) TO UNIT '+(n===1?2:1)]],['emergency',694,['EMERGENCY','VALVE OPEN']]]){
  const label=lines.join(' ');d+=`<g data-action="io-inspect0411" ${pointAttrs0411('quickoutput',key,i,'',label)}><rect x="1410" y="${yy-23}" width="155" height="46" class="logic-box"/>${text(1487,yy-3,lines[0],14,'middle')}${text(1487,yy+14,lines[1],14,'middle')}<rect data-quick-output0411="${key}" x="1576" y="${yy-6}" width="12" height="12" fill="#666"/></g>`;
 }
 // Render labels last so no wire can obscure a label or status square.
 for(let k=0;k<QUICK_INPUTS0411.length;k++){
  const p=quickPoint0411(k,i);d+=`<g class="quick-input" data-action="io-inspect0411" ${pointAttrs0411('quick',k,i)}><rect x="40" y="${y(k)-9}" width="400" height="18" class="logic-box"/><rect data-quick-bit0411="${k}" x="18" y="${y(k)-6}" width="12" height="12" fill="${binaryColor0411(p.raw,p.quality)}"/>${text(47,y(k)+4,p.label,13)}</g>`;
 }
 return `<div class="logic-page quick-stop-page"><svg class="logic-svg quick-stop-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin meet" role="group" aria-label="UNIT ${n} CONDITION TO QUICK STOP · 29 đầu vào và 3 đầu ra">${d}</svg><div class="logic-bottom"><span class="binary-legend0411"><span><i style="background:#f00"></i>1 · ON</span><span><i style="background:#00ef00"></i>0 · OFF</span><span><i style="background:#ff00ef"></i>BQ</span></span><span>OTS · 86-1(1) theo bảo vệ 5E; giữ đến RESET 86. Các điểm khác cho giả lập ON/OFF/BQ.</span>${btn('ẢNH THỰC TẾ H1','quick-photo-reference0411')}</div></div>`;
}

function decorateBinaryObjects0411(root=document){
 for(const node of root.querySelectorAll('[data-permissive]')){
  node.dataset.ioKind='permissive';node.dataset.ioKey=node.dataset.permissive;node.dataset.ioUnit=String(selected);node.dataset.action='io-inspect0411';node.setAttribute('tabindex','0');node.setAttribute('role','button');
 }
 for(const node of root.querySelectorAll('[data-action="equipment-open"]')){
  node.dataset.ioKind='equipment';node.dataset.ioKey=node.dataset.equipment;node.setAttribute('tabindex','0');
 }
 for(const node of root.querySelectorAll('[data-io-kind]')){
  const p=pointFromElement0411(node);if(!p)continue;
  node.setAttribute('title',pointTitle0411(p));node.setAttribute('aria-label',pointTitle0411(p));
  if(node.tagName.toLowerCase()==='g')node.setAttribute('role','button');
 }
}
function ioTooltip0411(){
 let tip=document.getElementById('io-tooltip0411');
 if(!tip){tip=document.createElement('div');tip.id='io-tooltip0411';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.appendChild(tip);}
 return tip;
}
function hideIoTooltip0411(){ioHover0411=null;const tip=document.getElementById('io-tooltip0411');if(tip)tip.hidden=true;}
function showIoTooltip0411(node,event){
 const point=pointFromElement0411(node);if(!point)return;
 ioHover0411=node;
 const b=node.getBoundingClientRect();ioTipPosition0411={x:event?.clientX??b.left,y:event?.clientY??b.bottom};
 refreshIoTooltip0411(point);
}
function refreshIoTooltip0411(point){
 const tip=ioTooltip0411();tip.hidden=false;
 tip.innerHTML=`<b>${esc(point.label)}</b><span style="color:${binaryColor0411(point.raw,point.quality)}">RAW: ${esc(pointState0411(point))}</span>${point.refs.length?point.refs.map(r=>`<div><strong>${esc(r.role)}</strong> <code>${esc(r.address)}</code>${r.note?`<small>${esc(r.note)}</small>`:''}</div>`).join(''):'<div>DI/DO: chưa xác minh</div>'}${point.note?`<small>${esc(point.note)}</small>`:''}`;
 const w=tip.offsetWidth||360,h=tip.offsetHeight||100;
 tip.style.left=Math.max(8,Math.min(ioTipPosition0411.x+14,window.innerWidth-w-8))+'px';
 tip.style.top=Math.max(8,Math.min(ioTipPosition0411.y+16,window.innerHeight-h-8))+'px';
}
function updateBinaryScreens0411(root=document){
 const conditionRows={};
 for(const node of root.querySelectorAll('[data-condition]')){
  const part=Number(node.dataset.part);conditionRows[part]??=u().conditions(part);const p=conditionRows[part][Number(node.dataset.condition)];
  if(p){node.setAttribute('fill',binaryColor0411(p.raw,p.quality));node.dataset.raw=p.raw==null?'unknown':String(+p.raw);node.dataset.quality=p.quality;}
 }
 for(const node of root.querySelectorAll('[data-permissive]')){
  const k=node.dataset.permissive,on=k==='1'?u().conditions(1).every(c=>c.ok||c.info):u().ready;
  node.setAttribute('fill',binaryColor0411(on,u().qualityGood?'GOOD':'BAD'));
 }
 for(const node of root.querySelectorAll('[data-seq-bit]')){
  const p=sequencePoint0411(node.dataset.seqBit);node.setAttribute('fill',binaryColor0411(p.raw,p.quality));
 }
 for(const node of root.querySelectorAll('[data-quick-bit0411]')){
  const p=quickPoint0411(Number(node.dataset.quickBit0411));node.setAttribute('fill',binaryColor0411(p.raw,p.quality));
 }
 for(const node of root.querySelectorAll('[data-quick-output0411]')){const p=quickOutputPoint0423(node.dataset.quickOutput0411);node.setAttribute('fill',binaryColor0411(p.raw,p.quality));}
 if(ioHover0411){if(ioHover0411.isConnected===false)hideIoTooltip0411();else{const p=pointFromElement0411(ioHover0411);if(p)refreshIoTooltip0411(p);}}
 if(ioFace0411&&$('#modal').open&&$('[data-io-state0411]')){
  const d=ioFace0411,p=pointFromElement0411({dataset:{ioKind:d.kind,ioKey:String(d.key),ioUnit:String(d.unit),ioPart:d.part,ioLabel:d.label}});
  if(p){const node=$('[data-io-state0411]');node.innerHTML=`<i style="background:${binaryColor0411(p.raw,p.quality)}"></i><strong>${esc(pointState0411(p))}</strong>`;const evaluation=$('[data-io-evaluation0411]');if(evaluation&&p.required!==undefined)evaluation.innerHTML=`RAW = <b>${p.raw?1:0}</b> · REQUIRED = <b>${p.required?1:0}</b> · CONDITION = <b>${p.ok?'TRUE':'FALSE'}</b>`;}
 }
}
document.addEventListener('pointerover',event=>{const node=event.target.closest?.('[data-io-kind]');if(node&&node!==ioHover0411)showIoTooltip0411(node,event);});
document.addEventListener('pointermove',event=>{if(ioHover0411){ioTipPosition0411={x:event.clientX,y:event.clientY};const p=pointFromElement0411(ioHover0411);if(p)refreshIoTooltip0411(p);}});
document.addEventListener('pointerout',event=>{if(ioHover0411&&!ioHover0411.contains(event.relatedTarget))hideIoTooltip0411();});
document.addEventListener('focusin',event=>{const node=event.target.closest?.('[data-io-kind]');if(node)showIoTooltip0411(node);});
document.addEventListener('focusout',()=>hideIoTooltip0411());
document.addEventListener('scroll',()=>hideIoTooltip0411(),true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'){hideIoTooltip0411();return;}if(!['Enter',' '].includes(event.key))return;const node=event.target.closest?.('g[data-io-kind],rect[data-io-kind]');if(node){event.preventDefault();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});


// MODULE: training-view
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opt=(value,label,current)=>`<option value="${e(value)}" ${value===current?'selected':''}>${e(label)}</option>`;
function lessonPreset(lesson,unit=0){
 const c=clone(DEFAULT_SESSION);c.lesson=lesson;c.unit=unit;
 if(['steady','stop','agc','cooling','dcs','sc'].includes(lesson))c.states[unit]='G';
 if(lesson==='steady'||lesson==='agc')c.states[1-unit]='G';
 return c;
}
function setupHTML(c,{resume=false,evn='',time='00:00:00'}={}){
 const field=(label,key,content,help='')=>`<label class="setup-field"><span>${label}</span>${content}${help?`<small>${help}</small>`:''}</label>`;
 const dynamics=[['pumpStart','Bơm nước khởi động','s'],['waterValve','Hành trình van nước','s'],['liftStart','Bơm nâng trục khởi động','s'],['liftPressure','Tăng áp nâng trục','s'],['bypass','Hành trình bypass','s'],['seal','Hành trình seal','s'],['inlet','Hành trình van tuabin','s'],['equalize','Cân bằng áp lực','s'],['runup','Tăng tốc 0–100%','s'],['excitation','Thành lập điện áp','s'],['loadRamp','Tốc độ tăng tải','MW/s'],['coast','Giảm tốc cơ sở','s']];
 return `<div class="setup-shell"><header class="setup-header"><div class="setup-brand"><img src="${evn}" alt="EVNGENCO2 · Thủy điện A Vương"><div><b>A VƯƠNG</b><span>OPERATOR TRAINING SIMULATOR</span></div></div><div class="setup-header-right"><span class="version-chip">OTS 04.25</span><span>Phiên riêng tư · mô phỏng độc lập</span></div></header>
 <div class="setup-layout"><aside class="setup-sidebar"><div class="sidebar-label">KHÔNG GIAN ĐÀO TẠO</div><div class="sidebar-active"><span>01</span> Thiết lập bài thực hành</div><div class="sidebar-item"><span>02</span> Thao tác trên DCS</div><div class="sidebar-item"><span>03</span> Xem kết quả và SOE</div><div class="sidebar-source"><small>CĂN CỨ LOGIC</small><strong>JBLOCK Rev.G</strong><p>PLC U1 · SY · AL<br>QT.AV.VH.604<br>Sơ đồ nước kỹ thuật</p><button type="button" data-action="about">Xem phạm vi và thông số ↗</button></div><div class="sidebar-footer">Hệ thống điều khiển A Vương<br><strong>2 tổ máy · 33 trang DCS</strong></div></aside>
 <main class="setup-main"><div class="setup-title"><div><span class="setup-kicker">CHUẨN BỊ PHIÊN ĐÀO TẠO</span><h1>Thiết lập bài thực hành</h1><p>Chọn tình huống và trạng thái ban đầu, sau đó thực hiện thao tác trên giao diện DCS.</p></div>${resume?`<button class="setup-secondary" data-action="resume-session">Tiếp tục phiên · ${time}</button>`:''}</div>
 <form id="setup-form"><div class="setup-columns"><div class="setup-form-column"><section class="setup-card"><div class="card-heading"><span class="card-number">1</span><div><h2>Nội dung thực hành</h2><p>Trình tự và mục tiêu của phiên đào tạo.</p></div></div><div class="lesson-quick">${['startup','stop','sc_start','steady'].map(k=>`<button type="button" class="lesson-choice ${c.lesson===k?'active':''}" data-action="choose-lesson" data-lesson="${k}"><span>${{startup:'↗',stop:'↓',sc_start:'↔',steady:'∿'}[k]}</span>${e(LESSON_CATALOG[k][0])}</button>`).join('')}</div>
 ${field('Bài thực hành','lesson',`<select id="setup-lesson" name="lesson">${Object.entries(LESSON_CATALOG).map(([k,v])=>opt(k,v[0],c.lesson)).join('')}</select>`)}<p class="lesson-description">${e(LESSON_CATALOG[c.lesson][1])}</p>
 <div class="setup-fields-2">${field('Tổ máy thực hành','unit',`<select name="unit" id="setup-unit">${opt('0','H1',String(c.unit))}${opt('1','H2',String(c.unit))}</select>`)}${field('Hình thức','method',`<select name="method">${opt('guided','Học có hướng dẫn',c.method)}${opt('practice','Tự thực hành',c.method)}${opt('exam','Bài kiểm tra',c.method)}</select>`)}</div>
 ${field('Học viên / ca vận hành','operator',`<input name="operator" maxlength="80" value="${e(c.operator)}" placeholder="Nhập tên để ghi vào kết quả">`)}</section>
 <section class="setup-card"><div class="card-heading"><span class="card-number">2</span><div><h2>Trạng thái ban đầu</h2><p>Khởi tạo đồng thời cả hai tổ máy theo bài tập.</p></div></div><div class="unit-state-grid">${[0,1].map(i=>`<div class="unit-state-card"><div class="unit-circle">H${i+1}</div>${field('Trạng thái tổ máy','state'+i,`<select name="state${i}">${[['stopped','Dừng dự phòng'],['G','Đang phát G'],['SC','Đang bù SC']].map(([v,l])=>opt(v,l,c.states[i])).join('')}</select>`)}</div>`).join('')}</div><div class="setup-fields-2">${field('Vị trí thao tác','location',`<select name="location">${['OPS1','OPS2','U1MDU','U2MDU'].map(v=>opt(v,v,c.location)).join('')}</select>`)}${field('Tốc độ thời gian','speed',`<select name="speed">${[1,2,5,10].map(v=>opt(String(v),v+'×',String(c.speed))).join('')}</select>`,'Các timer dùng cùng đồng hồ mô phỏng.')}</div><div class="setup-fields-2">${field('P khi khởi tạo trạng thái đang phát','pTarget',`<div class="input-unit"><input name="pTarget" type="number" min="10" max="105" step="0.5" value="${c.pTarget}"><span>MW</span></div>`)}${field('Q ban đầu','qTarget',`<div class="input-unit"><input name="qTarget" type="number" min="-35" max="35" step="0.5" value="${c.qTarget}"><span>MVAr</span></div>`)}</div><div class="setup-info">Bài khởi động G nhận tải ban đầu theo mô hình 10,5 MW; sau khi 92P xác lập, chọn 43ALR USE rồi đặt ALR Set Point. 43ALR NOT USE: tăng/giảm bằng 7-65P.</div></section>
 <section class="setup-card"><div class="card-heading"><span class="card-number">3</span><div><h2>Trạng thái nhiệt ban đầu</h2><p>Mốc phát G theo nhật ký tháng 6/2026, riêng H1/H2.</p></div></div><div class="setup-fields-2">${[0,1].map(i=>field('Nhiệt ban đầu H'+(i+1),'thermalInitial'+i,`<select name="thermalInitial${i}">${[['auto','Theo trạng thái: dừng nguội, G/SC đã ổn định'],['cold','Máy nguội theo môi trường'],['warm','Máy còn nóng sau vận hành']].map(([v,l])=>opt(v,l,c.thermal.initial[i])).join('')}</select>`)).join('')}</div><div class="setup-fields-2">${field('Nhiệt độ môi trường','thermalAmbient',`<div class="input-unit"><input name="thermalAmbient" type="number" min="5" max="45" step="0.5" value="${c.thermal.ambient}"><span>°C</span></div>`)}${field('Nhiệt độ nước làm mát đầu vào','thermalWater',`<div class="input-unit"><input name="thermalWater" type="number" min="5" max="40" step="0.5" value="${c.thermal.waterIn}"><span>°C</span></div>`)}</div><div class="setup-info">Nhiệt độ tăng/giảm dần khi thay đổi tải, đổi chế độ hoặc dừng máy. AUTO với tổ đang phát/bù khởi tạo ở mức cân bằng; chọn máy nguội để quan sát quá trình nóng lên. SC, ngoài dải mẫu và thời gian đáp ứng là giả định đào tạo.</div></section>
 <details class="setup-card setup-advanced"><summary>Tình huống giảng viên và hiệu chỉnh mô hình</summary><p>Thời gian đáp ứng dưới đây là tham số đào tạo cần hiệu chỉnh theo SOE/trend. Giới hạn giám sát JBLOCK được giữ riêng.</p><div class="setup-fields-2">${field('Sự cố theo kịch bản','faultKey',`<select name="faultKey">${opt('none','Không đặt thêm sự cố',c.fault.key)}${opt('nktCommon','Mất nước góp NKT chung',c.fault.key)}${Object.entries(window.__faultLabels||{}).map(([v,l])=>opt(v,l,c.fault.key)).join('')}</select>`)}${field('Tổ máy nhận sự cố','faultUnit',`<select name="faultUnit">${opt('0','H1',String(c.fault.unit))}${opt('1','H2',String(c.fault.unit))}</select>`)}</div><div class="setup-fields-3">${field('Kích hoạt','faultTrigger',`<select name="faultTrigger">${opt('stage','Theo giai đoạn',c.fault.trigger)}${opt('time','Theo giờ mô phỏng',c.fault.trigger)}</select>`)}${field('Giai đoạn','faultStage',`<select name="faultStage">${['STOP','PREPARATION','INLET VALVE','TURBINE START','EXCITATION','PARALLEL IN','LOAD','SC'].map((v,i)=>opt(String(i),v,String(c.fault.stage))).join('')}</select>`)}${field('Sau','faultAfter',`<div class="input-unit"><input name="faultAfter" type="number" min="0" max="7200" value="${c.fault.after}"><span>s</span></div>`)}</div>
 ${field('Căn cứ mốc tốc độ chuyển bước','speedBasis',`<select name="speedBasis">${opt('jblock','JBLOCK / DI0313 >90%',c.speedBasis)}${opt('procedure','Đối chiếu mô tả quy trình 95%',c.speedBasis)}</select>`,'Hai nguồn có khác biệt; lựa chọn được ghi vào phiên, chưa phải xác nhận chỉnh định online.')}<div class="setup-fields-3">${dynamics.map(([k,l,unit])=>field(l,k,`<div class="input-unit"><input name="dyn-${k}" type="number" min="0.1" max="600" step="0.1" value="${c.dynamics[k]}"><span>${unit}</span></div>`)).join('')}</div><label class="check-row"><input type="checkbox" name="illustrativeTrips" ${c.illustrativeTrips?'checked':''}> Bật bảo vệ dầu/nhiệt minh họa với ngưỡng OTS chưa xác nhận</label></details></div>
 <aside class="setup-overview"><section class="setup-summary"><span class="setup-kicker">PHIÊN THỰC HÀNH</span><h2>${e(LESSON_CATALOG[c.lesson][0])}</h2><div class="summary-row"><span>Tổ máy chính</span><b>H${c.unit+1}</b></div><div class="summary-row"><span>Nguồn logic</span><b>JBLOCK · PLC</b></div><div class="summary-row"><span>Timer giám sát</span><b>14 nhánh</b></div><div class="summary-divider"></div><p>Khi vào DCS, học viên kiểm tra START CONDITION và thao tác chọn đích → ACTION. Trình tự tự chạy theo phản hồi thiết bị.</p><div class="setup-error" id="setup-error" role="alert"></div><button class="setup-primary" type="submit">Bắt đầu thực hành trên DCS <span>→</span></button><label class="setup-audio-choice"><input type="checkbox" data-audio-enabled ${sound.prefs.enabled?'checked':''}> Bật âm thanh nhà máy khi bắt đầu</label><small>Đồng hồ mô phỏng bắt đầu khi vào bài.</small></section><section class="setup-note"><b>Giao diện DCS được giữ nguyên</b><p>Nền đen, nút xám, trạng thái chọn vàng. Tín hiệu 1 đỏ, 0 xanh, BQ tím; tín hiệu chưa có phản hồi màu xám. Công cụ bài tập được mở riêng khỏi màn hình công nghệ.</p></section><section class="setup-note"><b>Lưu và khôi phục phiên</b><p>Lưu toàn bộ trạng thái thiết bị, bước đang chạy và nhật ký dưới dạng JSON.</p><button class="setup-secondary" type="button" data-action="import-session">Nạp phiên đã lưu</button></section></aside></div></form><footer class="setup-bottom">AVC · OTS 04.25 <span>JBLOCK Rev.G · Bản in PLC 23/11/2023 · QT.AV.VH.604</span></footer></main></div></div>`;
}


// MODULE: ui
const $=(q,r=document)=>r.querySelector(q),$$=(q,r=document)=>[...r.querySelectorAll(q)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(x,d=1)=>Number.isFinite(Number(x))?Number(x).toFixed(d):'—';
const clock=t=>[Math.floor(t/3600),Math.floor(t/60)%60,Math.floor(t)%60].map(x=>String(x).padStart(2,'0')).join(':');
const plant=new Plant(),tagCache=new Map();
let audioStorage;try{audioStorage=window.localStorage;}catch{}
const sound=new window.__AVCAudio.SoundEngine({storage:audioStorage});
let epoch=Date.now();
let selected=0,route={page:'home',unit:0,part:1,scope:'ALL'},paused=true,speed=1,navHistory=[],navIndex=-1,toastTimer,frame=0,modalKey=null,pendingSelector=null,permitKey=null;
const achievements=[{},{}],a0Draft=[{},{}];
let setupDraft=clone(DEFAULT_SESSION);
window.__faultLabels=FAULTS;
const u=()=>plant.units[selected],s=()=>u().s;


function rejectionReportHTML(unit){const r=unit.s.rejection;return r.reason?`<div class="hmi-panel rejection-summary"><b>SA THẢI PHỤ TẢI H${unit.unit}</b><p>${esc(r.reason)} · P cắt ${fmt(r.rejectedMW,1)} MW · nmax ${fmt(r.peakRPM,1)} rpm (${fmt((r.peakRPM/unit.plant.profile.rpm-1)*100,1)}%) · ${fmt(r.elapsed,1)} s · ${r.active?'ĐANG QUÁ ĐỘ':r.completed?'ĐÃ VỀ EX':esc(r.failure||r.phase)}</p></div>`:'';}
function rejectionHTML(){return `<div class="page-pad rejection-page"><div class="row-actions">${nav('H1 · SA THẢI','rejection',0)}${nav('H2 · SA THẢI','rejection',1)}${nav('CONTROL PANEL','control')}${nav('220 kV SWITCHYARD','switchyard')}${nav('NHẬT KÝ SOE','events')}${btn('LƯU PHIÊN','save-session')}</div><div id="rejection-live"></div><div class="reference-note">Để thử: cho tổ máy phát G, mở 901/902; hoặc mở hết đường nối lưới của riêng tổ đó (ví dụ H1: 271 và 273). Còn một đường lưới thì không sa thải. BQ không được coi là mất lưới đã xác nhận. Sau sa thải phải khôi phục đường nối lưới và hòa lại qua PARALLEL IN.</div><details class="rejection-assumptions"><summary>Thông số và phạm vi mô hình</summary><p>H = 4 s; trễ thủy lực = 0,9 s; đóng cánh hướng = 4 s/toàn hành trình; mở không tải = 12%; xác nhận tốc độ ±0,2% và vị trí ±0,6% liên tục 3 s. Đây là tham số minh họa; độ vọt tốc phụ thuộc tải sa thải và trạng thái cánh hướng, không phải kết quả dự báo thiết bị thực.</p><p>Mất đường lưới kích hoạt cắt riêng máy cắt đầu cực của tổ bị ảnh hưởng theo quy ước OTS; chưa xác nhận tên rơle hoặc logic ABB thực nạp. Giữ kích từ, van tuabin và nước làm mát trong sa thải bình thường. Lệnh STOP được giữ đến hết quá độ rồi chạy 5X; bảo vệ 86 ưu tiên dừng sự cố.</p></details></div>`;}
function rejectionTraceSVG(r){
 const rows=r.trace;if(rows.length<2)return '<p class="rejection-empty">Chưa có bản ghi quá độ. Dữ liệu sẽ hiện khi sa thải phụ tải.</p>';
 const W=1100,H=300,L=65,R=30,T=25,B=40,duration=Math.max(10,r.elapsed),maxSpeed=Math.max(450,r.peakRPM*1.06),maxP=120;
 const X=t=>L+(W-L-R)*t/duration,Y=v=>H-B-(H-T-B)*v;
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Quá độ sa thải: tốc độ rpm màu cyan, cánh hướng phần trăm vàng, công suất điện MW đỏ"><rect width="${W}" height="${H}" fill="#101010"/>`;
 for(let j=0;j<=5;j++){const y=Y(j/5);svg+=`<path d="M${L} ${y}H${W-R}" stroke="#383838"/><text x="${L-7}" y="${y+4}" text-anchor="end" fill="#7ce5f4" font-size="12">${fmt(maxSpeed*j/5,0)}</text><text x="${W-R+4}" y="${y+4}" fill="#ffe56b" font-size="12">${j*20}</text>`;}
 for(let j=0;j<=5;j++){const t=duration*j/5,x=X(t);svg+=`<path d="M${x} ${T}V${H-B}" stroke="#333"/><text x="${x}" y="${H-15}" fill="#ddd" text-anchor="middle" font-size="12">${fmt(t,0)} s</text>`;}
 svg+=`<path d="M${L} ${Y(375/maxSpeed)}H${W-R}" stroke="#538591" stroke-dasharray="4 4"/>`;
 for(const [key,color,max]of [['rpm','#00e8ff',maxSpeed],['gate','#ffe04b',100],['p','#ff5c5c',maxP]]){const points=rows.map(v=>`${X(v.t).toFixed(1)},${Y(v[key]/max).toFixed(1)}`).join(' ');svg+=`<polyline fill="none" stroke="${color}" stroke-width="2.3" points="${points}"/>`;}
 return svg+'</svg><div class="rejection-legend"><span style="color:#00e8ff">● Tốc độ rpm · trục trái</span><span style="color:#ffe04b">● Cánh hướng % · trục phải</span><span style="color:#ff5c5c">● Công suất điện MW · thang 0–120</span></div>';
}
function updateRejectionPanel(){const el=$('#rejection-live');if(!el)return;const st=s(),r=st.rejection;
 const phase={idle:'CHƯA SA THẢI',close:'ĐÓNG NHANH CÁNH HƯỚNG',hold:'GIỮ 0% · CHỜ GIẢM TỐC',recover:'ĐIỀU CHỈNH VỀ KHÔNG TẢI',complete:st.stage===4?'EX · KHÔNG TẢI CÓ KÍCH TỪ':'BẢN GHI SA THẢI ĐÃ HOÀN TẤT',aborted:'BẢO VỆ / DỪNG SỰ CỐ'}[r.phase];
 const signature=[selected,r.phase,r.elapsed.toFixed(1),st.rpm.toFixed(1),st.gate.toFixed(1),st.p.toFixed(1),st.breaker,r.trace.length].join('|');if(el.dataset.signature===signature)return;el.dataset.signature=signature;
 el.innerHTML=`<div class="rejection-state ${r.active?'active':''}"><b>H${selected+1} · ${phase}</b><span>${esc(r.reason||'Cho tổ máy phát điện rồi mở máy cắt để thử.')}</span></div><div class="rejection-metrics">${[['P sa thải',r.rejectedMW,'MW'],['P điện',st.p,'MW'],['Tốc độ',st.rpm,'rpm'],['Đỉnh tốc',r.peakRPM,'rpm'],['Cánh hướng',st.gate,'%'],['Thời gian',r.elapsed,'s']].map(([l,v,unit])=>`<div><span>${l}</span><b>${fmt(v,1)} <small>${unit}</small></b></div>`).join('')}</div><div class="rejection-chart">${rejectionTraceSVG(r)}</div><div class="rejection-status">CB${901+selected}: ${st.breaker?'CLOSED':'OPEN'} · EXCITATION: ${st.excited?'ON':'OFF'} · ${st.stage===4?'EX':STAGES[st.stage].en} · Cánh hướng đã qua 0%: ${r.closedOnce?'CÓ':'CHƯA'} · ${r.completed?'Ổn định không tải':r.active?'Đang quá độ':'Chờ thao tác'}</div>`;
}

function sb4aSourceModal(){const eq=plant.equipment,p=sb4aElectricalPower(plant);openModal('SÔNG BUNG 4A · NGUỒN MÔ PHỎNG','NGUỒN PHÁT RIÊNG · KHÔNG CỘNG VÀO H1/H2',`<p>DS275-7: <b>${eq.get('DS275-7').value?'CLOSED':'OPEN'}</b> · P đang truyền vào trạm: <b>${fmt(p.p,1)} MW</b></p><div class="sync-config"><label>Nguồn <select id="sb4a-online"><option value="on" ${eq.sources.SB4A?'selected':''}>Có điện</option><option value="off" ${!eq.sources.SB4A?'selected':''}>Mất điện</option></select></label><label>P mô phỏng (MW)<input id="sb4a-p" class="hmi-input" type="number" min="0" max="200" step="1" value="${eq.sb4a.pMW}"></label><label>Q mô phỏng (MVAr)<input id="sb4a-q" class="hmi-input" type="number" min="-100" max="100" step="1" value="${eq.sb4a.qMvar}"></label></div><p>Mặc định 40 MW, Q = 0 là dữ liệu huấn luyện, không phải công suất thực tế. Công suất nguồn này chỉ truyền vào trạm khi DS275-7 đóng và còn đường ra lưới L1/L2. Có điện áp không đồng nghĩa đang truyền công suất.</p><p>Phân phối công suất ra L1/L2 theo các đường nối còn lại, chia đều khi cả hai đường cùng nối thông. Chưa có điện kháng nhánh để tính trào lưu thực tế. P H1/H2 chỉ lấy từ máy cắt đầu cực và nhánh tổ máy tương ứng.</p>`,btn('HỦY','close-modal')+btn('XÁC NHẬN NGUỒN','sb4a-apply'));}

function soundModal(){
 const row=(key,label)=>`<label class="sound-slider"><span>${label}</span><input type="range" min="0" max="100" value="${Math.round(sound.prefs[key]*100)}" data-audio-volume="${key}" aria-label="${label}"><output data-audio-output="${key}">${Math.round(sound.prefs[key]*100)}%</output></label>`;
 openModal('ÂM THANH NHÀ MÁY','H1 / H2 · BYPASS · MÁY CẮT · ALARM / TRIP',`<div class="sound-controls">${btn(sound.prefs.enabled?'TẮT ÂM THANH':'BẬT ÂM THANH','audio-toggle')}<strong data-audio-status role="status"></strong></div>${row('master','Âm lượng tổng')}${row('machine','Tiếng máy / nước / bypass')}${row('alarm','Còi alarm / trip')}${row('effects','Tiếng máy cắt')}<div class="sound-unit-sliders">${row('h1','Riêng H1')}${row('h2','Riêng H2')}</div><div class="sound-live" data-audio-live></div><label class="sound-meter-label">Mức âm thanh đầu ra <meter min="-80" max="0" low="-55" high="-12" optimum="-25" value="-80" data-audio-meter aria-label="Mức tín hiệu âm thanh"></meter><span data-audio-db></span></label><div class="row-actions">${btn('THỬ ALARM','audio-test','data-sound="alarm"')}${btn('THỬ TRIP','audio-test','data-sound="trip"')}${btn('THỬ MÁY CẮT','audio-test','data-sound="breaker"')}</div><p>Tiếng quay theo tốc độ; tiếng nước theo tải và cánh hướng. Bypass theo vị trí thực và chênh áp. SILENCE chỉ im còi hiện tại; cảnh báo mới phát lại. Tạm dừng / tab ẩn sẽ tắt tiếng, tiếp tục không phát lại tiếng máy cắt cũ.</p><p>Âm thanh tổng hợp cho huấn luyện, chưa phải bản ghi âm A Vương. H1/H2 nghe độc lập trên mọi trang DCS. Bắt đầu hoặc tiếp tục bài để nghe thử.</p>`,btn('ĐÓNG','close-modal'));
 updateSoundUI();
}
function updateSoundUI(){
 const a=sound.status(),button=$('[data-action="audio-settings"]');
 const label=!a.enabled?'ÂM THANH · TẮT':a.state==='running'?'ÂM THANH · BẬT':'ÂM THANH · BẬT LẠI';
 if(button){button.textContent=label;button.setAttribute('aria-label','Cài đặt âm thanh');button.title='Âm thanh nhà máy · bật/tắt và âm lượng';}
 const text=$('[data-audio-status]');if(!text)return;
 text.textContent=a.error||(!a.enabled?'ĐÃ TẮT':a.state!=='running'?'NHẤN BẬT ÂM THANH ĐỂ KÍCH HOẠT':a.hidden?'TAB ẨN · TẠM IM':a.paused?'TẠM DỪNG · TẠM IM':'ÂM THANH ĐANG HOẠT ĐỘNG');
 const live=$('[data-audio-live]');live.innerHTML=(a.scene?.units||[]).map((x,i)=>`<div><b>H${i+1}</b><span>${fmt(x.rpm,0)} rpm · ${fmt(x.load*105,1)} MW</span><span>Bypass ${fmt(x.bypass*100,0)}% · Δp ${fmt(x.dp*100,0)}%</span></div>`).join('')+`<p>Còi: <b>${a.horn==='trip'?'TRIP':a.horn==='alarm'?'ALARM':'IM'}</b> · ${a.pending} cảnh báo chờ · ${a.feedbackCount} phản hồi máy cắt đã phát</p>`;
 const meter=$('[data-audio-meter]');if(meter)meter.value=a.db;const db=$('[data-audio-db]');if(db)db.textContent=a.db<=-79?'IM':fmt(a.db,1)+' dBFS';
 for(const b of $$('[data-action="audio-test"]'))b.disabled=!a.enabled||a.paused||a.hidden||a.state!=='running';
}

function stationControlsHTML(){return `<span class="station-keybar"><button class="hmi-button" data-action="station-os">43 O/S · <b data-os-state></b></button><button class="hmi-button" data-action="station-sync">43-25 · <b data-sync-mode></b></button><small data-sync-status></small></span>`;}
function stationSyncModal(){const x=plant.equipment.stationSync;openModal('43-25 · HÒA TRẠM 220 kV','BỘ HÒA TRẠM · TÁCH RIÊNG HÒA TỔ MÁY',`<div class="sync-config"><label>Máy cắt <select id="station-sync-cb">${['CB271','CB273','CB274','CB272','CB275'].map(id=>`<option ${id===x.id?'selected':''}>${id}</option>`).join('')}</select></label><label>43-25 <select id="station-sync-mode">${['OFF','MANUAL','AUTO'].map(m=>`<option ${m===x.mode?'selected':''}>${m}</option>`).join('')}</select></label>${btn('XÁC NHẬN KHÓA','station-sync-apply')}</div><div id="station-sync-live"></div><div class="row-actions">${btn('SELECT MÁY CẮT','station-sync-select')}${btn('ĐIỀU KHIỂN CB','station-sync-device')}${btn('HÒA AUTO → XÁC NHẬN','station-sync-arm')}</div><div class="row-actions">${[['df','Δf → 0'],['angle','GÓC → 0'],['du','ΔU → 0']].map(([k,l])=>btn(l,'station-sync-adjust',`data-key="${k}"`)).join('')}</div><p class="reference-note">Mô hình huấn luyện: |Δf| ≤ 0,10 Hz, |ΔU| ≤ 5%, |góc| ≤ 10° liên tục 1 s; đóng CB 1 s. Các nút cân chỉnh tay chỉ hoạt động ở MANUAL. Chặn ghép nguồn AC tự dùng đang có điện; bộ hòa này chỉ áp dụng CB trạm 220 kV.</p>`,btn('ĐÓNG','close-modal'));updateTrainingControls();}
function updateTrainingControls(){
 const eq=plant.equipment,x=eq.stationSync;
 for(const n of $$('[data-os-state]'))n.textContent=eq.control43;for(const n of $$('[data-station-os]'))n.setAttribute('fill',n.dataset.stationOs===eq.control43?'#ffff00':'#bcbcbc');for(const n of $$('[data-station-owner]'))n.setAttribute('fill',n.dataset.stationOwner===eq.owner?'#ffff00':'#bcbcbc');
 for(const n of $$('[data-sync-mode]'))n.textContent=x.mode;
 for(const n of $$('[data-sync-status]'))n.textContent=x.armed?'HÒA '+x.id+' · ĐANG CHỜ 25':x.id+' · '+(eq.syncPermit(x.id)?'25 PERMIT':'25 NOT READY');
 const el=$('#station-sync-live');if(el){const a=eq.blockers(x.id,1),d=eq.get(x.id);el.innerHTML=`<div class="sync-metrics"><span>Δf <b>${fmt(x.df,3)} Hz</b></span><span>ΔU <b>${fmt(x.du,2)} %</b></span><span>GÓC <b>${fmt(x.angle,1)}°</b></span></div><div class="sync-state ${eq.syncPermit(x.id)?'permit':''}">${x.quality?'GOOD':'BQ'} · ${eq.syncPermit(x.id)?'25 PERMIT':'25 NOT READY'} · ${x.armed?'AUTO ĐANG HÒA':'AUTO CHƯA ĐƯỢC PHÁT LỆNH'}<br>${x.id} ${d.moving?'ĐANG CHUYỂN':d.value?'CLOSED':'OPEN'} · SELECT ${eq.selected||'NONE'}</div>${a.map(v=>'<p class="sync-reason">✕ '+esc(v)+'</p>').join('')||'<p>P · Đủ điều kiện đóng.</p>'}`;}
 for(const n of $$('[data-tap-value]')){const t=eq.taps[+n.dataset.tapValue];n.textContent=t.value+(t.moving?' → '+t.target+' · '+fmt(t.elapsed,1)+' s':'');}
}
function workflowModal(){const st=s();openModal('BÀI THỰC HÀNH · H'+(selected+1),'KHỞI ĐỘNG → NHẬN TẢI → DỪNG → XEM SOE',`<ol class="workflow-list"><li><b>Kiểm tra điều kiện</b><p>Máy dừng, khóa REMOTE/AUTO, dầu và nguồn nước sẵn sàng. Rê chuột hoặc chọn tín hiệu để đọc DI/DO.</p>${nav('START CONDITION 1','cond1')}${nav('START CONDITION 2','cond2')}</li><li><b>Chọn LOAD → ACTION → xác nhận</b><p>Trên CONTROL PANEL, chọn LOAD. Sáu bước chạy theo phản hồi: chuẩn bị → van → tăng tốc → kích từ → hòa → tải.</p>${nav('CONTROL PANEL','control')}${nav('THEO DÕI 1X','seq1')}</li><li><b>Nhận và điều chỉnh tải</b><p>Sau 92P, chọn 43ALR USE rồi đặt ALR SET POINT. NOT USE: điều chỉnh bằng +/−. Quan sát dao động P/U/f/rpm.</p>${nav('GENERAL DISPLAY','general')}</li><li><b>Thao tác CB độc lập / hòa trạm</b><p>Chọn CB → SELECT → OPEN → xác nhận. CB khác giữ nguyên. Đóng ghép hai đảo có điện cần 43 O/S ở OPS và 43-25 đủ điều kiện.</p>${nav('220 kV SWITCHYARD','switchyard')}${btn('43-25 TRẠM','station-sync')}</li><li><b>Dừng bình thường</b><p>CONTROL PANEL: chọn STOP → ACTION → xác nhận. Theo dõi giảm tải, mở CB, cắt kích từ, đóng van/cánh hướng, giảm tốc và phanh.</p>${nav('CONTROL PANEL','control')}${nav('THEO DÕI 5X','seq5')}</li><li><b>Đánh giá phiên</b><p>Xem thời điểm lệnh/phản hồi, điều kiện chặn và kết quả. Lưu JSON để tiếp tục phiên sau.</p>${nav('NHẬT KÝ SOE','events')}${nav('KẾT QUẢ','report')}${btn('LƯU PHIÊN','save-session')}</li></ol><p class="reference-note">Trạng thái hiện tại H${selected+1}: ${STAGES[st.stage].en}. Thời gian 1×/2×/5×/10× dùng chung cho mọi thiết bị và timer.</p>`,btn('ĐÓNG','close-modal'));}

const PAGES={rejection:['LOAD_REJECTION','SA THẢI PHỤ TẢI · QUÁ ĐỘ',null],home:['MAIN_MENU','EVN A VUONG HPS MAIN MENU',4],control:['CONTROL_PANEL','CONTROL PANEL',5],cond1:['STARTING_CONDITION_1_2','STARTING CONDITIONS (1/2)',6],quickcond:['QUICK_STOP_CONDITION','CONDITION TO QUICK STOP',null],cond2:['STARTING_CONDITION_2_2','STARTING CONDITIONS (2/2)',7],seq1:['SEQ_MONITOR_1X_1_3','SEQUENCE MONITOR 1X (1/3)',8],seq2:['SEQ_MONITOR_1X_2_3','SEQUENCE MONITOR 1X (2/3)',9],seq3:['SEQ_MONITOR_1X_3_3','SEQUENCE MONITOR 1X (3/3)',10],seq5:['SEQ_MONITOR_5X','SEQUENCE MONITOR 5X',11],water:['WATER_FLOW','WATER FLOW',12],oil:['OIL_SUPPLY_SYSTEM','OIL SUPPLY SYSTEM',13],temp:['TEMPERATURE_MONITOR','TEMPERATURE MONITOR',14],vibration:['VIBRATION_MONITOR','VIBRATION MONITOR',15],unitdiag:['DCS_DIAGNOSTICS','DCS DIAGNOSTICS VIEW',16],architecture:['SYSTEM_ARCHITECTURE','DCS SYS ARCHITECTURE',17],ann:['ANNUNCIATOR','ANNUNCIATOR',null],alarms:['ALARM_SUMMARY','ALARM SUMMARY',null],events:['PROCESS_EVENTS','SEQUENCE OF EVENTS',null],trend:['PROCESS_TREND','PROCESS TREND',null],agc:['UNIT_AGC_CONTROL','UNIT AGC CONTROL',null],stationoverview:['STATION_OVERVIEW','STATION OVERVIEW',null],switchyard:['220KV_SWITCHYARD','220kV SWITCHYARD',null],mainunit:['MAIN_UNIT','MAIN UNIT',null],stationservice:['STATION_SERVICE','STATION SERVICE CIRCUIT',null],gh:['GH_EQUIPMENT','INTAKE & SPILLWAY & VALVE HOUSE EQUIPMENT',null],air:['AIR_SUPPLY_SYSTEM','AIR SUPPLY SYSTEM',null],general:['GENERAL_DISPLAY','GENERAL DISPLAY',null],report:['TRAINING_REVIEW','OTS TRAINING SESSION REVIEW',null],gateway:['GATEWAY_DIAGNOSTICS','GATEWAY DCS DIAGNOSTICS',null],stationcontrol:['SWITCHYARD_STATION_CNT_PNL','SWITCHYARD / STATION SERVICE CONTROL PANEL',null],nkt:['NKT','SƠ ĐỒ VẬN HÀNH HỆ THỐNG NƯỚC KỸ THUẬT',null],auxdiag:['DIAG_AUX','AUXILIARY DCS DIAGNOSTICS',null],sydiag:['DIAG_SWYD','SWITCHYARD DCS DIAGNOSTICS',null],ioreference:['IEC104_DATALIST','DANH MỤC TÍN HIỆU IEC 104 / I/O',null]};
const UNIT_PAGES=new Set(['control','cond1','cond2','quickcond','seq1','seq2','seq3','seq5','water','oil','temp','vibration','unitdiag','agc']);
const AREAS=['ALL','UNIT-1','UNIT-2','SWYD','AUXILIARY','VLVHOUSE','SPILLWAY','INTAKE','SYSTEM'];
const LESSONS=LESSON_CATALOG;
const btn=(text,action='nav',attrs='',on=false)=>`<button class="hmi-button ${on?'selected':''}" data-action="${action}" ${attrs}>${text}</button>`;
const nav=(text,page,unit=selected,attrs='')=>btn(text,'nav',`data-page="${page}" data-unit="${unit}" ${attrs}`);
const bit=(value,quality='GOOD')=>`<i class="bit ${quality==='BAD'?'bad':value?'good':''}"></i>`;
const diagramName=()=>`U#${selected+1}`;
const dateTime=t=>new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(epoch+t*1000));
function readTag(key,index=selected){
 const unit=plant.units[index],st=unit.s,online=st.breaker,actual=unitElectricalPower(plant,index),p=actual.p,q=actual.q,sva=Math.hypot(p,q);let value=key==='p'?p:key==='q'?q:st[key];
 if(key==='frequency')value=st.rpm/MODEL.rpm*50;
 else if(key==='current')value=online&&st.kv>.1?sva*1000/(Math.sqrt(3)*st.kv):0;
 else if(key==='pf')value=sva>.1?Math.abs(p)/sva:0;
 else if(key==='gridVoltage')value=plant.gridVoltage;
 else if(key==='alrDisplay')value=st.switches.alr==='USE'?st.pSet:st.pBase;
 else if(key==='aqrDisplay')value=st.switches.aqr==='USE'?st.qSet:st.qBase;
 else if(key==='pJointSet')value=plant.units.reduce((sum,v)=>sum+(v.s.breaker?v.s.pSet:0),0);
 else if(key==='qJointSet')value=plant.units.reduce((sum,v)=>sum+(v.s.breaker?v.s.qSet:0),0);
 else if(key==='pTotal')value=plant.units.reduce((sum,_,i)=>sum+unitElectricalPower(plant,i).p,0);
 else if(key==='sb4aPower')value=sb4aElectricalPower(plant).p;
 else if(key==='gridFrequency')value=plant.frequency;
 else if(key==='penstock')value=plant.penstock.actual;
 else if(key==='excV')value=st.excited?st.excV:0;
 else if(key==='excI')value=st.excited?st.excI:0;
 else if(key.startsWith('temp'))value=key==='temp'?st.temp:st.thermal?.values[key];
 else if(key.startsWith('vib')){const scale=clamp(st.rpm/MODEL.rpm,0,1),load=Math.max(0,st.p)/105;value=key==='vibVelocity'?scale*(1.15+load*.6+.05*Math.sin(st.t*.8)):scale*((key==='vibUpper'?65:key==='vibLower'?58:key==='vibT1'?47:51)+load*14+1.2*Math.sin(st.t*.7+index));}
 const aggregateBad=['pTotal','pJointSet','qJointSet'].includes(key)&&plant.units.some(v=>!v.qualityGood);
 const badAnalog=(['p','alrDisplay'].includes(key)&&!analogHealthy(unit,'p'))||(['q','aqrDisplay'].includes(key)&&!analogHealthy(unit,'q'));
 const quality=key==='sb4aPower'?(!plant.communicationOK||plant.equipment.get('DS275-7').bad?'BAD':'GOOD'):(!unit.qualityGood||aggregateBad||badAnalog||st.sensorFaults[key]||key==='penstock'&&!plant.penstock.signal)?'BAD':'GOOD';
 const forced=key==='penstock'&&plant.penstock.forced;
 const tag='U'+(index+1)+'.'+key,last=tagCache.get(tag);const t={tag,key,value,quality,forced,index,stamp:plant.t,lastGood:quality==='GOOD'?value:last?.lastGood,lastGoodAt:quality==='GOOD'?plant.t:last?.lastGoodAt};tagCache.set(tag,t);return t;
}
function value(key,index=selected,dec=1,width='',edit=null,label=''){
 const t=readTag(key,index),action=edit?`data-action="edit" data-key="${edit}" data-control-input="${edit}" aria-label="${esc(label)} · Giá trị đặt"`:'data-action="tag"';
 return `<span class="hmi-value ${t.quality==='BAD'?'bad':''} ${edit?'setpoint-value':''}" data-tag="${key}" data-unit="${index}" data-dec="${dec}" ${width?`style="width:${width}"`:''} title="${esc(t.tag)} · ${t.quality}" role="button" tabindex="0" ${action}>${t.quality==='BAD'?'BQ':fmt(t.value,dec)}</span>`;
}
function readout(label,key,unit='',edit=null,dec=1){const name=label.replace(/<br>/g,' ');return `<div class="hmi-readout"><label>${label}</label><div>${value(key,selected,dec,'',edit,name)}<span class="unit-label">${unit}</span>${edit?`<span class="adjusters">${btn('−','nudge-control',`data-key="${edit}" data-delta="-1" data-edit-control="${edit}" aria-label="${esc(name)} · Giảm"`)}${btn('+','nudge-control',`data-key="${edit}" data-delta="1" data-edit-control="${edit}" aria-label="${esc(name)} · Tăng"`)}<button class="hmi-button permit-indicator" data-action="permit-info" data-permit-key="${edit}" aria-label="${esc(name)} · PERMIT">P</button></span>`:''}</div></div>`;}
function signal(label,key,unit='',dec=1,index=selected){return `<div class="signal-row"><strong>${label}</strong>${value(key,index,dec)}<span>${unit}</span></div>`;}
function referenceNote(text=''){return `<p class="reference-note">AVC OTS 04.25 · HMI REF. 4JSG000002P4833 Rev.A / QT.AV.VH.604. ${text}</p>`;}
function areaAlarms(scope='ALL'){return plant.allAlarms.filter(a=>scope==='ALL'||scope==='VLVHOUSE'?scope==='ALL'||a.area==='GATEWAY':scope==='SWYD'?a.area==='SWITCHYARD':a.area===scope);}
function eventRows(scope='ALL'){return plant.events.filter(e=>scope==='ALL'||scope==='VLVHOUSE'?scope==='ALL'||e.area==='GATEWAY':e.area===scope);}
// 04.17: independent STATION OVERVIEW, native main-menu matrix, T1/T2 tap indications.
// Layout evidence: photos 15, 37, 39 and the four user screenshots in this request.
const HOME0410_UNIT_MENU=[
 ['WATER FLOW SYSTEM','water'],['CAPABILITY CURVE','reference:capability'],['OIL SUPPLY SYSTEM','oil'],['GENERATOR TEMPERATURE','temp'],['VIBRATION MONITOR','vibration'],
 ['CONTROL PANEL','control'],['STARTING CONDITION 1','cond1'],['SEQ MONITOR (1x-1)','seq1'],['SEQ MONITOR (1x-2)','seq2'],['SEQ MONITOR (1x-3)','seq3'],
 null,['STARTING CONDITION 2','cond2'],['SEQ MONITOR (5x)','seq5'],['RELAY PROTECTION','reference:unit-relay'],null
];
const HOME0410_SWITCH_MENU=[
 ['STATION OVERVIEW','stationoverview'],['220kV SWITCHYARD','switchyard'],['MAIN UNIT','mainunit'],['STATION SERVICE','stationservice'],['GH EQUIPMENT','gh'],
 ['SY/AL CONTROL PANEL','stationcontrol'],['AIR SUPPLY SYSTEM','air'],['GENERAL DISPLAY','general'],['RELAY PROTECTION','reference:yard-relay'],['MODBUS','reference:modbus']
];
function home0410Button(label,page,index=selected,attrs=''){
 if(page.startsWith('reference:'))return btn(label,'home-reference0410',`data-reference="${page.slice(10)}" data-unit="${index}" ${attrs}`);
 return nav(label,page,index,attrs);
}
function home0410Meters(i){
 const fields=[['p','MW',1],['current','A',0],['q','Mvar',1],['kv','kV',2],['rpm','rpm',0]];
 return `<div class="home0410-unit"><strong>U#${i+1}</strong><div class="home0410-values">${fields.map(([key,unit,dec])=>`<div class="home0410-field ${key==='rpm'?'home0410-rpm':''}">${value(key,i,dec)}<small>${unit}</small></div>`).join('')}</div></div>`;
}
function homeHTML(){
 const ann=[
 ['U#1 ANN(1/3)','UNIT-1',1],['U#2 ANN(1/3)','UNIT-2',1],['AUXILIARY','AUXILIARY',1],['SWITCHYARD (1/3)','SWYD',1],['GATEWAY','GATEWAY',1],
 ['U#1 ANN(2/3)','UNIT-1',2],['U#2 ANN(2/3)','UNIT-2',2],['SYSTEM ARCHITECTURE','nav:architecture'],['SWITCHYARD (2/3)','SWYD',2],null,
 ['U#1 ANN(3/3)','UNIT-1',3],['U#2 ANN(3/3)','UNIT-2',3],['AUXILIARY MONITOR','reference:aux-monitor'],['SWITCHYARD (3/3)','SWYD',3],null
 ];
 const blank='<span class="home0410-blank" aria-hidden="true"></span>';
 const unitRow=i=>`<section class="home0410-row home0410-unit-row" aria-label="Tổ máy H${i+1}"><div class="home0410-label">${home0410Meters(i)}</div><div class="home0410-buttons home0410-three" data-home-unit="${i}">${HOME0410_UNIT_MENU.map((a,k)=>a?home0410Button(a[0]+(a[1]==='vibration'?' '+(i+1):''),a[1],i,`data-menu-slot="${k}" aria-label="${esc(a[0])} H${i+1}"`):blank).join('')}</div></section>`;
 const diag=[
 ['U#1 DIAGNOSTIC','unitdiag',0],['U#2 DIAGNOSTIC','unitdiag',1],['AUXILIARY DIAGNOSTIC','auxdiag',0],['SWITCHYARD DIAGNOSTIC','sydiag',0],['GATEWAY DIAGNOSTIC','gateway',0],
 ['U#1 AGC','agc',0],['U#2 AGC','agc',1],null,['GENERAL TEMPERATURE','temperature-summary',0],null
 ];
 return `<div class="home-page home0410">
 <section class="home0410-row home0410-ann" aria-label="Annunciator"><div class="home0410-label">ANNUNCIATOR</div><div class="home0410-buttons home0410-three">${ann.map(a=>!a?blank:a[1].startsWith('nav:')?home0410Button(a[0],a[1].slice(4)):a[1].startsWith('reference:')?home0410Button(a[0],a[1]):btn(a[0],'ann',`data-scope="${a[1]}" data-part="${a[2]}"`)).join('')}</div></section>
 <section class="home0410-row home0410-switchyard" aria-label="Switchyard"><div class="home0410-label"><div class="home0410-switch-values"><strong>SWITCHYARD</strong><div><div class="home0410-field">${value('gridVoltage',0,1)}<small>kV</small></div><div class="home0410-field">${value('pTotal',0,1)}<small>MW AVC</small></div><div class="home0410-field"><button class="home-source-link" data-action="sb4a-source" title="Nguồn phát mô phỏng Sông Bung 4A">SB4A</button>${value('sb4aPower',0,1)}<small>MW</small></div></div></div></div><div class="home0410-buttons home0410-two">${HOME0410_SWITCH_MENU.map(([l,p],k)=>home0410Button(l,p,selected,`data-menu-slot="${k}"`)).join('')}</div></section>
 ${unitRow(0)}${unitRow(1)}
 <section class="home0410-row home0410-diag" aria-label="Diagnostic Page"><div class="home0410-label">DIAGNOSTIC PAGE</div><div class="home0410-diag-panel"><div class="home0410-diag-head">${['U#1','U#2','AUXILIARY','SWITCHYARD','GATEWAY'].map(l=>`<strong>${l}</strong>`).join('')}</div><div class="home0410-buttons home0410-two">${diag.map(a=>!a?blank:a[1]==='temperature-summary'?btn(a[0],'home-temperature0410'):home0410Button(...a)).join('')}</div></div></section>
 </div>`;
}
function overviewWire0410(d,node,domain='hv',width=2.6){
 const color=domain==='hv'?'#ff2020':domain==='unit'?'#26b6d7':'#d9ad42';
 return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" data-overview-node="${node}" data-overview-domain="${domain}"/>`;
}
function overviewMachine0410(i,x,y){
 return realAction(`data-action="nav" data-page="control" data-unit="${i}"`,`<title>CONTROL PANEL H${i+1}</title><circle cx="${x}" cy="${y}" r="21" fill="#000" stroke-width="2.5" data-machine-stroke="${i}"/><text x="${x}" y="${y+6}" text-anchor="middle" font-size="17" data-machine-text="${i}">H${i+1}</text>`);
}
function overviewTransformer0410(x,y,domain='main'){
 const a=domain==='main'?'#ff2626':'#24b7d7',b=domain==='main'?'#24b7d7':'#dbae43';
 return `<circle cx="${x}" cy="${y}" r="12" fill="#000" stroke="${a}" stroke-width="2"/><circle cx="${x}" cy="${y+19}" r="12" fill="#000" stroke="${b}" stroke-width="2"/><path d="M${x-7} ${y+7}L${x} ${y-7}L${x+7} ${y+7}Z M${x-6} ${y+22}l6 -8l6 8m-6 -8v13" stroke="#ddd" fill="none" stroke-width="1"/>`;
}
function stationOverviewSvg0410(){
 const hv=(d,n)=>overviewWire0410(d,n,'hv'),lv=(d,n)=>overviewWire0410(d,n,'unit'),ac=(d,n)=>overviewWire0410(d,n,'ac');
 let o=realDefs()+`<rect x="24" y="12" width="1630" height="686" fill="#000" stroke="#aaa" stroke-width="1.5" stroke-dasharray="6 5"/><path d="M770 12V698M24 423H770" fill="none" stroke="#aaa" stroke-width="1.5" stroke-dasharray="6 5"/>`;
 // Upper left: only the electrical overview is present here, never the General Display RTDs.
 o+=hv('M45 103H745','C22')+hv('M165 138H550','C25')+hv('M45 363H380','C21')+hv('M442 363H730','C24');
 o+=realText(49,91,'220kV(C22)',14)+realText(165,126,'220kV(C25)',14);
 for(const [id,x]of [['DS275-7',270],['DS273-7',520],['DS272-7',665]])o+=hv(`M${x} 14V103`,id==='DS272-7'?'L2':id==='DS273-7'?'L1':'SB4A')+realDevice(id,x,57,'DS',id,'','right',9);
 const paths=[
  [120,'C22','C21','DS271-2','CB271','DS271-1'],[270,'C25','C21','DS273-3','CB273','DS273-1'],
  [520,'C23','C24','DS274-3','CB274','DS274-4'],[665,'C22','C24','DS272-2','CB272','DS272-4']
 ];
 for(const [x,upper,lower,d1,cb,d2]of paths){
  o+=hv(`M${x} 103V180`,upper)+hv(`M${x} 180V248`,gridSpec(cb).a)+hv(`M${x} 248V320`,gridSpec(cb).b)+hv(`M${x} 320V363`,lower);
  o+=realDevice(d1,x,180,'DS',d1==='DS273-3'?'DS273-5':d1,'','right',8)+realDevice(cb,x,248,'CB',cb,'','right',9)+realDevice(d2,x,320,'DS',d2,'','right',8);
 }
 // The 275 bay is horizontal in this simplified overview.
 for(const [id,x,kind]of [['DS275-5',308,'DS'],['CB275',400,'CB'],['DS275-3',491,'DS']])o+=realDevice(id,x,138,kind,'','','right',8)+realText(x,119,id,13,'middle');
 // H1 / H2 main transformers, generator breakers and 13.8 kV auxiliary take-offs.
 for(const [i,x,bus]of [[0,120,'C21'],[1,520,'C24']]){
  const n=i+1,cb=901+i;
  o+=hv(`M${x} 363V445`,bus)+realDevice('DS23'+n+'-3',x,396,'DS','DS23'+n+'-3','','right',8)+overviewTransformer0410(x,447);
  o+=lv(`M${x} 479V545`,'T'+n)+lv(`M${x} 545V599`,'B'+cb)+lv(`M${x} 599V645`,'G'+n);
  o+=realDevice('DS'+cb+'-3',x,545,'DS','DS'+cb+'-3','','right',8)+realDevice('CB'+cb,x,599,'CB','CB'+cb,'','right',9)+overviewMachine0410(i,x,666);
 }
 o+=lv('M120 503H303','T1')+lv('M303 503H508','AUX1')+'<path d="M508 503Q520 520 532 503" fill="none" stroke="#000" stroke-width="8"/>'+lv('M508 503Q520 520 532 503','AUX1')+lv('M532 503H904V532','AUX1')+realDevice('DS941-3',303,503,'DS','','','right',8)+realText(303,484,'DS941-3',13,'middle');
 o+=lv('M520 493H662','T2')+lv('M662 493H1460V532','AUX2')+realDevice('DS942-3',662,493,'DS','','','right',8)+realText(662,478,'DS942-3',13,'middle');
 // Right: 22 kV, standby diesel, MDB3 and both 400 V sources / ties.
 o+=ac('M992 94H1330','ST3IN')+realText(995,82,'22kV',15);
 o+=ac('M1270 94V207','ST3IN')+realDevice('CB-22KV',1270,130,'CB','473','','right',10)+overviewTransformer0410(1270,211,'service')+ac('M1270 243V355','ST3');
 o+=realDevice('ACB-3',1270,291,'CB','ACB-30','','right',10);
 o+=ac('M1066 166V355','DGOUT')+realDevice('52DG',1066,219,'CB','52DG','','right',9)+realDevice('ACB-4',1066,291,'CB','ACB-33','','right',10);
 o+=realAction('data-action="equipment-open" data-equipment="DG"',`<circle cx="1066" cy="141" r="21" data-eq-fill="DG"/><text x="1066" y="147" text-anchor="middle" font-size="16" style="fill:#111">DG</text>`);
 o+=ac('M904 355H1435','MDB3')+realText(1001,375,'400V',14);
 o+=ac('M950 355V319','MDB3')+realPlaque(913,300,94,'27-MDB3','grid:MDB3:kv')+ac('M1270 249H1317','ST3')+realPlaque(1317,238,95,'27-ST3','grid:ST3:kv');
 o+=ac('M1066 355V660','DB1')+ac('M1270 355V660','DB2')+realDevice('ACB-5',1066,442,'CB','ACB-31','','right',10)+realDevice('ACB-6',1270,442,'CB','ACB-32','','right',10);
 o+=realDevice('ACB-7',1066,610,'CB','ACB-13','','right',10)+realDevice('ACB-8',1270,610,'CB','ACB-23','','right',10);
 o+=overviewTransformer0410(904,538,'service')+ac('M904 569V660','ST1')+realDevice('ACB-1',904,610,'CB','ACB-10','','right',10);
 o+=overviewTransformer0410(1460,538,'service')+ac('M1460 569V660','ST2')+realDevice('ACB-2',1460,610,'CB','ACB-20','','right',10);
 o+=ac('M792 660H1178','MDB1')+ac('M1178 660H1637','MDB2')+realDevice('ACB-BT',1178,660,'CB','','','right',10)+realText(1178,685,'ACB-12',13,'middle');
 o+=realText(795,680,'400V',14)+realText(1635,680,'400V',14,'end');
 for(const [x,y,t,key]of [[795,619,'27-MDB1','MDB1'],[950,570,'27-U1','ST1'],[1110,570,'27-ACB7','DB1'],[1320,570,'27-ACB8','DB2'],[1515,570,'27-U2','ST2'],[1541,619,'27-MDB2','MDB2']])o+=realPlaque(x,y,94,t,'grid:'+key+':kv');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="dx-svg real-svg overview0410-svg" viewBox="0 0 1680 712" preserveAspectRatio="xMidYMid meet" aria-label="STATION OVERVIEW · trạm 220 kV, H1 H2 và nguồn tự dùng theo ảnh DCS">${o}${sourceMeterSvg(50,30,145,['p','q'])}</svg>`;
}
function stationOverviewHTML0410(c){return `<div class="official-page real-page overview0410">${realTools(c,39)}${stationOverviewSvg0410()}${realNavigation(c,'stationoverview')}</div>`;}
function dynamicMainSvg(c){
 let svg=legacyMainSvg049(c).replace('class="dx-svg"','class="dx-svg real-svg main0410-svg"');
 svg=svg.replace('>ACB-1</text>','>ACB-10</text><text x="117" y="701" font-size="10">(ACB-1)</text>').replace('>ACB-2</text>','>ACB-20</text><text x="117" y="701" font-size="10">(ACB-2)</text>');
 let taps='';
 for(let i=0;i<2;i++){
  const x=i*790+128,y=145,key='tap'+(i+1);
  taps+=realMeter(x+21,y-37,145,[['F','grid:C'+(i?24:21)+':frequency','Hz',2]],19);
  taps+=realAction(`data-action="main-tap-reference0410" data-unit="${i}"`,
   `<title>Nấc phân áp T${i+1} · mốc ảnh 37 ngày 29/10/2026</title><rect x="${x}" y="${y}" width="194" height="83" fill="#000" stroke="#ddd" stroke-width="2"/>${realText(x+97,y+22,'POS. TAPE CHANGE',15,'middle')}<rect x="${x+50}" y="${y+39}" width="94" height="28" fill="#d4d4ca" stroke="#999"/><text x="${x+97}" y="${y+61}" text-anchor="middle" font-size="22" style="fill:#111" data-real-value="ref:${key}" data-real-dec="0">3</text>${realText(x+184,y+13,'OTS',8,'end','#aaa')}`);
 }
 return svg.replace('</svg>',taps+'</svg>');
}
function updateScreens0410(){
 const eq=plant.equipment;updateTrainingControls();updateRejectionPanel();
 for(const e of $$('[data-overview-node]')){
  const color=e.dataset.overviewDomain==='hv'?'#ff2020':e.dataset.overviewDomain==='unit'?'#26b6d7':'#d9ad42';
  e.setAttribute('stroke',!plant.communicationOK?'#f0f':eq.live(e.dataset.overviewNode)?color:'#666');
 }
}
function homeReference0410(key,index){
 if(key==='capability')return showCapabilityCurve(index);
 const names={capability:'CAPABILITY CURVE · H'+(index+1),'unit-relay':'RELAY PROTECTION · H'+(index+1),'yard-relay':'RELAY PROTECTION · SWITCHYARD',modbus:'MODBUS','aux-monitor':'AUXILIARY MONITOR'};
 openModal(esc(names[key]||key),'NÚT TRÊN MAIN MENU DCS · ẢNH 15 / 29-10-2026','<p>Đã bố trí nút đúng vị trí và tên trên ảnh MAIN MENU. Chưa có đủ nội dung màn hình hoặc tài liệu riêng để tái tạo chức năng này chính xác; nút chỉ mở thông tin tham chiếu.</p>',btn('ẢNH MAIN MENU','photo-open','data-photo="15"')+btn('ĐÓNG','close-modal'));
}
function showCapabilityCurve(index){
 index=Number(index)===1?1:0;
 openModal('CAPABILITY CURVE · H'+(index+1),'P–Q · GIÁ TRỊ TRỰC TIẾP',`<section class="pq-panel" data-capability-unit="${index}"><div class="pq-live"><span>P <b data-pq-p>—</b> MW</span><span>Q <b data-pq-q>—</b> MVAr</span><strong data-pq-status role="status">—</strong></div>${capabilitySvg()}<p class="pq-note">Đường bao tham khảo OTS · chưa hiệu chỉnh theo đường đặc tính nhà chế tạo.</p></section>`,btn('ĐÓNG','close-modal'));
 $('#modal').classList.add('capability-modal');updateCapabilityCurve();
}
function refreshEquipmentLabels0418(){
 for(const node of $$('[data-io-kind="equipment"]')){
  const p=equipmentPoint0411(node.dataset.ioKey),signature=String(p.raw)+'|'+p.quality;
  if(node.dataset.feedbackLabel===signature)continue;node.dataset.feedbackLabel=signature;
  const text=pointTitle0411(p);node.setAttribute('title',text);node.setAttribute('aria-label',text);
 }
}
function updateCapabilityCurve(){
 const root=$('[data-capability-unit]');if(!root||!$('#modal').open)return;
 const index=Number(root.dataset.capabilityUnit),unit=plant.units[index],p=readTag('p',index),q=readTag('q',index),valid=p.quality==='GOOD'&&q.quality==='GOOD'&&Number.isFinite(p.value)&&Number.isFinite(q.value),a=capabilityAssessment({p:p.value,q:q.value,quality:valid,online:unit.s.breaker,rpm:unit.s.rpm});
 root.dataset.state=a.state;$('[data-pq-p]',root).textContent=valid?fmt(p.value,1):'BQ';$('[data-pq-q]',root).textContent=valid?fmt(q.value,1):'BQ';$('[data-pq-status]',root).textContent=a.text;
 const point=$('[data-pq-point]',root),cross=$('[data-pq-crosshair]',root);point.style.display=cross.style.display=valid?'':'none';
 if(valid){const pos=capabilityPoint(p.value,q.value),zero=capabilityPoint(0,0);point.setAttribute('cx',pos.x);point.setAttribute('cy',pos.y);cross.setAttribute('d',`M${pos.x} 440V${pos.y}H${zero.x}`);$('[data-pq-point-title]',root).textContent=`P ${fmt(p.value,1)} MW · Q ${fmt(q.value,1)} MVAr · ${a.text}`;}
}
function homeTemperature0410(){openModal('GENERAL TEMPERATURE','TỔNG HỢP NHIỆT ĐỘ H1 / H2 TRONG PHIÊN OTS',`<table class="hmi-table"><thead><tr><th>H1 · °C</th><th>THÔNG SỐ</th><th>H2 · °C</th></tr></thead><tbody>${REAL_GENERAL_TEMPS.map(([label,key])=>`<tr><td>${value(key,0,1)}</td><td>${label}</td><td>${value(key,1,1)}</td></tr>`).join('')}</tbody></table>`,btn('ĐÓNG','close-modal'));}
function mainTapReference0410(i){
 const t=plant.equipment.taps[i],a=plant.equipment.tapBlockers(i);
 openModal('T'+(i+1)+' · POS. TAPE CHANGE','NẤC PHÂN ÁP · MÔ HÌNH KHÔNG ĐIỆN',`<div class="tap-readout">Nấc hiện tại <b data-tap-value="${i}">${t.value}</b> / 5</div><p>Nấc 3 theo ảnh MAIN UNIT. Phạm vi 1–5, thời gian 5 s là tham số đào tạo. Mô hình chỉ cho đổi nấc khi MBA đã cách ly, mất điện; chưa mô phỏng bộ OLTC thực tế hoặc tác động tỷ số MBA.</p><div class="row-actions">${btn('GIẢM NẤC −','tap-request',`data-unit="${i}" data-delta="-1" ${a.length||t.value===1?'disabled':''}`)}${btn('TĂNG NẤC +','tap-request',`data-unit="${i}" data-delta="1" ${a.length||t.value===5?'disabled':''}`)}</div><div class="tap-blockers">${a.map(v=>'<p>✕ '+esc(v)+'</p>').join('')||'<p>P · Đủ điều kiện đổi nấc trong OTS.</p>'}</div>`,btn('ẢNH MAIN UNIT','photo-open','data-photo="37"')+btn('ĐÓNG','close-modal'));
}

function legacyHomeHTML049(){
 const annRows=[['U#1 ANN(1/3)','UNIT-1',1],['U#2 ANN(1/3)','UNIT-2',1],['AUXILIARY','AUXILIARY',1],['SWITCHYARD (1/3)','SWYD',1],['GATEWAY','GATEWAY',1],['U#1 ANN(2/3)','UNIT-1',2],['U#2 ANN(2/3)','UNIT-2',2],['SYSTEM ARCHITECTURE','architecture'],['SWITCHYARD (2/3)','SWYD',2],null,['U#1 ANN(3/3)','UNIT-1',3],['U#2 ANN(3/3)','UNIT-2',3],null,['SWITCHYARD (3/3)','SWYD',3],null];
 const unitMenu=index=>[['WATER FLOW SYSTEM','water'],['OIL SUPPLY SYSTEM','oil'],['TEMPERATURE MONITOR','temp'],['VIBRATION MONITOR '+(index+1),'vibration'],['CONTROL PANEL','control'],['STARTING CONDITION 1','cond1'],['SEQ MONITOR (1x-1)','seq1'],['SEQ MONITOR (1x-2)','seq2'],['SEQ MONITOR (1x-3)','seq3'],null,['STARTING CONDITION 2','cond2'],['SEQ MONITOR (5x)','seq5'],null,null].map(item=>item?nav(item[0],item[1],index):'<span class="blank"></span>').join('');
 const meters=index=>`<div class="home-unit-meters"><div class="unit-name">U#${index+1}</div><div class="home-unit-values"><div>${value('p',index,1)}<small>MW</small></div><div>${value('current',index,0)}<small>A</small></div><div>${value('q',index,1)}<small>MVAr</small></div><div>${value('kv',index,2)}<small>kV</small></div><div class="home-rpm">${value('rpm',index,0)}<small>RPM</small></div></div></div>`;
 return `<div class="home-page"><div class="home-row ann-row"><div class="home-label">ANNUNCIATOR</div><div class="home-buttons">${annRows.map(a=>!a?'<span class="blank"></span>':a[1]==='architecture'?nav(a[0],'architecture'):btn(a[0],'ann',`data-scope="${a[1]}" data-part="${a[2]}"`)).join('')}</div></div>
 <div class="home-row switchyard-row"><div class="home-label"><div class="home-switch-values"><strong>SWITCHYARD</strong><div><span>${value('gridVoltage',0,1)}<small> kV</small></span><span>${value('pTotal',0,1)}<small> MW</small></span></div></div></div><div class="home-buttons">${[['STATION OVERVIEW','stationoverview'],['220kV SWITCHYARD','switchyard'],['MAIN UNIT','mainunit'],['STATION SERVICE','stationservice'],['GH EQUIPMENT','gh'],['SY/AL CONTROL PANEL','stationcontrol'],['SƠ ĐỒ NKT','nkt'],['IEC 104 / I/O','ioreference'],['AIR SUPPLY SYSTEM','air'],['GENERAL DISPLAY','general']].map(a=>nav(...a)).join('')}</div></div>
 ${[0,1].map(i=>`<div class="home-row unit-home-row"><div class="home-label">${meters(i)}</div><div class="home-buttons">${unitMenu(i)}</div></div>`).join('')}
 <div class="home-row diag-home-row"><div class="home-label">DIAGNOSTIC PAGE</div><div class="diag-buttons">${[['U#1',0,'unitdiag'],['U#2',1,'unitdiag'],['AUXILIARY',0,'auxdiag'],['SWITCHYARD',0,'sydiag'],['GATEWAY',0,'gateway']].map(([name,index,page])=>`<div><strong>${name}</strong>${nav(name==='U#1'?'U#1 DIAGNOSTIC':name==='U#2'?'U#2 DIAGNOSTIC':name==='GATEWAY'?'GATEWAY DIAGNOSTIC':name+' DIAGNOSTIC',page,index,`data-scope="${name}"`)}<div class="diag-links">${nav('A0/A3','agc',index)}</div></div>`).join('')}</div></div><div class="home-bottom-space"></div><div class="home-scope"><span>AVC — OPERATOR TRAINING SIMULATOR · OTS 04.25</span><span>SIMULATION · HMI LAYOUT REFERENCE · KHÔNG KẾT NỐI THIẾT BỊ</span></div></div>`;
}
function switchPair(label,key,values){const st=s();return `<div><span class="key-label">${label}</span><div class="selector-pair">${values.map(([text,v])=>btn(text,'switch',`data-key="${key}" data-value="${v}"`,st.switches[key]===v)).join('')}</div></div>`;}
// 04.9: CONTROL PANEL layout observed in the user's current HMI photograph.
// Keep the existing engineering units and command paths until controller scales are confirmed.
function panelSelector049(label,key,choices=[['NOT USE','NOT USE'],['USE','USE']],third=''){
 const st=s();
 return `<div class="panel-selector049" role="group" aria-label="${label}"><span class="key-label">${label}</span><div class="selector-pair ${third?'has-third':''}">${choices.map(([text,v])=>btn(text,'switch',`data-key="${key}" data-value="${v}" data-panel-selector="${key}" data-panel-unit="${selected}" aria-label="${label} · ${text} · H${selected+1}" aria-pressed="${st.switches[key]===v}"`,st.switches[key]===v)).join('')}${third}</div></div>`;
}
function panelReadout049(label,key,unit='',edit=null,dec=1){
 const name=label.replace(/<br>/g,' ');
 return `<div class="hmi-readout panel-readout049"><label>${label}</label><div>${value(key,selected,dec,'',edit,name)}${unit?`<span class="unit-label">${unit}</span>`:''}${edit?`<span class="adjusters">${['far-down','down','up','far-up'].map((dir,i)=>btn(['◀◀','◀','▶','▶▶'][i],'panel-nudge049',`data-key="${edit}" data-delta="${i<2?-1:1}" data-edit-control="${edit}" aria-label="${name} · ${i<2?'Giảm':'Tăng'}${i===0||i===3?' nhanh':''}" ${i===0||i===3?'data-fast="1"':''}`)).join('')}<button class="hmi-button permit-indicator" data-action="permit-info" data-permit-key="${edit}" aria-label="${name} · PERMIT">P</button></span>`:''}</div></div>`;
}
function controlHTML(){
 const st=s(),modeButtons=['REMOTE','LOCAL AUTO','TEST'].map(m=>btn(m==='LOCAL AUTO'?'LOCAL<br>AUTO':m,'mode',`data-value="${m}" data-panel-mode="${m}" aria-pressed="${st.mode===m}"`,st.mode===m)).join('');
 const agc=btn('AGC ON','panel-agc049','data-panel-agc aria-label="AGC ON"',st.agc.on);
 const gov=[['NETWORK','NETWORK'],['ISOLATED','ISOLATED'],['OPENING<br>CONTROL','OPENING'],['LOAD<br>CONTROL','LOAD'],['FREQUENCY<br>CONTROL','FREQUENCY'],['PRI. FREQ.<br>OPERATING','PRIMARY']];
 return `<div class="control-page control049 unit-watermark" data-unit="${selected+1}">
 <div class="control-head"><div class="mode43r" role="group" aria-label="43R"><span class="key-label">43R</span><div>${modeButtons}</div></div>
 <div class="state-and-step"><div class="strip-box"><label>STATUS INDICATOR</label><div class="status-lights">${[0,'ready',1,2,3,4,5,6,7].map(n=>`<span data-stage-light="${n}">${n==='ready'?'START<br>CONDITION':STAGES[n].en.replace('TURBINE START','TURBINE<br>START').replace('SYNCHRO COND','SYNCHRO<br>COND.')}</span>`).join('')}</div></div>
 <div class="strip-box"><label>STEP SELECTOR (43S-CS)</label><div class="step-buttons">${STAGES.map((v,i)=>`<div class="step-cell049" style="grid-column:${i===0?1:i+2}"><button class="step-permit049" data-action="panel-stage-permit049" data-stage="${i}" data-stage-permit049="${i}" aria-label="${v.en} · PERMIT">P</button>${btn(v.en.replace('TURBINE START','TURBINE<br>START').replace('SYNCHRO COND','SYNCHRO<br>COND.'),'stage',`data-stage="${i}"`)}</div>`).join('')}</div></div></div></div>
 <div class="control-body">
 <div class="left-keys">
 ${panelSelector049('43RR-1','rr1',[['A0&A3','A0/A3'],['AV/DN','AV/DN']],agc)}
 ${panelSelector049('43RR-2','rr2',[['A VUONG','A VUONG'],['DA NANG','DA NANG']])}
 ${panelSelector049('43_O/M','om',[['OPS','OPS'],['U'+(selected+1)+'MDU','UMDU']])}
 ${[['43CH','ch'],['43ALR','alr'],['43JLR','jlr'],['43AQR','aqr'],['43JQR','jqr'],['43AVR','avr']].map(([l,k])=>panelSelector049(l,k)).join('')}
 </div>
 <div class="readout-column panel-metrics049">
 ${panelReadout049('TURBINE SPEED','rpm','RPM',null,0)}
 ${panelReadout049('TOTAL ACTIVE POWER','pTotal','MW',null,1)}
 ${panelReadout049('ACTIVE POWER','p','MW',null,1)}
 <div class="hmi-readout panel-readout049"><label>43-90 (AVR MODE)</label><div class="avr-row049">${['MANUAL','AUTO'].map(m=>btn(m,'avr',`data-value="${m}" data-panel-avr="${m}"`,st.avr===m)).join('')}<button class="hmi-button permit-indicator" data-action="panel-avr-permit049" data-avr-permit049 aria-label="43-90 · PERMIT">P</button></div></div>
 ${panelReadout049('REACTIVE POWER','q','Mvar',null,1)}
 </div>
 <div class="readout-column panel-regulators049">
 ${panelReadout049('7-65P (LOAD CTRL)','pSet','MW','manualP',1)}
 ${panelReadout049('JOINT CONTROL SET<br>POINT ACTIVE POWER','pJointSet','MW','jointP',2)}
 ${panelReadout049('ALR SET POINT','alrDisplay','MW','p',2)}
 ${panelReadout049('JOINT CONTROL SET<br>POINT REACTIVE POWER','qJointSet','Mvar','jointQ',2)}
 ${panelReadout049('AQR SET POINT','aqrDisplay','Mvar','q',2)}
 ${panelReadout049('AVR SET POINT','uSet','kV','u',2)}
 </div>
 <div class="readout-column panel-limits049">
 ${panelReadout049('7-65F (SPEED CTRL)','fSet','Hz','f',2)}
 ${panelReadout049('MAX POWER','pHi','MW','pHi',2)}
 ${panelReadout049('MIN POWER','pLo','MW','pLo',2)}
 ${panelReadout049('7-90R (VOLTAGE CTRL)','uSet','kV','u',2)}
 ${panelReadout049('7-70E (VOLTAGE CTRL)','excV','V','e',1)}
 </div>
 <div class="control-right">
 ${panelReadout049('7-77 (GATE LIM CTRL)','gateLimit','%','gate',1)}
 <div class="relay-group049"><span class="key-label">MAIN CONTROL RELAY</span><div class="relay-indicators"><span data-relay="5X">5X</span><span data-relay="1X">1X</span></div></div>
 ${panelSelector049('43USM','usm')}
 ${panelSelector049('43 GOVF<br>FREQUENCY CONTROL','govf')}
 <div class="gov-group049"><span class="key-label">GOV MODE CONTROL</span><div class="gov-modes">${gov.map(([text,m])=>btn(text,m==='PRIMARY'?'panel-primary049':'gov',`data-value="${m}" data-panel-gov="${m}"`,m===st.govMode||m==='NETWORK'&&st.breaker)).join('')}</div></div>
 </div></div>
 </div>`;
}
function controlFitGeometry049(width,height){
 const scale=Math.min(width/1480,height/620,1.3);
 return {scale,left:0,top:0,designWidth:width/scale,designHeight:height/scale,width,height};
}
function stagePermit049(unit,target){
 const s=unit.s,a=[...unit.controlBlockers()];
 if(!Number.isInteger(target)||target<0||target>7)a.push('Bước đích không hợp lệ.');
 if(s.lockout)a.push('Khóa 86 đang giữ.');if(s.stopping)a.push('Đang thực hiện trình tự dừng.');if(s.guideActive)a.push('Đang chạy bài hướng dẫn BS/CH.');
 if(a.length)return a;
 if(target===0)return s.stage===0?['Tổ máy đang dừng.']:[];if(s.rejection.active)return ['Đang sa thải: chờ ổn định EX.'];if(target>=5&&s.stage<5&&!unit.plant.equipment.gridPath(unit.unit-1))return ['Chưa khôi phục đường nối lưới.'];
 if(target===7){if(s.stage===7&&!s.scReturning)a.push('Tổ máy đã ở SC.');if(s.avr!=='AUTO'||s.switches.ch!=='NOT USE'||!s.compressor||s.air<7||s.air>8)a.push('SC cần AVR AUTO, 43CH NOT USE và khí nén sẵn sàng.');if(unit.plant.units.some(u=>u!==unit&&u.s.breaker&&u.s.workingMode==='G'))a.push('Cần dừng tổ phát còn lại trước khi chạy SC.');}
 if(s.stage===7&&target===6){if(s.scReturning)a.push('Đang chuyển SC → G.');if(unit.plant.units.some(u=>u!==unit&&u.s.workingMode==='SC'&&u.s.breaker))a.push('Cần dừng tổ SC còn lại trước.');return a;}
 if(s.stage===6&&target===7)return a;
 if(s.stage>=6)a.push('Chọn STOP hoặc chuyển đổi G/SC.');
 if(target<s.stage)a.push('Dùng STOP để dừng theo trình tự.');
 if(s.stage===0){a.push(...unit.blockers());if(!unit.plant.yard.gridPath||unit.plant.equipment&&!unit.plant.equipment.gridPath(unit.unit-1))a.push('Nhánh đấu nối trạm chưa sẵn sàng.');}
 return [...new Set(a)];
}
function updateControlPanel049(){
 const panel=$('.control049');if(!panel)return;
 const unit=u(),st=unit.s,quality=unit.qualityGood;
 const mark=(e,on)=>{e.classList.toggle('selected',quality&&on);e.classList.toggle('bad-quality',!quality);e.setAttribute('aria-pressed',String(quality&&on));};
 $$('[data-panel-selector]',panel).forEach(e=>mark(e,st.switches[e.dataset.panelSelector]===e.dataset.value));
 $$('[data-panel-mode]',panel).forEach(e=>mark(e,st.mode===e.dataset.panelMode));
 $$('[data-panel-avr]',panel).forEach(e=>mark(e,st.avr===e.dataset.panelAvr));
 $$('[data-panel-agc]',panel).forEach(e=>mark(e,st.agc.on));
 $$('[data-panel-gov]',panel).forEach(e=>{const key=e.dataset.panelGov;mark(e,key==='NETWORK'?st.breaker:key==='ISOLATED'?!st.breaker:key==='PRIMARY'?st.signals.primaryFrequencyOperating===true:st.govMode===key);});
 $$('[data-stage-permit049]',panel).forEach(e=>{const a=stagePermit049(unit,+e.dataset.stagePermit049);e.classList.toggle('permit-on',quality&&!a.length);e.classList.toggle('bad-quality',!quality);e.setAttribute('title',!quality?'BQ':a.join('; ')||'PERMIT ON');});
 $$('[data-avr-permit049]',panel).forEach(e=>{const a=selectorAuthority(unit);e.classList.toggle('permit-on',quality&&!a.length);});
 const ready=$('[data-stage-light="ready"]',panel);if(ready){ready.classList.toggle('on',quality&&unit.ready);ready.classList.toggle('bad-quality',!quality);}
}
function panelNotes049(){openModal('CONTROL PANEL · 04.9','ĐỐI CHIẾU ẢNH DCS 29/10/2026','<p>Khung điều khiển giãn theo chiều rộng và chiều cao còn lại của cửa sổ. Các khóa 43CH/ALR/JLR/AQR/JQR/AVR/USM/GOVF có hai lựa chọn NOT USE / USE; trạng thái vàng bám từng khóa, từng tổ máy. Chọn trạng thái rồi xác nhận.</p><p>Đã bổ sung AGC ON, AVR SET POINT, QUICK STOP COND và nhãn PRI. FREQ. OPERATING; thứ tự OPENING CONTROL / LOAD CONTROL theo ảnh. Đèn PRI. FREQ. OPERATING chỉ sáng khi có phản hồi riêng, không lấy trạng thái cho phép 43GOVF thay phản hồi đang tác động.</p><p>Ảnh HMI ghi 7-65P và 7-65F bằng %, 7-70E bằng kV. Chưa có đầy đủ hàm truyền/thang PLC; bản này giữ nguyên các đường điều khiển OTS hiện có bằng MW/Hz/V và ghi đúng đơn vị đang dùng. Không đổi đơn vị hay lấy số phần trăm từ ảnh thay giá trị đang chạy.</p>',btn('ẢNH DCS','photo-open','data-photo="1"')+btn('ĐÓNG','close-modal'));}

function legacyControlHTML048(){
 const st=s(),switchButton=(label,key)=>btn(label,'switch',`data-key="${key}" data-selector-key="${key}" aria-pressed="${st.switches[key]==='USE'}" title="${label}: ${st.switches[key]}"`,st.switches[key]==='USE');
 return `<div class="control-page unit-watermark" data-unit="${selected+1}"><div class="control-head"><div class="mode43r"><span class="key-label">43R</span><div>${['REMOTE','LOCAL AUTO','TEST'].map(m=>btn(m,'mode',`data-value="${m}"`,m===st.mode)).join('')}</div></div><div class="state-and-step"><div class="strip-box"><label>STATUS INDICATOR</label><div class="status-lights">${[0,'ready',1,2,3,4,5,6,7].map(n=>`<span data-stage-light="${n}">${n==='ready'?'START<br>CONDITION':STAGES[n].en.replace('SYNCHRO COND','SYNCHRO<br>COND.')}</span>`).join('')}</div></div><div class="strip-box"><label>STEP SELECTOR (43S-CS)</label><div class="step-buttons">${STAGES.map((v,i)=>btn(v.en.replace('SYNCHRO COND','SYNCHRO COND.'),'stage',`data-stage="${i}"`)).join('')}</div></div></div></div>
 <div class="control-body"><div class="left-keys"><button class="location-chip" data-action="authority" title="Quyền điều khiển">${plant.station==='UMDU'?'U'+(selected+1)+'MDU':'CCR'}</button>${switchPair('43RR-1','rr1',[['A0/A3','A0/A3'],['AV/DN','AV/DN']])}${switchPair('43RR-2','rr2',[['A VUONG','A VUONG'],['DA NANG','DA NANG']])}${switchPair('43_O/M','om',[['OPS','OPS'],['U'+(selected+1)+'MDU','UMDU']])}<div class="key-button">${switchButton('43CH','ch')}</div><div class="key-button">${switchButton('43ALR','alr')}</div><div class="key-button">${switchButton('43JLR','jlr')}</div><div class="key-button">${switchButton('43AQR','aqr')}</div><div class="key-button">${switchButton('43JQR','jqr')}</div><div class="key-button">${switchButton('43AVR','avr')}</div></div>
 <div class="readout-column">${readout('TURBINE SPEED','rpm','RPM',null,0)}${readout('TOTAL ACTIVE POWER','pTotal','MW')}${readout('ACTIVE POWER','p','MW')}<div class="hmi-readout"><label>43-90 (AVR MODE)</label><div>${['MANUAL','AUTO'].map(m=>btn(m,'avr',`data-value="${m}"`,st.avr===m)).join('')}</div></div>${readout('REACTIVE POWER','q','MVAr')}</div>
 <div class="readout-column">${readout('7-65P (LOAD CTRL)','pSet','MW','manualP',1)}${readout('JOINT CONTROL SET<br>POINT ACTIVE POWER','pJointSet','MW','jointP',2)}${readout('ALR SET POINT','alrDisplay','MW','p',2)}${readout('JOINT CONTROL SET<br>POINT REACTIVE POWER','qJointSet','MVAr','jointQ',2)}${readout('AQR SET POINT','aqrDisplay','MVAr','q',2)}</div>
 <div class="readout-column">${readout('7-65F (FREQ CTRL)','frequency','Hz','f',2)}${readout('MAX POWER','pHi','MW','pHi',2)}${readout('MIN POWER','pLo','MW','pLo',2)}${readout('7-90R (VOLTAGE CTRL)','uSet','kV','u',2)}${readout('7-70E (VOLTAGE CTRL)','excV','V','e',1)}</div>
 <div class="control-right">${readout('7-77 (GATE LIM CTRL)','gateLimit','%','gate',1)}<div><span class="key-label" style="text-align:center">MAIN CONTROL RELAY</span><div class="relay-indicators"><span data-relay="5X">5X</span><span data-relay="1X">1X</span></div></div>${switchButton('43USM','usm')}${switchButton('43GOVF','govf')}<div><span class="key-label" style="text-align:center">GOV MODE CONTROL</span><div class="gov-modes">${[['NETWORK','NETWORK'],['ISOLATED','ISOLATED'],['LOAD<br>CONTROL','LOAD'],['OPENING<br>CONTROL','OPENING'],['FREQUENCY<br>CONTROL','FREQUENCY'],['INLET VALVE','INLET']].map(([text,m])=>btn(text,'gov',`data-value="${m}"`,m===st.govMode||m==='NETWORK'&&st.breaker)).join('')}</div></div></div></div><p class="control-note">CONTROL LOCATION / INPUTS: ${esc(u().controlBlockers().join(' · ')||'OPS CONTROL AVAILABLE')} · OTS PARAMETERS — xem ⓘ để đối chiếu giả định.</p></div>`;
}
function processStrip(){return `<div class="process-strip">${readout('ACTIVE POWER','p','MW')}${readout('REACTIVE POWER','q','MVAr')}${readout('GEN VOLTAGE','kv','kV',null,2)}${readout('EXITN VOLTAGE','excV','V')}${readout('TURBINE SPEED','rpm','RPM',null,0)}${readout('GUIDE VANE POS','gate','%')}</div>`;}
const svgBit=(x,y,on,quality='GOOD',attrs='')=>`<rect x="${x}" y="${y}" width="10" height="10" fill="${binaryColor0411(on,quality)}" ${attrs}/>`;
function conditionsHTML(part){
 const rows=u().conditions(part),leftRows=part===1?rows:rows.slice(0,22),rightRows=part===1?[]:rows.slice(22),height=600,baseY=27,gap=part===1?24:24,w=1200;
 let lines=`<text class="watermark" x="520" y="490">${selected+1}</text>`;
 leftRows.forEach((r,i)=>{const y=baseY+i*gap,neg=r.required===false;lines+=`<g class="signal-hit" data-action="condition-tag" data-index="${i}" data-part="${part}" ${pointAttrs0411('condition',i,selected,part)}>${svgBit(12,y+5,r.raw,r.quality,`data-condition="${i}" data-part="${part}"`)}<rect class="logic-box" x="35" y="${y}" width="345" height="23"/><text x="44" y="${y+16}">${r.tag}</text><path class="wire" d="M380 ${y+11.5}H${part===1?850:475}"/>${neg?`<rect x="${part===1?826:451}" y="${y+4}" width="15" height="15" fill="#000" stroke="#bbb"/><path d="M${part===1?827:452} ${y+5}l13 13m0-13-13 13" class="wire"/>`:''}</g>`;});
 if(part===1){lines+=`<path class="wire" d="M850 28V557M850 295H1050"/><path d="M842 290h15v10h-15" class="wire"/><rect class="logic-box" x="1050" y="274" width="128" height="43"/><text x="1114" y="291" text-anchor="middle">STARTING</text><text x="1114" y="307" text-anchor="middle">CONDITION-1</text>${svgBit(1188,290,rows.every(r=>r.ok||r.info),u().qualityGood?'GOOD':'BAD','data-permissive="1"')}`;
 }else{
  rightRows.forEach((r,j)=>{const i=j+22,y=350+j*28;lines+=`<g class="signal-hit" data-action="condition-tag" data-index="${i}" data-part="2" ${pointAttrs0411('condition',i,selected,2)}>${svgBit(535,y+5,r.raw,r.quality,`data-condition="${i}" data-part="2"`)}<rect class="logic-box" x="557" y="${y}" width="340" height="23"/><text x="564" y="${y+16}">${r.tag}</text><path class="wire" d="M897 ${y+11.5}H975"/>${r.required===false?`<rect x="950" y="${y+4}" width="15" height="15" fill="#000" stroke="#bbb"/><path d="M951 ${y+5}l13 13m0-13-13 13" class="wire"/>`:''}</g>`;});
  lines+=`<path class="wire" d="M475 28V557M475 270H975M975 235V557M975 270H1042"/><rect class="logic-box" x="1042" y="245" width="135" height="47"/><text x="1110" y="263" text-anchor="middle">STARTING</text><text x="1110" y="280" text-anchor="middle">CONDITION</text>${svgBit(1187,264,u().ready,u().qualityGood?'GOOD':'BAD','data-permissive="all"')}`;
 }
 return `<div class="logic-page"><svg class="logic-svg" viewBox="0 0 ${w} ${height}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Starting Conditions ${part}/2 — tín hiệu và nhánh đảo"><g>${lines}</g></svg><div class="logic-bottom">${binaryLegend0411()} RAW trước nhánh đảo · Rê chuột / bấm tín hiệu để xem DO/DI. Kết quả nhận lệnh xét riêng theo mô hình. ${btn('CHECK START CONDITION','check-ready')}${btn('HMI GỐC','reference')}${part===1?btn('ẢNH DCS H2','binary-photo0411','data-photo="condition"'):''}</div></div>`;
}
function sequenceHTML(part=1,stop=false){
 const st=s(),W=1400,H=490;
 const step=(x,y,w,label,n,context='main')=>`<g data-sequence-node="${stop?'stop':'start'}" data-sequence-context="${context}" data-stage="${n}" aria-label="${label}"><rect class="step-box" x="${x}" y="${y}" width="${w}" height="36"/><text class="step-text" x="${x+w/2}" y="${y+23}" text-anchor="middle">${label}</text></g>`;
 const row=(x,y,w,label,on,key)=>{const p=sequencePoint0411(key,selected,label),shown=p.negated?label.replace('NOT LOW','LOW').replace('SPACE HEATER OFF','SPACE HEATER ON'):label;return `<g class="signal-hit" data-seq-signal="${key}" data-action="io-inspect0411" ${pointAttrs0411('sequence',key,selected,'',shown)}>${svgBit(x-20,y+6,p.raw,p.quality,`data-seq-bit="${key}"`)}<rect class="logic-box" x="${x}" y="${y}" width="${w}" height="26"/><text x="${x+7}" y="${y+18}" style="font-size:11px">${esc(shown)}</text>${p.negated?`<circle class="input-invert0411" cx="${x+w+4}" cy="${y+13}" r="4"/>`:''}</g>`;};
 const wire=(d)=>`<path d="${d}" class="wire"/>`;
 let d=`<text class="watermark" x="640" y="400">${selected+1}</text>`;
 if(stop){
  d+=step(35,38,155,'LOAD / SYNCHRO COND',0)+step(385,38,150,'PARALLEL-IN',1)+step(790,38,155,'EXCITATION',2)+step(1170,38,160,'TURBINE START',3)+wire('M190 56H385M535 56H790M945 56H1170M1330 56H1370V280H190');
  [['GUIDE VANE NO-LOAD POSITION',st.gate<=12,'noLoad'],['GENERATOR POWER <10.5 MW (SH30)',st.p<10.5,'stopP'],['REACTIVE POWER IN STOP WINDOW',Math.abs(st.q)<3.25,'q5']].forEach(([l,on,k],i)=>d+=row(35,100+i*32,290,l,on,k)+wire(`M325 ${113+i*32}H360V56H385`));
  d+=row(410,100,310,'CB'+(selected===0?'901':'902')+' OPEN POSITION (OTS)',!st.breaker,'cbOpen')+wire('M720 113H755V56H790');
  d+=row(820,100,330,'EXCITATION SYSTEM (43EX) OFF',!st.excited,'excOff')+wire('M1150 113H1160V56H1170');
  d+=step(190,262,155,'INLET VALVE',4)+step(690,262,170,'PREPARATION',5)+step(1175,262,145,'STOP',6)+wire('M345 280H690M860 280H1175');
  [['GUIDE VANE FULLY CLOSE (65LB)',st.gate<1,'gateClosed'],['ELECTRICAL BRAKE',st.eBrake,'eBrake'],['MECHANICAL BRAKE',st.mBrake,'mBrake']].forEach(([l,on,k],i)=>d+=row(35,330+i*31,320,l,on,k)+wire(`M355 ${343+i*31}H385V280H690`));
  [['INLET VALVE FULLY CLOSE (33LB)',st.inlet<1,'inletClosed'],['BYPASS VALVE FULLY CLOSE (33BLB)',st.bypass<1,'bypassClosed']].forEach(([l,on,k],i)=>d+=row(470,330+i*31,345,l,on,k)+wire(`M815 ${343+i*31}H850V280H1175`));
  [['AUXILIARY STOP CONDITION (1AX RESET)',!st.coolingPump&&!st.lift,'auxStopped'],['TIME DELAY RELAY FOR 14L (14LT) ON',st.stage===0,'standstill']].forEach(([l,on,k],i)=>d+=row(940,330+i*31,360,l,on,k)+wire(`M1300 ${343+i*31}H1340V280H1320`));
 }else if(part===1){
  d+=step(35,34,145,'STOP',0)+step(415,34,170,'PREPARATION',1)+step(840,34,160,'INLET VALVE',2)+step(1200,34,170,'TURBINE START',3)+wire('M180 52H415M585 52H840M1000 52H1200');
  const a=[['STARTING CONDITION',u().ready||st.stage>0,'startCondition'],['AUXILIARY START CONDITION (1AX SET)',st.stage>=1,'auxStart'],['COOLING WATER VALVE OPENED (88CWV)',st.coolingValve,'coolingValve'],['DISCHARGE REDUCING · NOT',!st.faults.cooling,'coolingGood'],['OIL LIFT PUMP STARTED (88QT)',st.lift,'lift'],['SPACE HEATER OFF (88SH · NOT)',st.stage===0,'heaterOff'],['OIL LIFT PUMP PRESSURE SWITCH (63QT)',st.liftPressure>.98,'liftPressure'],['GEN. UPPER BEARING WATER FLOW NOT LOW',!st.faults.cooling,'flowUpper'],['GEN. LOWER BEARING WATER FLOW NOT LOW',!st.faults.cooling,'flowLower'],['GEN. AIR COOLER WATER FLOW NOT LOW',!st.faults.cooling,'flowAir']];
  a.forEach(([l,on,k],i)=>d+=row(35,100+i*31,335,l,on,k)+wire(`M370 ${113+i*31}H392V52H415`));
  [['INLET VALVE OPENED (33HA)',st.inlet>99,'inletOpen'],['INLET BY-PASS VALVE CLOSED (33BLB)',st.bypass<1,'bypassClosed']].forEach(([l,on,k],i)=>d+=row(440,100+i*31,345,l,on,k)+wire(`M785 ${113+i*31}H815V52H840`));
  [['GEN. OIL COOLER FLOW NOT LOW',!st.faults.cooling,'coolingGood'],['TURBINE SPEED PER SELECTED PROFILE',st.rpm>.9*MODEL.rpm,'speed90']].forEach(([l,on,k],i)=>d+=row(905,100+i*31,350,l,on,k)+wire(`M1255 ${113+i*31}H1280V52H1200`));
 }else if(part===2){
  d+=step(35,40,175,'TURBINE START',3)+step(420,40,175,'EXCITATION',4)+step(850,40,170,'PARALLEL-IN',5)+step(1215,40,140,'LOAD',6)+step(1170,240,195,'SYNCHRO COND',7)+step(810,390,170,'LINE CHARGE',8)+wire('M210 58H420M595 58H850M1020 58H1215M1037 58V258H1170M780 58V408H810');
  [['GENERATOR VOLTAGE >90% (91E2)',st.kv>.9*MODEL.kv,'voltage90'],['FIELD CIRCUIT BREAKER CLOSE (41)',st.excited,'excited']].forEach(([l,on,k],i)=>d+=row(35,115+i*32,340,l,on,k)+wire(`M375 ${128+i*32}H390V58H420`));
  d+=row(465,115,325,'CB'+(selected===0?'901':'902')+' CLOSE POSITION',st.breaker,'breaker')+wire('M790 128H818V58H850');
  d+=row(900,115,340,'GENERATOR POWER >5% (92P)',st.p>5.25,'p5')+wire('M1240 128H1270V58H1215');
  [['GUIDE VANE FULLY CLOSE',st.gate<1,'gateClosed'],['INLET VALVE FULLY CLOSE',st.inlet<1,'inletClosed'],['DRAFT WATER LEVEL DEPRESSED',st.draft<47.85,'draftLow']].forEach(([l,on,k],i)=>d+=row(790,280+i*30,330,l,on,k)+wire(`M1120 ${293+i*30}H1150V258H1170`));
  [['AVR LINE CHARGE MODE',false,'lineCharge'],['CB271 CLOSE',false,'lineBreaker'],['GENERATOR VOLTAGE ESTABLISHED',st.kv>12.4,'voltage90']].forEach(([l,on,k],i)=>d+=row(410,350+i*30,335,l,on,k)+wire(`M745 ${363+i*30}H780V408H810`));
 }else{
  d+=step(35,22,150,'LOAD / PARALLEL-IN',6,'sc-start')+step(1000,22,210,'SYNCHRONOUS CONDENSER',7,'sc-start')+wire('M185 40H1000');
  [['GUIDE VANE FULLY CLOSE',st.gate<1,'gateClosed'],['INLET VALVE FULLY CLOSE',st.inlet<1,'inletClosed'],['DRAFT WATER LEVEL DEPRESSED',st.draft<47.85,'draftLow']].forEach(([l,on,k],i)=>d+=row(35,85+i*29,385,l,on,k)+wire(`M420 ${98+i*29}H950V40H1000`));
  d+=step(35,220,210,'SYNCHRONOUS CONDENSER',7,'sc-return')+step(820,220,170,'PARALLEL-IN',5,'sc-return')+step(1210,220,135,'LOAD',6,'sc-return')+wire('M245 238H820M990 238H1210');
  [['REACTIVE POWER IN STOP WINDOW',Math.abs(st.q)<3.25,'q5'],['GUIDE VANE CLOSED',st.gate<1,'gateClosed'],['CB'+(selected===0?'901':'902')+' CLOSE POSITION',st.breaker,'breaker']].forEach(([l,on,k],i)=>d+=row(35,280+i*29,385,l,on,k)+wire(`M420 ${293+i*29}H780V238H820`));
  [['INLET VALVE OPENED (33HA)',st.inlet>99,'inletOpen'],['GENERATOR POWER >5% (92P)',st.p>5.25,'p5']].forEach(([l,on,k],i)=>d+=row(820,280+i*29,350,l,on,k)+wire(`M1170 ${293+i*29}H1190V238H1210`));
  d+=step(35,405,150,'LINE CHARGE',8,'line-charge')+step(820,405,170,'PARALLEL-IN',5,'line-charge')+wire('M185 423H820M990 423H1335V238');
 }
 return `<div class="page-pad seq-surface">${processStrip()}<div class="seq-live-focus" data-seq-details data-direction="${stop?'stop':'start'}"></div><svg class="logic-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Sơ đồ giám sát trình tự ${stop?'5X':'1X '+part+'/3'}">${d}</svg><div class="seq-aux"><span>43USM: <strong data-usm-value>${st.switches.usm}</strong></span><span>TIMER: <strong data-timer-value>0.0 s</strong></span><span data-timer-status>SEQUENCE MONITOR</span>${btn(stop?'STOP → ACTION':'LOAD → ACTION','stage',`data-stage="${stop?0:6}"`)}${!stop?btn('SYNCHRO COND','stage','data-stage="7"'):''}${nav('UNIT AGC','agc')}${st.stage===5?btn('43-25 / MANUAL SYNC','sync-panel'):''}</div><div class="logic-bottom">Bước đang thực hiện nhấp nháy vàng; bước hoàn thành sáng vàng, chưa thực hiện màu xám. ${binaryLegend0411()} Ô vuông là RAW, nhánh NOT xét riêng. Rê chuột / bấm để xem DO/DI.</div></div>`;
}
function tempGroup(title,rows){return `<section class="temp-group"><div class="panel-heading">${title}</div><table class="hmi-table"><tbody>${rows.map(([label,key])=>`<tr><td>${label}</td><td>${value(key,selected,1)} DEG C</td></tr>`).join('')}</tbody></table></section>`;}
function temperatureHTML(){
 const group=(prefix,n,label)=>Array.from({length:n},(_,i)=>[label+' '+(i+1),prefix+(i+1)]);
 return `<div class="page-pad unit-watermark" data-unit="${selected+1}"><div class="thermal-status"><span>MODE <b data-thermal-mode></b></span><span>P ${value('p')} MW</span><span>Q ${value('q')} MVAr</span><span>DẢI <b data-thermal-band></b></span>${btn('MỐC NHIỆT / CHẾ ĐỘ','thermal-model')}${nav('TREND NHIỆT','trend')}</div><div class="temperature-layout"><div>${tempGroup('GEN. UPPER GUIDE BEARING', [...group('tempUpper',12,'METAL TEMPERATURE'),['OIL TEMPERATURE','tempUpperOil']])}${tempGroup('GEN. LOWER GUIDE BEARING',[...group('tempLower',12,'METAL TEMPERATURE'),['OIL TEMPERATURE','tempLowerOil']])}${tempGroup('COOLING WATER / CONTROL OIL',[['COOLING WATER INLET','tempWaterIn'],['COOLING WATER OUTLET','tempWaterOut'],['CONTROL OIL TANK','tempControlOil']])}</div><img class="unit-cutaway" src="${window.__assets.cutaway}" alt="Mặt cắt tổ máy tham chiếu từ màn hình nhiệt độ DCS A Vương"><div>${tempGroup('GEN. STATOR / MAGNETIC CIRCUIT',[...['U1','V1','W1','U2','V2','W2'].map((n,i)=>['STATOR WINDING ('+n+')','tempStator'+(i+1)]),...group('tempMagnetic',6,'MAGNETIC CIRCUIT'),['AIR COOLER AIR INLET','tempAirIn'],['AIR COOLER AIR OUTLET','tempAirOut']])}${tempGroup('LOWER BEARING / THRUST BEARING',[...[13,14,15,16].map(i=>['LOWER BEARING METAL '+i,'tempLower'+i]),['THRUST PAD TEMPERATURE 1','tempThrust1'],['THRUST PAD TEMPERATURE 2','tempThrust2']])}${tempGroup('TURBINE GUIDE BEARING / SHAFT SEAL',[['GUIDE BEARING PAD No.3','tempTurbine3'],['GUIDE BEARING PAD No.7','tempTurbine7'],['OIL TEMPERATURE','tempTurbineOil'],['TURBINE SHAFT SEAL','tempSeal']])}${tempGroup('MAIN TRANSFORMER',[['WINDING TEMPERATURE','tempTransformerCoil'],['OIL TEMPERATURE','tempTransformerOil']])}</div></div>${referenceNote('Mốc phát G tham chiếu nhật ký tháng 6/2026. Nhiệt tích lũy theo thời gian, tải P/Q/U và nước làm mát; xem MỐC NHIỆT để phân biệt số liệu và giả định.')}</div>`;
}
function thermalModelModal(){
 const modes=[['Dừng nguội',{stage:0,rpm:0,breaker:false,excited:false,kv:0,p:0,q:0,workingMode:'G',draft:50}],['Không tải chưa kích từ',{stage:3,stageDone:true,rpm:375,breaker:false,excited:false,kv:0,p:0,q:0,workingMode:'G',draft:50}],['Chờ hòa / kích từ',{stage:5,rpm:375,breaker:false,excited:true,kv:13.8,p:0,q:0,workingMode:'G',draft:50}],['Bù SC, Q = 0',{stage:7,rpm:375,breaker:true,excited:true,kv:13.8,p:-.8,q:0,workingMode:'SC',draft:47.7}]];
 const settings=plant.session?.thermal||setupDraft.thermal;
 const rows=modes.map(([label,patch])=>{const goal=thermalTargets({...s(),...patch,thermal:undefined,stopping:false,lockout:false,scReturning:false,flowUpper:true,flowLower:true,flowAir:true,waterFlow:100},selected+1,settings);return `<tr><td>${label}</td><td>${fmt(goal.targets.tempStator5)}</td><td>${fmt(goal.targets.tempUpper1)}</td><td>${fmt(goal.targets.tempThrust1)}</td><td>${fmt(goal.targets.tempTurbine3)}</td></tr>`;}).join('');
 const curveRows=[0,10.5,25,50,70,75,80,85,90,95,100,105].map(p=>{const c=thermalCurve(selected+1,'stator5',p),observed=c.basis==='OBSERVED_INTERPOLATION';return `<tr><td>${p}</td><td>${fmt(c.temperature)}</td><td>${fmt(thermalCurve(selected+1,'upperMetal',p).temperature)}</td><td>${fmt(thermalCurve(selected+1,'thrustMetal',p).temperature)}</td><td>${fmt(thermalCurve(selected+1,'turbineMetal',p).temperature)}</td><td>${observed?'Nội suy mốc nhật ký':'Ước tính ngoài dải mốc'}</td></tr>`;}).join('');
 openModal('U#'+(selected+1)+' · MỐC NHIỆT THEO CHẾ ĐỘ VÀ TẢI','NHIỆT ĐỘ CÂN BẰNG THAM CHIẾU · DEG C',`<p>Nhiệt độ hiện tại được lưu trong mô hình và tiến dần về nhiệt độ cân bằng, không đổi tức thời khi đặt P hoặc đổi chế độ. Môi trường ${settings.ambient} °C; nước vào ${settings.waterIn} °C.</p><h4>Chế độ ngoài phát G · giả định đào tạo</h4><table class="hmi-table"><tr><th>CHẾ ĐỘ</th><th>STATOR V2</th><th>ÔHT</th><th>Ổ ĐỠ</th><th>ÔHTB</th></tr>${rows}</table><h4>Phát G · mốc theo P tại điều kiện tham chiếu</h4><table class="hmi-table"><tr><th>P MW</th><th>STATOR V2</th><th>ÔHT</th><th>Ổ ĐỠ</th><th>ÔHTB</th><th>CĂN CỨ</th></tr>${curveRows}</table><p>Giá trị theo P trong bảng chưa cộng hiệu ứng Q/U hoặc thay đổi nhiệt độ môi trường/nước. Mốc là trung vị các điểm ghi giờ ổn định tải, chưa xác nhận mọi điểm đã cân bằng nhiệt.</p><p><b>Đáp ứng giả định:</b> stator τ ${THERMAL_DYNAMICS.stator} s, lõi thép ${THERMAL_DYNAMICS.core} s, kim loại ổ 600–900 s, dầu ${THERMAL_DYNAMICS.oil} s. Khi dừng, nhiệt được giữ và nguội dần; mất nước làm nóng đúng nhánh. Các τ không phải timer trình tự PLC.</p><p><b>Đối chiếu tag:</b> A1/B1/C1/A2/B2/C2 tạm ánh xạ U1/V1/W1/U2/V2/W2. Các RTD ổ riêng dùng độ lệch nhỏ quanh một giá trị ổ trong nhật ký; vị trí Gió vào/Gió ra cũng cần xác nhận. SC, tải thấp/cao ngoài mẫu và τ là giả định OTS. Không lấy các mốc này làm ngưỡng bảo vệ.</p>`,btn('CLOSE','close-modal'));
}
function vibChannel(label,key,tag,max,unit='μm'){
 const t=readTag(key),p=clamp(Number(t.value)/max*100,0,100);return `<div class="vib-channel"><div class="hmi-panel"><h4>${label}</h4><table class="hmi-table"><tr><td>TAG</td><td>${tag}</td></tr><tr><td>${key==='vibVelocity'?'RMS 01':'SMAX 01'}</td><td>${value(key,selected,2)} ${unit}</td></tr></table></div><div class="bar-meter"><div class="bar-scale">${[max,max*.8,max*.6,max*.4,max*.2,0].map(v=>`<span>${v}</span>`).join('')}</div><div class="tube"><span class="fill" data-meter="${key}" data-max="${max}" style="height:${p}%"></span></div></div></div>`;
}
function vibrationHTML(){return `<div class="page-pad unit-watermark" data-unit="${selected+1}"><div class="vibration-layout"><div class="vib-group"><h3>GENERATOR U#${selected+1}</h3><p style="text-align:center">UPPER SHAFT BEARING</p><div class="vib-upper">${vibChannel('VIBRATION VELOCITY','vibVelocity',(selected+1)+'UV',100,'mm/s')}${vibChannel('S-MAX','vibUpper',(selected+1)+'UXD',1000)}</div><div class="vibration-lower"><div>${vibChannel('LOWER SHAFT BEARING / S-MAX','vibLower',(selected+1)+'UXD',1000)}</div><div class="hmi-panel vib-table"><div class="panel-heading">MAIN PARAMETER</div>${signal('(A)','current','A',0)}${signal('(AB)','kv','kV',2)}${signal('ACTIVE POWER','p','MW')}${signal('REACTIVE POWER','q','MVAr')}${signal('POWER FACTOR','pf','COS φ',2)}${signal('TURBINE SPEED','rpm','RPM',0)}</div></div></div><div class="vib-group"><h3>TURBINE U#${selected+1}</h3><p style="text-align:center">UPPER SHAFT BEARING</p><div class="vib-upper">${vibChannel('CH1 S-MAX','vibT1',(selected+1)+'UXD1',1000)}${vibChannel('CH2 S-MAX','vibT2',(selected+1)+'UXD2',1000)}</div><div class="hmi-panel" style="margin-top:22px;max-width:350px;margin-left:auto"><div class="panel-heading">EXCITOR</div>${signal('EXCITATION VOLTAGE','excV','V')}${signal('EXCITATION CURRENT','excI','A',0)}</div></div></div>${referenceNote('mm/s và μm là hai đại lượng riêng. Thang đo tham chiếu HMI, không dùng làm ngưỡng cảnh báo hoặc chỉnh định bảo vệ.')}</div>`;}
function diagnosticsHTML(){
 const st=s(),bank=(rack,row,type,n=8)=>`<div class="module-bank">${Array.from({length:n},(_,j)=>{const k=`R${rack}-${row}-M${j+1}`,bad=st.sensorFaults[k];return `<button class="io-module ${bad?'error':st.faults.io?'bad':''}" data-action="module" data-module="${k}" data-type="${type}"><small>M${j+1}</small><span>${type}</span><i></i></button>`;}).join('')}</div>`;
 const normal=(label,on)=>`<div class="signal-row"><span class="normal-chip ${on?'fail':''}">${on?'FAIL':'NORMAL'}</span><strong>${label}</strong></div>`;
 return `<div class="page-pad"><div class="rack-grid"><div class="rack"><div class="rack-title">${selected+1}ULCU1</div><div class="row-actions" style="padding:10px 10px 0;justify-content:center">${btn('SPC800 A','fault','data-fault="spc"',!st.faults.spc)}${btn('SPC800 B','module','data-module="SPC800-B" data-type="SPC800"',true)}</div>${bank(1,11,'AI03')}${bank(1,12,'AI02')}${bank(1,13,'DI01',7)}</div><div class="rack"><div class="rack-title">${selected+1}ULCU2</div><div class="row-actions" style="height:46px;justify-content:center">${btn('HNA800 A/B','module','data-module="HNA800" data-type="BUS INTERFACE"')}</div>${bank(2,21,'DO01')}${bank(2,22,'DO01')}${bank(2,23,'DO01')}</div><div class="rack"><div class="rack-title">${selected+1}ULCU3</div><div style="height:58px"></div>${bank(3,31,'DI01',9)}${bank(3,32,'DI01',9)}${bank(3,33,'DI01',9)}</div><div><div class="diagnostic-list">${normal('POWER SUPPLY PS1A/2A FAIL',st.faults.power)}${normal('POWER SUPPLY PS1B/2B FAIL',false)}${normal('HNA 800 A FAIL',false)}${normal('HNA 800 B FAIL',false)}${normal('SPC800 REDUNDANCY FAIL',st.faults.spc)}${normal('SPC800 ETHERNET PORT EN (SYNC) FAIL',false)}${normal('PN800 LINE A FAIL',!plant.network.cnet1)}${normal('PN800 LINE B FAIL',!plant.network.cnet2)}${normal('I/O COMMUNICATION FAILURE',st.faults.io)}</div><div class="diag-legend"><strong>COLOR CODE FOR I/O CARD STATUS</strong><br>${bit(true)} GREEN FIX (DEVICE OK)<br><i class="bit orange"></i> MODULE POWER FAIL<br><i class="bit alarm"></i> RED FIX (DEVICE ERROR)<br><i class="bit yellow"></i> COMMUNICATION FAILURE</div><div class="row-actions">${nav('SYSTEM ARCHITECTURE','architecture')}${btn('TẠO / GỠ LỖI I/O','fault','data-fault="io"')}</div></div></div>${referenceNote('Bố cục rack/module tham chiếu trang Diagnostic. Lỗi từng module là tình huống OTS; chưa gán địa chỉ I/O thực tế khi thiếu bảng mapping.')}</div>`;
}
function architectureHTML(){
 const device=(x,y,w,label,key,kind='network')=>`<g class="network-button" data-action="${kind}" data-key="${key}"><rect class="machine" x="${x}" y="${y}" width="${w}" height="42"/><rect x="${x+8}" y="${y+6}" width="${w-16}" height="24" fill="#527c90"/><text x="${x+w/2}" y="${y-7}" text-anchor="middle">${label}</text><rect class="state-dot" data-network-led="${key}" x="${x+w-6}" y="${y-15}" width="8" height="8" fill="#00ee00"/><path d="M${x+w/2} ${y+42}V${y+62}" class="wire" stroke="#af792f"/></g>`;
 const cabinets=[['U#1','U1LCU'],['U#2','U2LCU'],['GATE HOUSE','GHLCU'],['AUXILIARY','ALLCU'],['SWITCHYARD','SYLCU']];
 return `<div class="page-pad"><svg class="architecture-network" viewBox="0 0 1500 630" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Sơ đồ kiến trúc DCS với mạng ONET, CNET và NTP dự phòng"><path d="M20 160H1470M20 270H1470" stroke="#aa762d" class="wire"/><path d="M20 210H1470" stroke="#bfb538" class="wire"/><path d="M20 325H1470" stroke="#cc0000" class="wire"/><path d="M20 360H1470" stroke="#347cb8" class="wire"/><text x="20" y="153">OPERATION NETWORK · ONET 1/2</text><text x="20" y="203">GPS TIME SYNC NETWORK · NTP</text><text x="20" y="320">CONTROL NETWORK-1 · CNET-1</text><text x="20" y="355">CONTROL NETWORK-2 · CNET-2</text>${device(180,75,100,'OPS1','ops1')}${device(340,75,100,'OPS2','ops2')}${device(700,75,105,'RTUD1 / IEC104','RTUD1','system-device')}${device(910,75,105,'RTUD2 / IEC61850','RTUD2','system-device')}${device(1260,60,130,'GPS MASTER CLOCK','GPS','system-device')}${device(250,240,140,'SPOSRV1','server1')}${device(490,240,140,'SPOSRV2','server2')}${device(790,240,140,'SPESRV1','SPESRV1','system-device')}${device(1250,140,100,'ONET-SW-A','onet1')}${device(1370,140,100,'ONET-SW-B','onet2')}${device(1250,286,100,'CNET-SW-A','cnet1')}${device(1370,286,100,'CNET-SW-B','cnet2')}
 ${cabinets.map(([title,caption],i)=>{const x=20+i*295;return `<g class="network-button" data-action="cabinet" data-unit="${i<2?i:selected}" data-scope="${title}"><rect x="${x}" y="390" width="280" height="210" fill="#424242" stroke="#aaa"/><text x="${x+140}" y="408" text-anchor="middle" style="font-weight:bold">${title}</text><rect class="machine" x="${x+170}" y="428" width="80" height="52"/><rect x="${x+177}" y="435" width="66" height="33" fill="#527c90"/><text class="caption" x="${x+210}" y="490" text-anchor="middle">${i===0?'U1MDU':i===1?'U2MDU':i===2?'OPS3':i===3?'ALMDU':'SYMDU'}</text><path d="M${x+30} 325V520H${x+160}V470M${x+48} 360V540H${x+160}" stroke="#b70000" class="wire"/><path d="M${x+62} 360V552H${x+160}V480" stroke="#347cb8" class="wire"/><rect x="${x+35}" y="510" width="130" height="58" fill="#bbb" stroke="#ddd"/>${Array.from({length:8},(_,j)=>`<rect x="${x+40+j*15}" y="516" width="10" height="36" fill="#222" stroke="#aaa"/><rect x="${x+41+j*15}" y="555" width="7" height="7" fill="#00e800"/>`).join('')}<text x="${x+45}" y="585">SPC800 / I/O · ${caption}</text></g>`;}).join('')}</svg><div class="signal-legend"><span>${bit(true)} ONLINE</span><span><i class="bit alarm"></i> OFFLINE</span><span><i class="bit bad"></i> BQ / UNKNOWN</span><span>Nhấp thiết bị ONET/CNET/OPS/server để xem và tạo lỗi mô phỏng.</span></div>${referenceNote('Topo bố trí tham chiếu trang System Architecture. Một số thiết bị chỉ có chức năng xem thông tin, chưa có mô hình giao thức thực.')}</div>`;
}
const ANN_CODES=[['OIL_LOW','CONTROL OIL PRESSURE LOW'],['COOLING_LOST','COOLING WATER FLOW NOT LOW'],['TEMP_HIGH','BEARING TEMPERATURE HIGH'],['SEQUENCE_TIME_OVER','SEQUENCE STEP TIME OVER'],['LOCKOUT','LOCK OUT RELAY 86 OPERATED'],['PS1A_FAIL','POWER SUPPLY PS1A/2A FAIL'],['SPC_REDUNDANCY','SPC800 REDUNDANCY FAIL'],['IO_FAIL','I/O COMMUNICATION FAILURE'],['A0_LIMIT','A0 SET POINT OUTSIDE LIMIT'],['A0_TRACKING','A0 SET POINT TRACKING DEVIATION']];
function annHTML(){
 if(route.scope==='SWYD')return `<div class="official-page">${officialNavigation(officialContext())}<div class="row-actions">${[1,2,3].map(part=>btn('SWYD ANN '+part+'/3','ann',`data-scope="SWYD" data-part="${part}"`,route.part===part)).join('')}${btn('ALARM SUMMARY · PHIÊN OTS','alarms-all')}</div>${officialDocument('syann'+route.part)}<p class="reference-note">Ô bảo vệ và ACK/RESET trên ảnh là tài liệu lịch sử. Cảnh báo hiện tại của phiên nằm trong ALARM SUMMARY; chưa giả lập toàn bộ rơle đường dây.</p></div>`;
 const scope=route.scope,part=route.part||1,actual=areaAlarms(scope),catalog=scope.startsWith('UNIT')?ANN_CODES:actual.map(a=>[a.code,a.message]);
 const labels=[...catalog,...actual.filter(a=>!catalog.some(v=>v[0]===a.code)).map(a=>[a.code,a.message])];while(labels.length<72)labels.push(['','']);const cells=labels.slice((part-1)*24,part*24);
 return `<div class="page-pad"><div class="ann-grid">${cells.map(([code,label])=>{const a=actual.find(a=>a.code===code&&a.active)||actual.find(a=>a.code===code),state=a?.active?'active':a&&!a.ack?'returned':'';return `<button class="ann-tile ${state} ${a&&!a.ack?'unack':''}" data-action="alarm-detail" data-code="${code}" data-scope="${scope}">${esc(label)||'—'}</button>`;}).join('')}</div><div class="alarm-controls">${btn('SILENCE','silence')}${btn('ACK','ack')}${btn('LAMP TEST','lamp-test')}${btn('ALARM SUMMARY','alarms-scope',`data-scope="${scope}"`)}</div><div class="row-actions">${[1,2,3].map(n=>btn(scope+' ANN ('+n+'/3)','ann',`data-scope="${scope}" data-part="${n}"`,n===part)).join('')}</div>${referenceNote('Bảng Annunciator chứa các tín hiệu đã có trong OTS. Chưa có ma trận biển báo vận hành đầy đủ nên các ô chưa khai báo để trống.')}</div>`;
}
function alarmsHTML(){const a=areaAlarms(route.scope);return `<div class="page-pad"><div class="row-actions">${btn('SILENCE','silence')}${btn('ACK SELECTED AREA','ack')}${btn('ACK ALL','ack-all')}${btn('EVENTS · NHẬT KÝ LÊN/XUỐNG MÁY','events')}${btn('EXPORT CSV','export')}<span>AREA: ${route.scope} · ${a.filter(a=>a.active).length} ACTIVE · ${a.filter(a=>!a.ack).length} UNACK</span></div><div class="alarm-table-container"><table class="hmi-table history-table"><thead><tr><th>TIME</th><th>AREA</th><th>TAG / CODE</th><th>DESCRIPTION</th><th>STATUS</th><th>ACK</th></tr></thead><tbody>${a.map(x=>`<tr class="${x.active?'alarm-row-active':!x.ack?'alarm-row-return':''}"><td>${clock(x.t)}</td><td>${x.area}</td><td>${x.code}</td><td>${esc(x.message)}</td><td>${x.active?'ACTIVE':'RETURNED '+clock(x.clearedAt)}</td><td>${x.ack?'ACK':'UNACK'}</td></tr>`).join('')||'<tr><td colspan="6">NO ALARMS IN SELECTED AREA</td></tr>'}</tbody></table></div><p class="reference-note">Trang này chỉ liệt kê cảnh báo. Bấm EVENTS để xem đầy đủ lệnh, phản hồi và tín hiệu khi lên/xuống máy. SILENCE, ACK, hết nguyên nhân và RESET bảo vệ là các trạng thái riêng.</p></div>`;}
let soePage0425=0,soeType0425='ALL',soeQuery0425='',soeHold0425=false;
function soeFiltered0425(){return eventRows(route.scope).filter(e=>(soeType0425==='ALL'||e.kind===soeType0425)&&(!soeQuery0425||[e.message,e.tag,e.state,e.source,e.kind].join(' ').toLowerCase().includes(soeQuery0425.toLowerCase())));}
function eventsHTML(){
 const all=soeFiltered0425(),size=100,pages=Math.max(1,Math.ceil(all.length/size));soePage0425=Math.min(soePage0425,pages-1);
 const rows=all.slice(soePage0425*size,(soePage0425+1)*size),areas=['ALL','UNIT-1','UNIT-2','AUXILIARY','SWITCHYARD','SYSTEM','GATEWAY'],types=[...new Set(plant.events.map(e=>e.kind))].sort();
 return `<div class="page-pad"><div class="row-actions">${btn('EXPORT SOE CSV','export')}${btn('ALARM SUMMARY','alarms-all')}${btn(soeHold0425?'HOLD · TIẾP TỤC LIVE':'LIVE · GIỮ MÀN HÌNH','soe-hold0425')}<span>SOE · ${all.length} / ${plant.events.length} EVENTS · SIMULATION CLOCK</span></div><div class="row-actions"><label>AREA <select id="soe-area0425">${areas.map(v=>`<option ${route.scope===v?'selected':''}>${v}</option>`).join('')}</select></label><label>TYPE <select id="soe-type0425"><option>ALL</option>${types.map(v=>`<option ${soeType0425===v?'selected':''}>${v}</option>`).join('')}</select></label><label>SEARCH <input id="soe-query0425" class="hmi-input" value="${esc(soeQuery0425)}" placeholder="Tín hiệu, thiết bị hoặc nội dung"></label>${btn('LỌC','soe-apply0425')}${btn('XÓA LỌC','soe-clear0425')}${btn('◀ TRƯỚC','soe-page0425','data-delta="-1"')}<span>PAGE ${soePage0425+1} / ${pages}</span>${btn('SAU ▶','soe-page0425','data-delta="1"')}</div><div class="alarm-table-container" style="max-height:none"><table class="hmi-table history-table"><thead><tr><th>TIME</th><th>AREA</th><th>TAG / CODE</th><th>TYPE</th><th>STATE / QUALITY</th><th>DESCRIPTION</th></tr></thead><tbody>${rows.map(e=>`<tr><td style="white-space:nowrap">${soeTime0425(e.t)}</td><td>${esc(e.area)}</td><td>${esc(e.tag||'—')}</td><td>${esc(e.kind)}</td><td style="color:${e.quality==='BAD'?'#ff00ef':e.state==='ON'?'#ff5555':e.state==='OFF'?'#00ef00':'#ddd'}">${esc(e.state||'—')}${e.quality?' · '+esc(e.quality):''}</td><td>${esc(e.message)}${e.source?` <small>(${esc(e.source)})</small>`:''}</td></tr>`).join('')||'<tr><td colspan="6">Không có sự kiện khớp bộ lọc.</td></tr>'}</tbody></table></div><p class="reference-note">Ghi thay đổi thực trong mô hình: lệnh, phản hồi, DI/điều kiện, trình tự, chế độ và bảo vệ. Không ghi liên tục các dao động analog. Lưu tối đa 5.000 sự kiện mỗi phiên; phân trang xem toàn bộ và xuất CSV theo bộ lọc. Địa chỉ chưa xác minh dùng tiền tố OTS.</p></div>`;
}
function chartSVG(keys,min,max,title,height=140){
 const W=1200,H=height,L=55,R=20,T=15,B=25,w=W-L-R,h=H-T-B,end=Math.max(180,plant.t),start=end-180,rows=s().history.filter(x=>x.t>=start);let out='';
 for(let i=0;i<5;i++){const y=T+h*i/4;out+=`<path d="M${L} ${y}H${W-R}" stroke="#555" stroke-width=".5"/><text x="${L-9}" y="${y+4}" text-anchor="end">${fmt(max-(max-min)*i/4,max-min<2?2:0)}</text>`;}
 for(let i=0;i<7;i++){const x=L+i*w/6;out+=`<path d="M${x} ${T}V${H-B}" stroke="#444" stroke-width=".5"/><text x="${x}" y="${H-5}" text-anchor="middle">${clock(start+i*30)}</text>`;}
 for(const [key,color] of keys){let path='',connected=false;for(const r of rows){if(r.quality==='BAD'||!Number.isFinite(r[key])){connected=false;continue;}const y=T+h-(clamp(r[key],min,max)-min)/(max-min)*h;path+=(connected?'L':'M')+fmt(L+(r.t-start)/180*w,2)+' '+fmt(y,2)+' ';connected=true;}out+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="1.7"/>`;}
 return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">${out}</svg>`;
}
function trendHTML(){return `<div class="page-pad"><div class="row-actions">${btn('EXPORT TREND CSV','export-trend')}<span>U#${selected+1} · TIME WINDOW 180 s · SAMPLE 1 s</span></div>${[['ACTIVE POWER / SET POINT (MW)',[['p','#ffff00'],['pSet','#b6b6b6']],-5,110],['REACTIVE POWER (MVAr)',[['q','#00ff00']],-40,40],['GENERATOR VOLTAGE (kV)',[['kv','#ff00ff']],0,14.5],['TURBINE SPEED (RPM)',[['rpm','#00ddff']],0,Math.max(450,...u().s.history.map(r=>r.rpm||0))*1.05],['THERMAL · STATOR V2 (YELLOW) / CORE 1 (CYAN)',[['tempStator5','#ffff00'],['tempMagnetic1','#00ddff']],10,150],['BEARINGS · UPPER (GREEN) / THRUST (ORANGE) / TURBINE (MAGENTA)',[['tempUpper1','#00ff00'],['tempThrust1','#ffa500'],['tempTurbine3','#ff00ff']],10,130]].map(([title,keys,lo,hi])=>`<div>${title}</div>${chartSVG(keys,lo,hi,title)}`).join('')}<p class="reference-note">Các tag chất lượng BAD hoặc chưa có lịch sử được bỏ trống trên xu hướng. Tất cả số liệu là dữ liệu mô phỏng; nhiệt độ có trạng thái và quán tính nhiệt.</p></div>`;}
function agcHTML(){
 const st=s(),a=st.agc;return `<div class="page-pad unit-watermark" data-unit="${selected+1}"><div class="row-actions">${btn('AGC MODE '+(a.on?'ON':'OFF'),'agc-on','',a.on)}${btn('A0 SELECT','agc-select','data-on="1"',a.selected)}${btn('A0 DESELECT','agc-select','data-on="0"')}${btn('43RR-1 '+st.switches.rr1,'switch',`data-key="rr1" data-value="${st.switches.rr1==='AV/DN'?'A0/A3':'AV/DN'}"`,st.switches.rr1==='A0/A3')}${btn('RETURN CONTROL TO A VUONG','agc-return')}</div><div class="agc-grid">${[['ACTIVE POWER','p',a.loP,a.hiP,'MW',st.pSet,'p'],['REACTIVE POWER','q',a.loQ,a.hiQ,'MVAr',st.qSet,'q'],['VOLTAGE','u',a.loU,a.hiU,'kV',st.uSet,'kv']].map(([label,key,lo,hi,unit,active,actual])=>`<div class="agc-panel"><h3>${label} SELECTION</h3><div class="agc-row"><span>HI LIMIT</span><span class="hmi-value">${hi} ${unit}</span></div><div class="agc-row"><span>LOW LIMIT</span><span class="hmi-value">${lo} ${unit}</span></div><div class="agc-row"><label for="a0-${key}">SP (A0)</label><input class="hmi-input" id="a0-${key}" data-draft="${key}" type="number" step="0.1" value="${esc(a0Draft[selected][key]??a[key])}"></div><div class="agc-row"><span>ACTV.SP</span><span class="hmi-value">${fmt(active,2)}</span></div><div class="agc-row"><span>ACTUAL</span>${value(actual,selected,2)}</div>${btn('A0 SELECT','agc-select','data-on="1"',a.selected)}<span style="margin-left:8px">${a.selected?'SELECTED':'DESELECTED'}</span></div>`).join('')}</div><div class="row-actions">${btn('SEND A0 SET POINT','a0-send')}${btn('43ALR '+st.switches.alr,'switch',`data-key="alr" data-value="${st.switches.alr==='USE'?'NOT USE':'USE'}"`,st.switches.alr==='USE')}${btn('43AQR '+st.switches.aqr,'switch',`data-key="aqr" data-value="${st.switches.aqr==='USE'?'NOT USE':'USE'}"`,st.switches.aqr==='USE')}${btn('43AVR '+st.switches.avr,'switch',`data-key="avr" data-value="${st.switches.avr==='USE'?'NOT USE':'USE'}"`,st.switches.avr==='USE')}</div>${referenceNote('Giới hạn AGC mặc định lấy từ Điều 25 QT.AV.VH.604. Chưa mô hình đầy đủ bộ AVR và đường đặc tính P–Q của máy phát.')}</div>`;
}
function reportHTML(){const goals=lessonGoals(),c=plant.session||setupDraft;return `<div class="page-pad"><div class="panel-heading">OTS 04.25 · KẾT QUẢ PHIÊN · H${selected+1}</div><p>${esc(LESSON_CATALOG[c.lesson][0])} · ${esc(c.operator||'Học viên')} · ${clock(plant.t)} giờ mô phỏng</p><div class="report-goals">${goals.map(([l,on])=>`<div class="goal-tile ${on?'done':''}">${on?'✓':'○'} ${esc(l)}</div>`).join('')}</div><table class="hmi-table"><tr><th>NỘI DUNG</th><th>GIÁ TRỊ</th></tr><tr><td>Hình thức</td><td>${esc({guided:'Có hướng dẫn',practice:'Tự thực hành',exam:'Bài kiểm tra'}[c.method]||c.method)}</td></tr><tr><td>Trạng thái hiện tại</td><td>${esc(s().workingMode)} / ${STAGES[s().stage].en} · ${esc(u().sequence.phase)}</td></tr><tr><td>Lệnh bị từ chối</td><td>${s().rejections} · phục vụ xem lại thao tác, không tự quy thành điểm trừ.</td></tr><tr><td>Căn cứ tốc độ</td><td>${c.speedBasis==='jblock'?'JBLOCK / DI0313 >90%':'Đối chiếu quy trình 95%'}</td></tr><tr><td>Timer và động học</td><td>Timer giám sát: JBLOCK · Động học: bộ tham số đào tạo.</td></tr></table><div class="row-actions">${btn('XUẤT KẾT QUẢ HTML','export-report')}${btn('SOE CSV','export')}${btn('TREND CSV','export-trend')}${btn('LƯU PHIÊN JSON','save-session')}${btn('HOME ĐÀO TẠO','training-home')}</div><div class="ref-notice">Kết quả phản ánh mốc thực hành của mô hình. Các ngưỡng SET_* chưa có giá trị số trong bản in, động học thiết bị, thân CMPT và mapping U2 còn cần xác minh; BS/CH là bài nghiên cứu quy trình.</div>${rejectionReportHTML(u())}<h3>SOE gần nhất</h3><table class="hmi-table"><tr><th>GIỜ</th><th>KHU VỰC</th><th>LOẠI</th><th>NỘI DUNG</th></tr>${plant.events.slice(0,50).map(ev=>`<tr><td>${clock(ev.t)}</td><td>${esc(ev.area)}</td><td>${esc(ev.kind)}</td><td>${esc(ev.message)}</td></tr>`).join('')}</table></div>`;}
function officialContext(){return {plant,selected,btn,nav,value,readout};}
function officialProcessPage(key){return `<div class="official-page">${officialNavigation(officialContext())}<div class="official-live-strip"><b>U#${selected+1} · PHIÊN MÔ PHỎNG</b>${key==='oil'?`${signal('CONTROL OIL','oil','MPa',2)}${signal('GUIDE VANE','gate','%',1)}${signal('INLET VALVE','inlet','%',1)}`:key==='water'?`${signal('INLET VALVE','inlet','%',1)}${signal('BYPASS','bypass','%',1)}${signal('SEAL VALVE','seal','%',1)}${nav('SƠ ĐỒ NKT / BƠM NGUỒN','nkt')}`:`${signal('COMPRESSED AIR','air','kg/cm²',2)}${signal('DRAFT WATER LEVEL','draft','m',2)}${signal('TURBINE SPEED','rpm','RPM',0)}`}</div>${officialDocument(key)}<p class="reference-note">Phần trên đọc trạng thái engine của tổ được chọn. Phần sơ đồ giữ nguyên thiết bị và bố cục HMI chính thức; số đo/BQ trong ảnh là dữ liệu lịch sử. Ảnh WATER/OIL là U#1, dùng để tham chiếu bố trí; chưa xác nhận mapping từng tag H2.</p></div>`;}
function officialServicePage(){const a=plant.service;return `<div class="official-page">${officialNavigation(officialContext())}<div class="official-live-strip"><b>TỰ DÙNG · MÔ HÌNH CHỨC NĂNG</b><span>Nguồn ${a.source===4?'DG':a.source?'ST'+a.source:'NONE'}</span><span>${a.voltage} V · ${esc(a.phase)}</span><span>DG ${plant.diesel?'RUN':'STOP'}</span>${btn('START DG','diesel','data-on="1"')}${btn('STOP DG','diesel','data-on="0"')}</div>${officialDocument('stationservice')}<p class="reference-note">ST1/ST2/ST3/DG, ACB1–8/ACB-BT và phân phối theo ảnh gốc. Chọn nguồn và trễ 3/8 giây vẫn là mô hình chức năng OTS, chưa dựng logic đóng cắt từng ACB.</p></div>`;}
function officialGhPage(){const p=plant.penstock;return `<div class="official-page">${officialNavigation(officialContext())}<div class="official-live-strip"><b>VAN ĐƯỜNG ỐNG · PHIÊN OTS</b>${signal('OPENING','penstock','%',1)}<span>REMOTE ${p.remote?'YES':'NO'} · READINESS ${p.oilOK&&p.remote?'YES':'NO'}</span>${btn('OPEN','penstock','data-target="100"')}${btn('CLOSE','penstock','data-target="0"')}${btn('FORCE VH OPEN','force-vh')}${btn('CANCEL FORCE','clear-force')}</div>${officialDocument('gh')}<p class="reference-note">Cửa nhận nước, đập tràn, valve house theo ảnh GH_EQUIPMENT. Chỉ van đường ống có mô hình thao tác hiện có; các cửa van khác chưa có logic riêng. FORCE tiếp tục xét xác minh/án động theo bài tập.</p></div>`;}
function officialDiagnosticPage(key){const area={auxdiag:'AUXILIARY',sydiag:'SWITCHYARD',gateway:'GATEWAY_GH'}[key],cards=window.__ioReference.hardware_visible_cards.filter(c=>c.area===area);return `<div class="official-page">${officialNavigation(officialContext())}<p class="reference-note">${area==='GATEWAY_GH'?'GHLCU1 thuộc Gate House; tên file DIAG_GATEWAY không xác nhận đây là server IEC104. ':''}Vị trí card được ghi nhận từ ảnh; trạng thái card dưới đây là ảnh chụp 2023, chưa phải tình trạng thiết bị trong phiên OTS.</p>${officialDocument(key)}<h3>VỊ TRÍ CARD ĐÃ ĐỌC · ${cards.length} MODULE</h3><div class="official-racks">${[...new Set(cards.map(c=>c.cabinet+' / '+c.rack))].map(bank=>`<section class="hmi-panel"><h4>${esc(bank)}</h4><div class="official-cards">${cards.filter(c=>c.cabinet+' / '+c.rack===bank).map(c=>`<div><b>${c.module}</b><span>${c.card_label}</span><small>Ảnh: ${c.snapshot_led}</small><small>Kênh: chưa có</small></div>`).join('')}</div></section>`).join('')}</div><p class="reference-note">Màu chẩn đoán trên ảnh: xanh = DEVICE OK; cam = MODULE POWER FAIL (TB3); đỏ = DEVICE HAS AN ERROR; vàng = DEVICE COMMUNICATION FAILURE. Không suy ra địa chỉ terminal/channel từ tên card.</p>${nav('IEC104 / I/O','ioreference')}</div>`;}
let officialIoFilter={peer:'ALL',query:''};
function officialIoPage(){const ref=window.__ioReference,rows=officialIoRows(ref,officialIoFilter);return `<div class="official-page">${officialNavigation(officialContext())}<div class="row-actions"><label>Phiên bản <select id="official-io-peer" class="hmi-input"><option value="ALL">Tất cả phiên bản</option>${[...new Set(ref.points.map(p=>p.variant))].map(v=>`<option ${v===officialIoFilter.peer?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>Tag / IOA / thiết bị <input id="official-io-query" class="hmi-input" value="${esc(officialIoFilter.query)}" placeholder="Ví dụ U1H_CAO, 6001, H1"></label>${btn('TÌM','official-io-filter')}${btn('XÓA LỌC','official-io-clear')}</div><p>${rows.length} / 551 dòng qua các phiên bản · không tương đương 551 I/O vật lý độc lập. A0 và A3 hiệu chỉnh được giữ riêng. Không có điểm nào được xác nhận online.</p><div class="official-io-scroll"><table class="hmi-table"><thead><tr><th>SHEET / HÀNG</th><th>IOA</th><th>TAG</th><th>MÔ TẢ</th><th>THANG KỸ THUẬT</th><th>TYPE ID</th><th>GHI CHÚ NGUỒN</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${esc(p.sheet)} / ${p.row}</td><td>${esc(p.ioa)}</td><td>${esc(p.tag||'CHƯA CÓ')}</td><td>${esc(p.description)}</td><td>${esc(p.eng_min)} … ${esc(p.eng_max)} ${esc(p.unit)}</td><td>${esc(p.type_id)}</td><td>${esc(p.remarks)} ${esc(p.flags.join('; '))}</td></tr>`).join('')}</tbody></table></div><p class="reference-note">Nguồn IEC 104_Datalist Template_Update_22.11.2023.xls. Khóa tra cứu = peer + phiên bản + IOA; cùng IOA giữa bản A3 gốc và hiệu chỉnh có thể khác nghĩa. #N/A là lỗi ô nguồn. Chưa có tag/“chưa cấu hình” giữ nguyên; không gán ra AO/DO hoặc kích hoạt lệnh. Thang truyền thông không thay giới hạn vận hành hay ngưỡng bảo vệ.</p></div>`;}
document.addEventListener('input',event=>{if(event.target.matches('[data-document-zoom]')){const image=event.target.closest('.document-tools').nextElementSibling.querySelector('img');image.style.width=event.target.value+'%';image.style.maxWidth='none';}});

function dynamicContext(){return {...officialContext(),navigation:()=>officialNavigation(officialContext())};}
let equipmentFaceId=null,equipmentDraft=null;
function equipmentReasons(id,target){return plant.equipment.auxDevice(id)?plant.equipment.auxBlockers(id,target):plant.equipment.blockers(id,target);}
function photoReferenceModal(index){
 const ref=window.__dcsPhotoReference;
 if(!Number.isInteger(index)||index<1||index>40)index=ref.photos.find(p=>p.route===route.page)?.index||38;
 const p=ref.photos[index-1];
 const facts=ref.facts.filter(f=>f.photos.includes(index));
 openModal('DCS THỰC TẾ · '+String(index).padStart(2,'0')+'/40','ẢNH NGƯỜI DÙNG GỬI · 29/10/2026',`<div class="photo-actions"><select id="photo-index" aria-label="Chọn ảnh DCS">${ref.photos.map(x=>`<option value="${x.index}" ${x.index===index?'selected':''}>${String(x.index).padStart(2,'0')} · ${esc(x.title)}</option>`).join('')}</select>${btn('XEM','photo-select')}${btn('◀','photo-open',`data-photo="${index===1?40:index-1}"`)}${btn('▶','photo-open',`data-photo="${index===40?1:index+1}"`)}</div><h4>${esc(p.title)}</h4><img class="dcs-source-photo" src="${p.preview}" alt="Ảnh ${index}: ${esc(p.title)}"><p>${esc(p.note)}</p><details class="photo-facts"><summary>Thông tin ghi nhận và các điểm cần đối chiếu</summary>${facts.map(f=>`<p><b>${esc(f.title)}</b><br>${esc(f.text)}</p>`).join('')}</details><small>PV và trạng thái trên ảnh thuộc thời điểm chụp, độc lập với phiên mô phỏng.</small>`,btn('ĐÓNG','close-modal'));
 $('#modal').classList.add('reference-modal');
}
function displayEquipmentId(id){return REAL_SERVICE_LABELS[id]?REAL_SERVICE_LABELS[id]+' ('+id+')':id==='DS273-3'?'DS273-5':id;}
function equipmentFace(id){
 equipmentFaceId=id;equipmentDraft=null;const eq=plant.equipment,a=eq.auxDevice(id),d=eq.get(id),state=a?eq.auxState(id):d;if(!state){toast('Không có thiết bị '+id,true);return;}
 const labels=equipmentActions(id),io=YARD_CB_IO[id];
 openModal(esc(displayEquipmentId(id))+' · DEVICE CONTROL','PHẢN HỒI RIÊNG / SELECT / PERMIT',`<div class="eq-feedback"><strong data-equipment-feedback></strong><p data-equipment-selected></p></div>${gridSpec(id)?.kind==='ES'?'<p class="earth-location"><b>Điểm nối:</b> '+esc(earthLocation(id))+'</p>':''}${id==='DS273-3'?'<p class="reference-note">Ảnh DCS 29/10/2026: DS273-5. Mô hình vẫn đối chiếu khóa DS273-3 của bản in PLC 2023; chưa suy ra thay đổi địa chỉ DI/DO.</p>':''}${ioPanel0411(equipmentPoint0411(id))}<div class="row-actions">${btn('SELECT '+esc(displayEquipmentId(id)),'equipment-select',`data-equipment="${id}"`)}${btn('CANCEL SELECT','equipment-cancel')}</div><div class="cols-2">${[1,0].map(target=>`<div class="hmi-panel"><h4>${labels[target]}</h4><div data-equipment-reasons="${target}"></div>${btn(labels[target]+' '+esc(displayEquipmentId(id)),'equipment-order',`data-equipment="${id}" data-target="${target}"`)}</div>`).join('')}</div><p class="reference-note">Xác nhận chỉ phát lệnh tới ${esc(id)}. Vị trí thay đổi theo phản hồi. CB901/902: mở riêng máy cắt sẽ sa thải, đóng nhanh cánh hướng rồi hồi phục EX; mất hết đường lưới cũng kích hoạt sa thải riêng tổ liên quan trong OTS; nút STOP tại CONTROL PANEL chạy trình tự dừng 5X. Đóng CB tổ máy cần PARALLEL IN / MANUAL và đủ điều kiện hòa.</p>${plant.session?.method!=='exam'&&Object.hasOwn(eq.items,id)?`<details><summary>Tình huống giảng viên</summary><div class="row-actions">${btn('KẸT / KHÔI PHỤC','equipment-fault',`data-equipment="${id}" data-key="failed"`)}${btn('BQ / KHÔI PHỤC','equipment-fault',`data-equipment="${id}" data-key="bad"`)}${btn('READY / NOT READY','equipment-fault',`data-equipment="${id}" data-key="ready"`)}</div></details>`:''}`,btn('ĐÓNG CỬA SỔ','close-modal'));updateEquipmentModal();
}
function updateEquipmentModal(){if(!$('#modal').open)return;const eq=plant.equipment;
 if(equipmentFaceId&&$('[data-equipment-feedback]')){
  const d=eq.get(equipmentFaceId),aux=eq.auxState(equipmentFaceId);
  $('[data-equipment-feedback]').textContent=d?d.bad?'BQ':`${d.value?'CLOSED':'OPEN'} · CMD ${d.target?'CLOSE':'OPEN'} · ${d.moving?'WAIT '+fmt(d.elapsed,1)+' s':'FEEDBACK'}${d.timeout?' · TIMEOUT':''}`:aux?`${aux.bad?'BQ':aux.on?'ON / OPEN':'OFF / CLOSED'} · ${fmt(aux.position,0)} · ${aux.moving?'MOVING':'FEEDBACK'}`:'—';
  $('[data-equipment-selected]').textContent='SELECTED: '+(eq.selected||'NONE');
  for(const target of [1,0]){const a=equipmentReasons(equipmentFaceId,target),box=$(`[data-equipment-reasons="${target}"]`);if(box)box.innerHTML=a.length?a.map(x=>'<p class="eq-blocked">✕ '+esc(x)+'</p>').join(''):'<p class="eq-permit">P · PERMIT ON</p>';const button=$(`[data-action="equipment-order"][data-target="${target}"]`);if(button)button.disabled=a.length>0;}
 }
 if(equipmentDraft&&$('#equipment-confirm-reasons')){const a=equipmentReasons(equipmentDraft.id,equipmentDraft.target);if(equipmentDraft.token!==eq.selectionToken)a.push('SELECT đã thay đổi hoặc hết hạn; chọn lại thiết bị');$('#equipment-confirm-reasons').textContent=a.join('; ')||'PERMIT ON · lệnh riêng '+equipmentDraft.id;$('[data-action="equipment-confirm"]').disabled=a.length>0;}
}
function equipmentOrder(id,target){
 equipmentFaceId=null;equipmentDraft={id,target,token:plant.equipment.selectionToken};const label=equipmentActions(id)[target];
 openModal('XÁC NHẬN '+esc(displayEquipmentId(id)),'LỆNH RIÊNG · '+label,`<p>${label} <strong>${esc(displayEquipmentId(id))}</strong></p><p id="equipment-confirm-reasons"></p><p>Chỉ phát một lệnh cho thiết bị này. CB trạm 1 s, CB tổ máy theo cấu hình bài; DS/ES 5 s. Các thời gian là tham số OTS.</p>`,btn('HỦY','equipment-back',`data-equipment="${id}"`)+btn('XÁC NHẬN '+esc(displayEquipmentId(id)),'equipment-confirm'));updateEquipmentModal();
}

function yardAuthorityModal(){equipmentFaceId=null;equipmentDraft=null;openModal('QUYỀN ĐIỀU KHIỂN TRẠM','143R / 43RR · CHỌN → XÁC NHẬN',`<p>143R: ${plant.equipment.remote?'REMOTE':'LOCAL'} · 43RR: ${esc(plant.equipment.owner)}</p><label>143R <select id="yard-remote"><option value="REMOTE" ${plant.equipment.remote?'selected':''}>REMOTE</option><option value="LOCAL" ${!plant.equipment.remote?'selected':''}>LOCAL</option></select></label><label>43RR <select id="yard-owner">${['A VUONG','DA NANG','A0/A3'].map(v=>`<option ${v===plant.equipment.owner?'selected':''}>${v}</option>`).join('')}</select></label><p>Quyền trạm độc lập với 43RR của từng tổ. Tại OPS, chỉ A VUONG + REMOTE mới cho thao tác thiết bị trạm. Chuyển quyền sẽ CANCEL thiết bị đang chọn.</p>`,btn('HỦY','close-modal')+btn('XÁC NHẬN','yard-authority-apply'));}

const RENDERERS={quickcond:quickStopHTML0422,rejection:rejectionHTML,home:homeHTML,control:controlHTML,cond1:()=>conditionsHTML(1),cond2:()=>conditionsHTML(2),seq1:()=>sequenceHTML(1),seq2:()=>sequenceHTML(2),seq3:()=>sequenceHTML(3),seq5:()=>sequenceHTML(1,true),water:()=>dynamicUnitProcessPage(dynamicContext(),'water'),oil:()=>dynamicUnitProcessPage(dynamicContext(),'oil'),temp:temperatureHTML,vibration:vibrationHTML,unitdiag:diagnosticsHTML,architecture:architectureHTML,ann:annHTML,alarms:alarmsHTML,events:eventsHTML,trend:trendHTML,agc:agcHTML,stationoverview:()=>stationOverviewHTML0410(dynamicContext()),switchyard:()=>dynamicElectricalPage(dynamicContext(),'switchyard'),mainunit:()=>dynamicElectricalPage(dynamicContext(),'mainunit'),stationservice:()=>dynamicServicePage(dynamicContext()),general:()=>dynamicGeneralPage(dynamicContext()),gh:()=>dynamicGhPage(dynamicContext()),air:()=>dynamicUnitProcessPage(dynamicContext(),'air'),gateway:()=>officialDiagnosticPage('gateway'),auxdiag:()=>officialDiagnosticPage('auxdiag'),sydiag:()=>officialDiagnosticPage('sydiag'),stationcontrol:()=>officialStationHTML(officialContext()),nkt:()=>dynamicNktPage(dynamicContext()),ioreference:officialIoPage,report:reportHTML};
const FOOTER=[['U# CONT PANEL','control'],['START COND 1','cond1'],['START COND 2','cond2'],['QUICK STOP COND','quickcond'],['SEQ. MONITOR<br>1X- (1)','seq1'],['SEQ. MONITOR<br>1X- (2)','seq2'],['SEQ. MONITOR<br>1X- (3)','seq3'],['SEQ. MONITOR<br>5X','seq5'],['WATER FLOW SYS','water'],['OIL SUPPLY SYS','oil'],['TEMP MONITOR','temp'],['VIBR MONITOR','vibration'],['OTHER UNIT CONT PANEL','other'],['SY CONT PANEL','stationcontrol']];
let workspaceTabs=[];
function workspaceTabKey(r){return [r.page,UNIT_PAGES.has(r.page)?r.unit:'',r.part||1,r.scope||'ALL'].join(':');}
// MAIN MENU opens a workspace; navigation inside one reuses its current slot.
function nextWorkspaceTabs(tabs,current,next){
 const list=tabs.length?[...tabs]:[{page:'home',unit:next.unit,part:1,scope:'ALL'}];
 if(list.some(r=>workspaceTabKey(r)===workspaceTabKey(next)))return list;
 const slot=list.findIndex(r=>workspaceTabKey(r)===workspaceTabKey(current));
 if(current.page!=='home'&&slot>0)list[slot]={...next};
 else list.push({...next});
 return list;
}
function renderWorkspaceTabs(){
 const host=$('#document-tab');if(!host)return;
 const active=workspaceTabKey(route);
 host.setAttribute('role','tablist');host.setAttribute('aria-label','Các màn hình DCS đang mở');
 host.innerHTML=workspaceTabs.map(r=>{const key=workspaceTabKey(r),label=r.page==='home'?'MAIN_MENU':(UNIT_PAGES.has(r.page)?'H'+(r.unit+1)+' · ':'')+PAGES[r.page][0]+(r.page==='ann'?' · '+r.scope+' '+r.part:'');return `<div class="workspace-tab ${key===active?'active':''}"><button role="tab" aria-selected="${key===active}" data-action="workspace-tab" data-tab-key="${esc(key)}">${esc(label)}</button>${r.page==='home'?'':`<button class="workspace-tab-close" aria-label="Đóng tab ${esc(label)}" data-action="workspace-close" data-tab-key="${esc(key)}">×</button>`}</div>`;}).join('');
}
function activateWorkspaceTab(key){const r=workspaceTabs.find(r=>workspaceTabKey(r)===key);if(r)openPage(r.page,r.unit,r.part,r.scope);}
function closeWorkspaceTab(key){const i=workspaceTabs.findIndex(r=>workspaceTabKey(r)===key);if(i<0||workspaceTabs[i].page==='home')return;const active=workspaceTabKey(route)===key;workspaceTabs.splice(i,1);if(active){const r=workspaceTabs[Math.max(0,i-1)];openPage(r.page,r.unit,r.part,r.scope);}else renderWorkspaceTabs();}
function openPage(page,index=selected,part=1,scope='ALL',record=true){
 if(!RENDERERS[page])return;const previousRoute={...route};selected=clamp(Number(index)||0,0,1);route={page,unit:selected,part:Number(part)||1,scope};
 if(record){navHistory=navHistory.slice(0,navIndex+1);navHistory.push({...route});navIndex=navHistory.length-1;}
 if(['cond1','cond2'].includes(page))achievements[selected].conditions=true;
 if(page==='seq5')achievements[selected].seq5=true;
 if(page==='trend')achievements[selected].trend=true;if(page==='alarms'||page==='ann')achievements[selected].alarms=true;
 if(page==='unitdiag'||page==='architecture')achievements[selected].diag=true;
 document.title='AVC — OTS | '+PAGES[page][1];
 $('#screen-title').textContent=page==='home'?PAGES.home[1]:page==='ann'?scope+' ANNUNCIATOR ('+route.part+'/3)':(UNIT_PAGES.has(page)?'U#'+(selected+1)+' ':'')+PAGES[page][1];
 workspaceTabs=nextWorkspaceTabs(workspaceTabs,previousRoute,route);
 renderWorkspaceTabs();
 $('#location-indicator').textContent=plant.station==='UMDU'?'U'+(selected+1)+'MDU':'CCR';
 $('#unit-footer').hidden=!UNIT_PAGES.has(page);
 $('#unit-footer').innerHTML=FOOTER.map(([label,p])=>btn(label==='U# CONT PANEL'?'U#'+(selected+1)+' CONT PANEL':p==='other'?'U#'+(selected===0?2:1)+' CONT PANEL':label,'nav',`data-page="${p==='other'?'control':p}" data-unit="${p==='other'?1-selected:selected}"`,page===p)).join('');
 $('#page-select').innerHTML=Object.entries(PAGES).map(([key,v])=>`<option value="${key}" ${page===key?'selected':''}>${UNIT_PAGES.has(key)?'U#'+(selected+1)+' ':''}${v[0]}</option>`).join('');
 renderPage();if($('#trainer').classList.contains('open'))renderTrainer();
}
const HMI_FIT_PAGES=new Set(['home','control','cond1','cond2','quickcond','seq1','seq2','seq3','seq5','water','oil','temp','vibration','unitdiag','architecture','ann','agc','stationoverview','switchyard','mainunit','stationservice','gh','air','general','gateway','auxdiag','sydiag','stationcontrol','nkt']);
let hmiFitObserver=null,hmiFitFrame=0;
function hmiFitGeometry(width,height,designWidth=1600,designHeight=780){
 const scale=Math.min(width/designWidth,height/designHeight);
 return {scale,left:(width-designWidth*scale)/2,top:(height-designHeight*scale)/2,width:designWidth*scale,height:designHeight*scale};
}
function fitActiveHmi(){
 const viewport=$('#hmi-viewport'),canvas=$('#hmi-canvas');if(!viewport||!canvas)return;
 const box=viewport.getBoundingClientRect();if(box.width<=0||box.height<=0)return;
 if(['control','home','stationoverview'].includes(route.page)){
  const g=controlFitGeometry049(box.width,box.height);
  canvas.style.width=g.designWidth+'px';canvas.style.height=g.designHeight+'px';
  canvas.style.left='0px';canvas.style.top='0px';canvas.style.transform='scale('+g.scale+')';
  canvas.dataset.fitScale=g.scale.toFixed(4);viewport.dataset.fitted='true';return;
 }
 canvas.style.width='1600px';canvas.style.height='780px';
 const requiredHeight=Math.max(780,Math.ceil(canvas.scrollHeight));canvas.style.height=requiredHeight+'px';
 const g=hmiFitGeometry(box.width,box.height,1600,requiredHeight);
 canvas.style.left=g.left+'px';canvas.style.top=g.top+'px';canvas.style.transform='scale('+g.scale+')';
 canvas.dataset.fitScale=g.scale.toFixed(4);viewport.dataset.fitted='true';
}
function scheduleHmiFit(){
 if(typeof requestAnimationFrame!=='function'){fitActiveHmi();return;}
 cancelAnimationFrame(hmiFitFrame);hmiFitFrame=requestAnimationFrame(fitActiveHmi);
}
if(typeof window.addEventListener==='function')window.addEventListener('resize',scheduleHmiFit);
function renderPage(){
 const root=$('#page-surface'),fit=HMI_FIT_PAGES.has(route.page),top=root.scrollTop,html=RENDERERS[route.page]();
 if(hmiFitObserver)hmiFitObserver.disconnect();root.classList.toggle('fitted-screen',fit);
 root.innerHTML=fit?`<div id="hmi-viewport"><div id="hmi-canvas" data-page="${route.page}">${html}</div></div>`:html;
 root.scrollTop=fit?0:top;root.scrollLeft=0;hideIoTooltip0411();decorateBinaryObjects0411(root);updateBindings();
 if(fit){fitActiveHmi();scheduleHmiFit();if(typeof ResizeObserver==='function'){if(!hmiFitObserver)hmiFitObserver=new ResizeObserver(scheduleHmiFit);hmiFitObserver.observe($('#hmi-viewport'));}}
}

function toast(message,error=false){const node=$('#toast');node.textContent=message;node.classList.toggle('error',error);node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),5500);}
function feedback(result){toast(result.message,!result.ok);renderPage();updateTrainerProgress();}
function openModal(title,subtitle,body,actions=''){
 hideIoTooltip0411();ioFace0411=null;permitKey=null;const d=$('#modal');d.classList.remove('reference-modal','capability-modal');$('#modal-content').innerHTML=`<div class="modal-head"><h3>${title}</h3><button data-action="close-modal" aria-label="Đóng">×</button></div><div class="modal-subtitle">${subtitle}</div><div class="modal-body">${body}</div>${actions?`<div class="modal-actions">${actions}</div>`:''}`;if(!d.open)d.showModal();
}
function closeModal(){$('#modal').close();equipmentFaceId=null;equipmentDraft=null;modalKey=null;pendingSelector=null;permitKey=null;}
function selectorCurrent(unit,kind,key){return kind==='switch'?unit.s.switches[key]:kind==='mode'?unit.s.mode:kind==='avr'?unit.s.avr:key==='network'?(unit.s.breaker?'NETWORK':'ISOLATED'):unit.s.govMode;}
function selectorModal(kind,key,value){
 const current=selectorCurrent(u(),kind,key);
 pendingSelector={kind,key,value:value||current,unit:selected};renderSelectorModal();
}
function renderSelectorModal(){
 const p=pendingSelector;if(!p)return;const unit=plant.units[p.unit],current=selectorCurrent(unit,p.kind,p.key);
 const name=p.kind==='switch'?SELECTOR_NAMES[p.key]:p.kind==='mode'?'43R':p.kind==='avr'?'43-90 · AVR MODE':'GOV MODE';
 const values=p.kind==='switch'?SELECTOR_OPTIONS[p.key]:p.kind==='mode'?['REMOTE','LOCAL AUTO','TEST']:p.kind==='avr'?['AUTO','MANUAL']:p.key==='network'?['NETWORK','ISOLATED']:['LOAD','OPENING','FREQUENCY'];
 const requirements=p.kind==='switch'&&values.includes('USE')?regulatorRequirements(unit,p.key):[];
 openModal(name+' · CHỌN CHẾ ĐỘ','U#'+(p.unit+1)+' · CHỌN → XÁC NHẬN',`<div class="selector-current">TRẠNG THÁI HIỆN TẠI <b data-selector-current>${esc(current)}</b></div><div class="selector-choices">${values.map(v=>btn(v,'selector-choice',`data-value="${v}" aria-pressed="${p.value===v}"`,p.value===v)).join('')}</div><p class="selector-instruction">Chọn chế độ, sau đó nhấn XÁC NHẬN. HỦY giữ trạng thái hiện tại.</p>${requirements.length?`<table class="hmi-table selector-interlocks"><tr><th>ĐIỀU KIỆN DUY TRÌ USE</th><th>TRẠNG THÁI</th></tr>${requirements.map((r,i)=>`<tr><td>${esc(r.label)}<small>${esc(r.tag)} · ${esc(r.source)}</small></td><td data-selector-permissive="${i}">${r.ok?'ĐẠT':'CHƯA ĐẠT'}</td></tr>`).join('')}</table>`:''}${p.key==='jlr'||p.key==='jqr'?'<p class="source-ref">SH72/73 có chốt chọn. Nhánh phân phối chung SH74 được ghi “Không dùng” trong JBLOCK Rev.G nhưng còn trong bản in PLC 23/11/2023; phân phối chung trong OTS cần xác minh cấu hình thực nạp.</p>':''}<div id="modal-error" class="modal-error" role="alert"></div>`,btn('HỦY','close-modal')+btn('XÁC NHẬN','confirm-selector','id="confirm-selector"',true));updateSelectorModal();
}
function updateSelectorModal(){
 const p=pendingSelector;if(!p||!$('#modal').open||!$('#confirm-selector'))return;
 const unit=plant.units[p.unit],current=selectorCurrent(unit,p.kind,p.key);
 const a=unit.selectorBlockers(p.kind,p.key,p.value),same=p.value===current;
 $('[data-selector-current]').textContent=current;
 $$('[data-action="selector-choice"]').forEach(e=>{e.classList.toggle('selected',e.dataset.value===p.value);e.setAttribute('aria-pressed',String(e.dataset.value===p.value));});
 const rows=p.kind==='switch'?regulatorRequirements(unit,p.key):[];$$('[data-selector-permissive]').forEach(e=>{const r=rows[Number(e.dataset.selectorPermissive)];if(r){e.textContent=r.ok?'ĐẠT':'CHƯA ĐẠT';e.classList.toggle('not-ready',!r.ok);}});
 $('#confirm-selector').disabled=same||a.length>0;$('#modal-error').textContent=a.length?a.join('; '):same?'Chọn trạng thái khác để xác nhận.':'';
}
function authorityModal(){
 const st=s();openModal('CONTROL AUTHORITY / 43 SELECTORS','U#'+(selected+1)+' · mô phỏng phân quyền',`<table class="hmi-table"><tr><th>TRẠM ĐANG XEM</th><td><select id="station-select" class="hmi-input">${['OPS1','OPS2','U1MDU','U2MDU'].map(v=>`<option ${v===(plant.station==='UMDU'?'U'+(plant.localUnit||selected+1)+'MDU':plant.station)?'selected':''}>${v}</option>`).join('')}</select></td></tr><tr><th>VAI TRÒ BÀI TẬP</th><td><select id="role-select" class="hmi-input">${['AVGuest','AVOperator','AVSupervisor'].map(v=>`<option ${v===plant.role?'selected':''}>${v}</option>`).join('')}</select></td></tr><tr><th>OPS GIỮ QUYỀN</th><td>${plant.activeOps} ${btn('CHANGE OPS1 ⇄ OPS2','handover')}</td></tr>${[['TAC REMOTE/LOCAL','tac',['REMOTE','LOCAL']],['EMC AUTO/MANUAL','emc',['AUTO','MANUAL']],['EXCITATION +ER','er',['REMOTE','LOCAL']]].map(([label,k,vals])=>`<tr><th>${label}</th><td>${vals.map(v=>btn(v,'switch',`data-key="${k}" data-value="${v}"`,st.switches[k]===v)).join(' ')}</td></tr>`).join('')}</table><p>${esc(u().controlBlockers().join('; ')||'CONTROL AVAILABLE')}</p>`,btn('CLOSE','close-modal'));
}
const EDITS={manualP:['7-65P · MANUAL LOAD CONTROL','MW',0,105,.5],p:['ACTIVE POWER / ALR SET POINT','MW',10,105,.5],q:['REACTIVE POWER / AQR SET POINT','MVAr',-35,35,.5],u:['7-90R · GENERATOR VOLTAGE SET POINT','kV',13.6,14.2,.01],e:['7-70E · EXCITATION VOLTAGE','V',60,180,1],f:['7-65F · FREQUENCY CONTROL','Hz',47.5,52.5,.05],gate:['7-77 · GUIDE VANE LIMIT','%',10,100,1],pHi:['MAX POWER','MW',10,105,1],pLo:['MIN POWER','MW',0,105,1],air:['SC AIR PRESSURE','kg/cm²',0,10,.1],jointP:['JOINT ACTIVE POWER SET POINT','MW',20,210,1],jointQ:['JOINT REACTIVE POWER SET POINT','MVAr',-70,70,1]};
const editCurrent=key=>({manualP:s().pSet,p:s().pSet,q:s().qSet,u:s().uSet,e:s().excV,f:s().fSet,gate:s().gateLimit,pHi:s().pHi,pLo:s().pLo,air:s().air,jointP:plant.units.reduce((t,v)=>t+(v.s.breaker?v.s.pSet:0),0),jointQ:plant.units.reduce((t,v)=>t+(v.s.breaker?v.s.qSet:0),0)}[key]);
function editModal(key){if(!EDITS[key])return;const permission=controlPermission(u(),key);if(!permission.allowed){permitModal(key);return;}if(key==='manualP'){manualPowerModal();return;}modalKey=key;let [title,unit,lo,hi,step]=EDITS[key];if(key==='p'){lo=s().pLo;hi=s().pHi;}openModal(title,'U#'+(selected+1)+' · SET POINT · PERMIT ON',`<label for="edit-input">NEW VALUE (${unit})</label><div class="modal-field">${btn('−','edit-nudge','data-delta="-1"')}<input id="edit-input" class="hmi-input" type="number" min="${lo}" max="${hi}" step="${step}" value="${fmt(editCurrent(key),key==='u'||key==='f'?2:1)}">${btn('+','edit-nudge','data-delta="1"')}</div><p>LIMIT: ${lo} … ${hi} ${unit}</p><div id="modal-error" class="modal-error" role="alert"></div>`,btn('CANCEL','close-modal')+btn('ACTION','apply-edit','',true));$('#edit-input').focus();$('#edit-input').select();}
function permitModal(key){
 if(!EDITS[key])return;const permission=controlPermission(u(),key);
 openModal('P · PERMIT · '+EDITS[key][0],'U#'+(selected+1)+' · QUYỀN ĐIỀU KHIỂN',`<div class="permit-summary ${permission.allowed?'allowed':''}" data-permit-summary></div><div data-permit-reasons></div><p>${key==='manualP'?'Khi P xanh, bấm vào ô 7-65P để mở Raise/Lower hoặc dùng trực tiếp nút +/−.':'Khi P xanh, bấm vào ô giá trị để nhập số, sau đó nhấn ACTION.'}</p><p>Nút P báo quyền điều khiển theo liên động; bấm P không làm đổi giá trị đặt.</p>`,btn(key==='manualP'?'RAISE / LOWER':'NHẬP GIÁ TRỊ','permit-edit',`data-key="${key}" data-edit-control="${key}"`)+btn('ĐÓNG','close-modal'));
 permitKey=key;updateControlPermissions();
}
function updateControlPermissions(){
 const permissions=new Map(),get=key=>{if(!permissions.has(key))permissions.set(key,controlPermission(u(),key));return permissions.get(key);};
 $$('[data-edit-control]').forEach(e=>{const p=get(e.dataset.editControl);e.disabled=!p.allowed;e.title=p.allowed?'PERMIT ON':p.reasons.join('; ');});
 $$('[data-permit-key]').forEach(e=>{const p=get(e.dataset.permitKey);e.classList.toggle('permit-on',p.allowed);e.dataset.permitted=String(p.allowed);e.title=p.allowed?'PERMIT ON · Được phép điều khiển':('PERMIT OFF · '+p.reasons.join('; '));});
 $$('[data-control-input]').forEach(e=>{const p=get(e.dataset.controlInput);e.classList.toggle('permitted',p.allowed);e.dataset.permitted=String(p.allowed);e.title=p.allowed?(p.interaction==='raise-lower'?'Bấm để mở 7-65P Raise / Lower':'Bấm vào ô số để nhập giá trị đặt'):'Chưa được phép điều khiển: '+p.reasons.join('; ');});
 if(permitKey&&$('#modal').open&&$('[data-permit-summary]')){const p=get(permitKey),summary=$('[data-permit-summary]');summary.classList.toggle('allowed',p.allowed);summary.textContent=p.allowed?'PERMIT ON · ĐƯỢC PHÉP ĐIỀU KHIỂN':'PERMIT OFF · CHƯA ĐƯỢC PHÉP ĐIỀU KHIỂN';const n=$('[data-permit-reasons]'),html=p.allowed?'<p>Quyền thao tác và liên động hiện tại đã đạt.</p>':'<ul>'+p.reasons.map(r=>'<li>'+esc(r)+'</li>').join('')+'</ul>';if(n.innerHTML!==html)n.innerHTML=html;}
}
function manualPowerModal(){openModal('7-65P · RAISE / LOWER','U#'+(selected+1)+' · ĐIỀU CHỈNH BẰNG TAY',`<p>43ALR: <strong data-manual-alr>${s().switches.alr}</strong>. Tăng/giảm từng nấc 0,5 MW khi đủ liên động; không nhập trực tiếp công suất tại 7-65P.</p><div class="manual-load-reference">LOAD REFERENCE <b data-manual-reference>${fmt(s().pSet,1)} MW</b></div><div class="selector-choices">${btn('− LOWER','manual-nudge','data-delta="-1" data-edit-control="manualP"')}${btn('+ RAISE','manual-nudge','data-delta="1" data-edit-control="manualP"')}</div><p data-manual-blockers>${esc(u().setpointBlockers('manualP').join('; '))}</p><p class="source-ref">JBLOCK SH62: nút Raise/Lower; nhánh điều khiển tay xét 43ALR NOT USE. Giá trị nấc 0,5 MW là tham số đào tạo.</p>`,btn('CLOSE','close-modal'));updateBindings();}
function applyEdit(key,val){
 const st=s();if(!Number.isFinite(val))return u().reject('Giá trị không hợp lệ.');const [,unit,lo,hi]=EDITS[key];if(val<lo||val>hi)return u().reject('Giá trị phải trong '+lo+'…'+hi+' '+unit+'.');
 if(key==='manualP')return u().manualPower(val);
 if(['p','q','u'].includes(key))return u().setpoint(key,val);
 if(key==='jointP'||key==='jointQ')return u().jointSetpoint(key==='jointP'?'p':'q',val);
 const blockers=u().setpointBlockers(key);if(blockers.length)return u().reject(blockers.join('; '));
 if(key!=='air'&&u().controlBlockers().length)return u().reject(u().controlBlockers().join('; '));
 if(key==='e'&&st.avr!=='MANUAL')return u().reject('7-70E chỉ nhận trong bài AVR MANUAL.');
 if(key==='f'&&st.breaker)return u().reject('Tổ máy đã nối lưới; tần số theo lưới. Điều chỉnh tải bằng 7-65P.');
 if(key==='pHi'&&val<st.pLo||key==='pLo'&&val>st.pHi)return u().reject('MIN POWER không được vượt MAX POWER.');
 st[{e:'excV',f:'fSet',gate:'gateLimit',pHi:'pHi',pLo:'pLo',air:'air'}[key]]=val;u().log('COMMAND',key+' SET POINT = '+val);return u().result('Đã nhận giá trị đặt '+key+'.');
}
function stageModal(n){const st=s();openModal('UNIT No.'+(selected+1)+' · '+STAGES[n].en,'STEP SELECTOR 43S-CS',`<p>CURRENT STATUS: <strong>${st.workingMode} / ${STAGES[st.stage].en}</strong></p><p>${n===0?'Thực hiện trình tự dừng bình thường 5X.':n===7?'Chuyển sang chế độ bù SC khi đủ điều kiện khí nén và phối hợp tổ còn lại.':'Chạy tự động đến bước '+STAGES[n].en+' theo phản hồi mô hình.'}</p><p>${esc(u().blockers().join('; ')||'CONTROL / START PERMISSIVES AVAILABLE')}</p><div id="modal-error" class="modal-error" role="alert"></div>`,btn('CANCEL','close-modal')+btn('ACTION','confirm-stage',`data-stage="${n}"`,true));}
function tagModal(key,index=selected){const io=officialSignalReference(window.__ioReference,key,index);const t=readTag(key,index),heat=thermalTagInfo(plant.units[index].s,index+1,key);openModal(t.tag,'TAG FACEPLATE · OTS INPUT',`<div class="tag-faceplate"><div class="signal-row"><strong>VALUE</strong>${value(key,index,3)}</div><div class="signal-row"><strong>QUALITY</strong>${t.quality}</div><div class="signal-row"><strong>FORCED</strong>${t.forced?'YES':'NO'}</div><div class="signal-row"><strong>PLANT TIME</strong>${clock(t.stamp)}</div><div class="signal-row"><strong>LAST GOOD</strong>${t.lastGood===undefined?'—':fmt(t.lastGood,3)+' @ '+clock(t.lastGoodAt)}</div>${heat?`<div class="thermal-faceplate" data-thermal-face-key="${key}" data-unit="${index}"><div class="signal-row"><strong>TARGET / CÂN BẰNG</strong><span data-thermal-target>${fmt(heat.target)} °C</span></div><div class="signal-row"><strong>CHẾ ĐỘ</strong><span data-thermal-face-mode>${esc(heat.mode)}</span></div><div class="signal-row"><strong>τ HIỆN TẠI (OTS)</strong><span data-thermal-tau>${fmt(heat.tau,0)} s</span></div><p>Nguồn mốc G: ${esc(heat.label)}. Khoảng P có mốc: ${fmt(heat.range[0])}–${fmt(heat.range[1])} MW. ${heat.individualEstimate?'RTD riêng được mô phỏng quanh giá trị ổ tổng hợp. ':''}SC, quá độ, nhiệt ngoài khoảng mẫu và τ là giả định đào tạo.</p></div>`:''}${io?`<table class="hmi-table"><tr><th>THAM CHIẾU IEC104 · A0</th><td>${esc(io.tag)}</td></tr><tr><th>IOA / NGUỒN</th><td>${io.ioa} · ${esc(io.sheet)} · hàng ${io.row}</td></tr><tr><th>THANG TRUYỀN THÔNG</th><td>${io.eng_min} … ${io.eng_max} ${esc(io.unit)}</td></tr></table><p>Ánh xạ tham chiếu theo mô tả tín hiệu; chưa xác nhận online/terminal/card. Đơn vị Q nguồn ghi MVA, mô hình hiển thị MVAr; cần đối chiếu. Thang nguồn không thay giới hạn bài tập.</p>`:''}<p class="faceplate-explain">Tag mô phỏng; địa chỉ card/channel ABB chưa xác nhận. Lỗi kênh chỉ ảnh hưởng chất lượng tag này; không làm thay đổi nhiệt độ vật lý trong mô hình.</p></div>`,btn(t.quality==='BAD'&&plant.units[index].s.sensorFaults[key]?'RESTORE SENSOR':'SIMULATE SENSOR FAIL','sensor-fault',`data-tag="${key}" data-unit="${index}"`)+(heat?btn('MỐC NHIỆT','thermal-model'):'')+btn('CLOSE','close-modal'));}
function referenceModal(n){
 if(n===undefined&&(window.__officialAssets[route.page]||route.page==='ann'&&route.scope==='SWYD')){openModal('HMI GỐC','TÀI LIỆU 2023 · KHÔNG PHẢI TRẠNG THÁI PHIÊN',officialDocument(route.page==='ann'?'syann'+route.part:route.page),btn('CLOSE','close-modal'));return;}
 n=n||PAGES[route.page]?.[2]||4;
 const names={4:'MAIN MENU',5:'CONTROL PANEL',6:'START CONDITION 1',7:'START CONDITION 2',8:'1X (1/3)',9:'1X (2/3)',10:'1X (3/3)',11:'5X',12:'WATER FLOW',13:'OIL SUPPLY',14:'TEMPERATURE',15:'VIBRATION',16:'DIAGNOSTIC',17:'SYSTEM ARCHITECTURE'};
 openModal('DCS HMI SCREENS · '+names[n],'4JSG000002P4833 · Rev.A · 07-Nov-2023',`<div class="ref-selectors">${Object.entries(names).map(([id,label])=>btn(label,'reference-page',`data-ref="${id}"`,Number(id)===n)).join('')}</div><img class="ref-image" src="${window.__hmiRefs[n]}" alt="Màn hình DCS gốc ${names[n]}"><p class="source-ref">Ảnh HMI gốc giữ nguyên. Giá trị trên ảnh là giá trị chụp trong hồ sơ, không được coi là định mức hoặc chỉnh định thiết bị.</p>`,btn('CLOSE','close-modal'));$('#modal').classList.add('reference-modal');
}
function updateBindings(){
 for(const el of $$('[data-drain-pump]')){const name=el.dataset.drainPump,d=drainPumpState(plant,name);el.setAttribute('fill',d.bad?'#ff00ff':d.on?'#ff0000':'#00df00');const info=name+' · '+(d.bad?'BQ':d.on?'RUN':'STOP')+' · OTS 60 s chạy / 120 s nghỉ · luân phiên 1/2';el.setAttribute('aria-label',info);el.setAttribute('role','img');let title=el.querySelector('title');if(!title){title=document.createElementNS('http://www.w3.org/2000/svg','title');el.appendChild(title);}title.textContent=info;}

 updateCapabilityCurve();refreshEquipmentLabels0418();
 for(const el of $$('[data-water-flow]')){const [i,key]=el.dataset.waterFlow.split(':');const u=plant.units[+i];el.setAttribute('fill',!u.qualityGood||u.s.signalQuality?.[key]==='BAD'?'#f0f':u.s[key]?'#ff0000':'#00df00');}
 const gridFrame=updateDynamicScreens(document,plant);updateRealityScreens(document,plant,gridFrame);updateScreens0410();updateEquipmentModal();
 const live=officialLiveState(plant);$$('[data-official-state]').forEach(e=>e.textContent=live[e.dataset.officialState]??'—');$$('[data-official-cb]').forEach(e=>{const unit=plant.units[Number(e.dataset.officialCb)];e.setAttribute('fill',!unit.qualityGood?'#ff00ff':unit.s.breaker?'#ff0000':'#00dd00');});
 document.body.classList.toggle('paused',paused);const st=s(),quality=u().qualityGood;
 if(route.page==='stationcontrol')$$('#page-surface [data-action="switch"],#page-surface [data-action="mode"]').forEach(e=>{const on=e.dataset.action==='mode'?st.mode===e.dataset.value:st.switches[e.dataset.key]===e.dataset.value;e.classList.toggle('selected',on&&quality);e.classList.toggle('bad-quality',!quality);});
 $$('[data-selector-key]').forEach(e=>{const key=e.dataset.selectorKey,on=st.switches[key]==='USE';e.classList.toggle('selected',on&&quality);e.classList.toggle('bad-quality',!quality);e.setAttribute('aria-pressed',String(on&&quality));e.title=SELECTOR_NAMES[key]+': '+(quality?st.switches[key]:'BQ');});
 if($('[data-manual-reference]')){$('[data-manual-reference]').textContent=fmt(st.pSet,1)+' MW';$('[data-manual-alr]').textContent=st.switches.alr;$('[data-manual-blockers]').textContent=u().setpointBlockers('manualP').join('; ');}
 if(modalKey&&$('#edit-input')&&$('#modal').open){const a=u().setpointBlockers(modalKey);$('[data-action="apply-edit"]').disabled=a.length>0;if(a.length)$('#modal-error').textContent=a.join('; ');}
 updateSelectorModal();
 $$('[data-tag]').forEach(e=>{if(!e.classList.contains('hmi-value'))return;const t=readTag(e.dataset.tag,Number(e.dataset.unit??selected));e.textContent=t.quality==='BAD'?'BQ':fmt(t.value,Number(e.dataset.dec??1));e.classList.toggle('bad',t.quality==='BAD');e.title=t.tag+' · '+t.quality+(t.forced?' · FORCED':'');});
 updateControlPermissions();
 $$('[data-thermal-mode]').forEach(e=>e.textContent=THERMAL_MODES[st.thermal.mode]);$$('[data-thermal-band]').forEach(e=>e.textContent=st.thermal.band);
 $$('[data-thermal-face-key]').forEach(e=>{const info=thermalTagInfo(plant.units[Number(e.dataset.unit)].s,Number(e.dataset.unit)+1,e.dataset.thermalFaceKey);if(info){$('[data-thermal-target]',e).textContent=fmt(info.target)+' °C';$('[data-thermal-face-mode]',e).textContent=info.mode;$('[data-thermal-tau]',e).textContent=fmt(info.tau,0)+' s';}});
 $$('[data-stage-light]').forEach(e=>{const n=e.dataset.stageLight;const active=st.stopping?[6,5,4,3,2,1][st.stopStep]:st.stage,pending=!st.lockout&&Number(n)===active&&(st.stopping||!st.stageDone&&st.stage>0);const on=quality&&(!!st.lamp[n]||pending);e.classList.toggle('on',on);e.classList.toggle('flashing',quality&&pending);});
 $$('[data-relay]').forEach(e=>e.classList.toggle('on',quality&&e.dataset.relay===(st.stopping||st.stage===0||st.lockout?'5X':'1X')));
 $$('[data-state-field]').forEach(e=>{e.textContent=quality?(st[e.dataset.stateField]?'ON / RUN':'OFF / STOP'):'BQ';e.style.color=binaryColor0411(st[e.dataset.stateField],quality?'GOOD':'BAD');});
 
 
 
 $$('[data-sequence-node]').forEach(e=>{const vm=sequenceDisplay(u(),e.dataset.sequenceNode),n=Number(e.dataset.stage),context=e.dataset.sequenceContext;let state=vm.states[n]||'idle';if(context==='line-charge')state='idle';if(context==='sc-return'&&!st.scReturning)state=n===7&&u().completed.sc?'complete':n===6&&st.stage===6&&st.events.some(v=>v.message.includes('SC→G hoàn thành'))?'complete':'idle';if(context==='sc-start'&&st.scReturning)state=n===7&&u().completed.sc?'complete':'idle';e.classList.toggle('seq-running',quality&&state==='running');e.classList.toggle('seq-complete',quality&&state==='complete');e.classList.toggle('seq-bad',!quality);e.classList.toggle('seq-timeout',quality&&vm.timeout&&state==='running');e.dataset.sequenceState=quality?state:'bad';});
 $$('[data-meter]').forEach(e=>{const t=readTag(e.dataset.meter);e.style.height=t.quality==='BAD'?'100%':clamp(t.value/Number(e.dataset.max)*100,0,100)+'%';e.style.background=t.quality==='BAD'?'repeating-linear-gradient(45deg,#ff00ef 0,#ff00ef 3px,#bbb 3px,#bbb 8px)':'#00e900';});
 $$('[data-network-led]').forEach(e=>{const k=e.dataset.networkLed;e.setAttribute('fill',Object.hasOwn(plant.network,k)?plant.network[k]?'#00ef00':'#ff0000':'#ff00ef');});
 const direction=route.page==='seq5'?'stop':'start',seqView=sequenceDisplay(u(),direction);
 if($('[data-timer-value]'))$('[data-timer-value]').textContent=seqView.matching?fmt(seqView.elapsed,1)+' s':'—';
 if($('[data-timer-status]'))$('[data-timer-status]').textContent=seqView.timeout?'SEQUENCE STEP TIME OVER':seqView.running?'SEQUENCE MONITOR':seqView.done?'SEQUENCE COMPLETE':'CHƯA CÓ LỆNH '+(direction==='stop'?'5X':'1X');
 if($('[data-usm-value]'))$('[data-usm-value]').textContent=st.switches.usm;
 const all=plant.allAlarms,active=all.filter(a=>a.active),unack=all.filter(a=>!a.ack),latest=unack[0]||active[0];
 $('#alarm-total').textContent=active.length;$('#alarm-badge').classList.toggle('alert',active.length>0);$('#alarm-date').textContent=latest?dateTime(latest.t):dateTime(plant.t);$('#alarm-latest').textContent=latest?latest.area+'   '+latest.code+'   '+latest.message:'NO UNACKNOWLEDGED ALARMS';$('#alarm-priority').textContent=latest?.priority||'';
 AREAS.forEach(area=>{const e=$(`[data-area-counter="${area}"]`);if(!e)return;const list=areaAlarms(area),count=list.filter(a=>a.active).length;e.textContent=count||'−';e.classList.toggle('active',count>0);e.classList.toggle('unack',list.some(a=>a.active&&!a.ack));});
 $('#status-operator').textContent=(plant.station==='UMDU'?'U'+(plant.localUnit||selected+1)+'MDU':plant.station)+'\\'+plant.role;$('#status-server').textContent=plant.network.server1?'SPOSRV1':plant.network.server2?'SPOSRV2':'SERVER OFFLINE';$('#sim-clock').textContent=clock(plant.t);$('#wall-clock').textContent=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());
 $('#pause-button').textContent=paused?'▶':'Ⅱ';$('#speed-button').textContent=speed+'×';updateCoach();updateControlPanel049();updateBinaryScreens0411();
}
function lessonGoals(){
 const st=s(),a=achievements[selected],l=plant.session?.lesson||u().scenario;let rows;
 if(['startup','blocked','prep'].includes(l))rows=[['Kiểm tra điều kiện khởi động',a.conditions],['Thao tác LOAD → ACTION',a.load],['92P xác lập và P đạt 10 MW',u().completed.load&&st.p>=10]];
 else if(l==='stop')rows=[['Thao tác STOP → ACTION',plant.events.some(e=>e.area==='UNIT-'+(selected+1)&&e.kind==='COMMAND'&&e.message.startsWith('STOP'))],['Theo dõi trình tự 5X',a.seq5],['Dừng hoàn toàn, phụ trợ dừng và phanh nhả',st.stopComplete&&st.rpm<.1&&!st.coolingPump&&!st.lift&&!st.mBrake&&!st.eBrake]];
 else if(l==='sc_start')rows=[['Kiểm tra điều kiện và khí nén',a.conditions||a.air],['Thao tác SYNCHRO COND → ACTION',a.scCommand],['Đạt SC và điều chỉnh Q',u().completed.sc&&(a.q||a.scQ)]];
 else if(l==='sc')rows=[['Đạt SYNCHRO COND',u().completed.sc],['Đặt Q trong SC',a.scQ],['Chuyển SC → G giữ máy cắt',a.scReturned]];
 else if(l==='steady')rows=[['Đặt công suất P',a.p||a.manualP],['Đặt Q hoặc U',a.q||a.u],['Quan sát xu hướng',a.trend]];
 else if(l==='agc')rows=[['AGC MODE ON',a.agcOn],['A0 SELECT và gửi lệnh',a.a0],['Nhận biết giới hạn lệnh A0',st.alarms.some(x=>x.code==='A0_LIMIT')]];
 else if(l==='dcs')rows=[['Xem chẩn đoán',a.diag],['Nhận biết mất hai kênh',plant.alarms.some(x=>x.code==='CCR_UNAVAILABLE')],['Khôi phục và xác nhận',a.restored]];
 else if(l==='cooling')rows=[['Xem và nhận biết cảnh báo',a.alarms],['Khôi phục lưu lượng nhánh',st.alarms.some(x=>(x.code==='NKT_BRANCH_FLOW'||x.code==='COOLING_LOST')&&!x.active)],['ACK sau xử lý',st.alarms.some(x=>(x.code==='NKT_BRANCH_FLOW'||x.code==='COOLING_LOST')&&!x.active&&x.ack)]];
 else rows=[['Đọc hướng dẫn '+l.toUpperCase(),a.guide],['Xem nguồn và điều kiện',a.conditions||a.diag],['Ghi nhận giới hạn mô hình',a.about]];
 return rows.map(([label,on],i)=>{if(on)a['goal'+i]=true;return [label,!!a['goal'+i]];});
}
function renderTrainer(){
 const st=s(),exam=plant.session?.method==='exam';if(exam){$('#trainer').classList.remove('open');toast('Bài kiểm tra: công cụ giảng viên đã ẩn.',true);return;}
 const faults=Object.entries(FAULTS).map(([k,l])=>`<div class="trainer-row"><span>${esc(l)}</span><button class="fault-check ${st.faults[k]?'on':''}" data-action="fault" data-fault="${k}">${st.faults[k]?'FAULT':'OK'}</button></div>`).join('');
 $('#trainer').innerHTML=`<div class="trainer-row"><h2>ĐIỀU KHIỂN PHIÊN · OTS 04.25</h2><button class="hmi-button" data-action="trainer">×</button></div><div class="trainer-row">${btn('H1','select-unit','data-unit="0"',selected===0)}${btn('H2','select-unit','data-unit="1"',selected===1)}${btn('PHÂN QUYỀN','authority')}</div><p>${esc(LESSON_CATALOG[plant.session?.lesson||'startup'][0])}</p><div id="lesson-progress" class="lesson-goals"></div><div class="trainer-row">${btn(paused?'TIẾP TỤC':'TẠM DỪNG','pause')}${btn('BÀI MỚI','training-home')}${btn('LƯU PHIÊN','save-session')}</div><details open><summary>CHÈN LỖI THIẾT BỊ / PHẢN HỒI</summary>${faults}</details><details><summary>HỆ THỐNG NƯỚC KỸ THUẬT CHUNG</summary><div class="trainer-row"><span>NGUỒN / GÓP NKT</span>${btn(plant.cooling.fault?'RESTORE':'FAIL','nkt-common','',plant.cooling.fault)}</div><div class="trainer-row"><span>BƠM NK-1MB3 (thao tác OTS)</span>${btn(plant.cooling.manualReserve?'STOP':'START','reserve-pump','',plant.cooling.manualReserve)}</div><p>Thuật toán dự phòng ba bơm chưa được xác minh; MB3 được thao tác riêng trong bài.</p></details><details><summary>PHẢN HỒI PLC / CHẤT LƯỢNG TÍN HIỆU</summary>${plcInputsHTML()}</details><details><summary>LIÊN ĐỘNG ĐIỀU KHIỂN CHUNG</summary><div class="trainer-row"><span>AL-LCU NORMAL</span>${btn(plant.yard.auxiliaryNormal===false?'RESTORE':'FAIL','auxiliary-lcu','',plant.yard.auxiliaryNormal===false)}</div><p>SH72/73: AL-LCU không bình thường sẽ giải trừ JLR/JQR.</p></details><details><summary>NGUỒN TỰ DÙNG · MÔ HÌNH CHỨC NĂNG</summary>${plant.service.available.map((on,i)=>`<div class="trainer-row"><span>ST${i+1} AVAILABLE</span>${btn(on?'FAIL':'RESTORE','service-fail',`data-source="${i}"`,!on)}</div>`).join('')}<p>Chuyển nguồn 3 s và khởi động diesel 8 s là tham số minh họa, chưa thay thân CMPT_CB_SS.</p></details><div class="trainer-row">${btn('5E · DỪNG SỰ CỐ','trip')}${btn('RESET 86','reset-protection')}</div><div class="trainer-row">${btn('BS · QUY TRÌNH','guide','data-mode="BS"')}${btn('CH · QUY TRÌNH','guide','data-mode="CH"')}</div><div class="trainer-row">${btn('PHẠM VI / TIMER','about')}${btn('KẾT QUẢ','nav','data-page="report"')}</div>`;updateTrainerProgress();
}
function updateTrainerProgress(){if(!$('#lesson-progress'))return;const goals=lessonGoals(),count=goals.filter(v=>v[1]).length;$('#lesson-progress').innerHTML='<strong>TIẾN ĐỘ: '+count+'/3</strong><br>'+goals.map(([label,on])=>(on?'✓ ':'○ ')+esc(label)).join('<br>');$$('[data-action="fault"]').forEach(e=>{const on=s().faults[e.dataset.fault];e.classList.toggle('on',on);if(e.classList.contains('fault-check'))e.textContent=on?'FAULT':'OK';});}
function ackScope(all=false){const list=all?plant.allAlarms:areaAlarms(route.page==='ann'||route.page==='alarms'?route.scope:'ALL');list.forEach(a=>a.ack=true);plant.record('ACK','ACK '+(all?'ALL':route.scope)+'; giữ trạng thái nguyên nhân.');toast('Đã ACK; nguyên nhân và khóa bảo vệ vẫn được giữ.');renderPage();}
function showHelp(){openModal('AVC · OTS 04.25','THIẾT LẬP → THỰC HÀNH → XEM LẠI',`<p><b>Home đào tạo:</b> chọn bài, trạng thái H1/H2, vị trí thao tác, hình thức và sự cố. Bắt đầu bài mới khởi tạo đồng thời cả hai tổ.</p><p><b>Home DCS:</b> nút ⌂ chỉ mở MAIN MENU của DCS. Nút HOME ĐÀO TẠO trở về thiết lập và tạm dừng phiên.</p><p><b>Khởi động:</b> xem START COND 1/2, LOAD → ACTION, theo dõi SEQ MONITOR 1X. Thiết bị nhận lệnh rồi chuyển động theo thời gian; chỉ chuyển bước khi phản hồi đạt.</p><p><b>Timer:</b> mốc 60/180/240 s là giới hạn giám sát. Đủ phản hồi có thể hoàn thành sớm. 43USM NOT USE chỉ vô hiệu nhánh giám sát tương ứng.</p><p><b>Chọn chế độ:</b> nhấn khóa, chọn USE/NOT USE rồi XÁC NHẬN. HỦY không đổi trạng thái. USE vàng, NOT USE xám; mất điều kiện duy trì sẽ giải trừ khóa có liên quan và ghi SOE.</p><p><b>P · Permit:</b> P xanh lá khi đủ quyền và liên động, P xám khi chưa được phép. Bấm vào ô số để nhập giá trị rồi ACTION; bấm P để xem trạng thái cho phép. Ô đặt không mở cửa sổ tag/chèn lỗi.</p><p><b>Công suất:</b> 43ALR USE mở ALR Set Point; NOT USE khóa nhập ALR, dùng nút +/− 7-65P. AQR/AVR và JLR/JQR mở đúng đường đặt Q/U hoặc điều khiển chung theo liên động.</p><p><b>Trình tự:</b> bước đang làm nhấp nháy vàng, hoàn thành sáng vàng; timer, giá trị đo và điều kiện chờ đổi theo pha. Trang 5X chưa có lệnh sẽ không lấy dữ liệu của 1X.</p><p><b>Dừng:</b> STOP → ACTION, xem 5X; SILENCE/ACK không xóa nguyên nhân hay reset 86.</p><p><b>Nhiệt độ 04.5:</b> chọn trạng thái nhiệt tại Home. Mỗi tổ có nhiệt độ tích lũy theo P/Q/U, chế độ và nước làm mát. Trang TEMP MONITOR có bảng mốc, giá trị cân bằng theo tải và trend nhiệt. Dừng máy giữ nhiệt còn lại; không tự về nhiệt độ nguội.</p><p><b>Lưu phiên:</b> JSON giữ trạng thái thiết bị, bước, timer và SOE. Nạp lại sẽ tạm dừng để kiểm tra; nhấn tiếp tục khi sẵn sàng.</p>`,btn('CLOSE','close-modal'));}
function showAbout(){achievements[selected].about=true;const refs=window.__logicRef;openModal('AVC · OTS 04.25 — NGUỒN VÀ PHẠM VI','JBLOCK / PLC / QUY TRÌNH',`<p><b>Tự dùng và P–Q 04.18:</b> sửa nhánh nạp, tuyến DC3/DC5/DC4 và nguồn UPS theo ảnh bổ sung; tách đúng hai phía máy cắt. CAPABILITY CURVE có điểm P–Q trực tiếp, đường bao tham khảo OTS chưa hiệu chỉnh theo nhà chế tạo.</p><p><b>Nhãn sơ đồ 04.17:</b> tách tên thiết bị và CLOSE/OPEN khỏi dây dẫn, thanh cái và ký hiệu; chỉnh hàng chữ trên nhánh ngang, tiếp địa, AC/UPS và liên lạc tự dùng. Rà 13 sơ đồ với bốn trạng thái chữ.</p><p><b>Tiếp địa 04.16:</b> 26 thiết bị tiếp địa dùng cùng mô hình nút điện; 46 vị trí trên GENERAL DISPLAY, SWITCHYARD và MAIN UNIT có nhánh nối liền từ dây chính qua ES đến ký hiệu đất. Mở cửa sổ ES để xem phía đấu nối. Trang tự dùng và tổng quan được đối chiếu ảnh 36/39, giữ đúng phạm vi thiết bị thể hiện trong ảnh.</p><p><b>Âm thanh 04.15:</b> tiếng máy H1/H2 theo RPM và tải/cánh hướng; bypass theo vị trí/chênh áp; tiếng máy cắt khi có phản hồi; còi alarm/TRIP phân biệt, SILENCE và ACK riêng. Âm tổng hợp, không phải ghi âm nhà máy. Tạm dừng và tab ẩn im tiếng; tốc độ 1×/10× không nhân cao độ.</p><p><b>Đo lường 04.14:</b> công suất, phản kháng và dòng điện từng nhánh H1/H2 lấy riêng theo tổ, không sao chép tổng thanh cái. Sông Bung 4A mặc định có điện, DS275-7 đóng, phát 40 MW giả lập riêng. Tổng AVC chỉ gồm H1/H2. Tổng truyền ra L1/L2 bằng AVC + SB4A theo mô hình không tổn thất, chia đều hai đường khi nối thông.</p><p><b>Sa thải 04.13:</b> xét từng đường nối lưới; cắt riêng CB đầu cực tổ bị tách lưới theo quy ước bài OTS. Quá tốc dùng cân bằng công suất cơ–điện, quán tính rotor và trễ thủy lực; cánh hướng qua 0% rồi mở về không tải. H=4 s, trễ 0,9 s, đóng 4 s/toàn hành trình và mở không tải 12% là giá trị minh họa, chưa hiệu chỉnh theo thử nghiệm A Vương.</p><p><b>Bản 04.12:</b> 43 O/S OPS/SYMDU theo ảnh 38; bộ hòa trạm AUTO/MANUAL riêng từng CB, có kiểm tra 25; nấc T1/T2 mô phỏng không điện. Ngưỡng hòa, thời gian đáp ứng và phạm vi nấc là tham số đào tạo, chưa phải cấu hình thiết bị thực.</p><p><b>Tín hiệu:</b> ô tín hiệu biểu diễn RAW: 1 đỏ, 0 xanh, BAD tím; không lấy điều kiện đã qua nhánh đảo để tô màu đầu vào. Rê chuột hoặc bấm tín hiệu/thiết bị để tra địa chỉ DI/DO trong bản in PLC U1, SY, AL 23/11/2023. H2 chỉ hiện địa chỉ có nguồn riêng, không suy ra bằng cách thay tiền tố H1. QUICK STOP 04.25 dựng lại 29 đầu vào, nhánh theo ảnh và 3 đầu ra cho H1/H2. Đầu vào dùng RAW hiện có; điểm chưa có phản hồi mặc định không tác động (xanh). Bấm để giả lập ON/OFF/BQ độc lập từng tổ; trạng thái giả lập không phát lệnh trip. Hình nối không được dùng thay hàm bảo vệ PLC thực nạp.</p><p><b>Bản 04.6:</b> sửa lệnh riêng CB271/273/274/272 theo các instance SY_SH010–013 và cặp DO/DI độc lập; tách mở CB901/902 khỏi STOP 5X; bỏ trip suy ra từ topology; sửa đường nối C25 theo ảnh HMI. Thân CMPT và rơle bảo vệ chưa được tái tạo đầy đủ.</p><p><b>Kiến trúc:</b> Home đào tạo độc lập, DCS theo màu sắc và bố cục đã thống nhất; mô hình lệnh–thiết bị–phản hồi, trình tự G/SC, 14 watchdog, SOE và kết quả.</p><table class="hmi-table"><tr><th>CHIỀU</th><th>CHẶNG</th><th>GIỚI HẠN</th><th>NGUỒN</th></tr>${refs.timers.map(t=>`<tr><td>${esc(t.direction)}</td><td>${esc(t.stage)}</td><td>${t.seconds} s</td><td>JBLOCK PDF ${t.jblock_pdf_page}, SH${t.jblock_sheet}; PLC U1 PDF ${t.plc_unit_pdf_page}</td></tr>`).join('')}</table><p><b>Giá trị cần xác minh:</b> PT và GT/LT thực nạp chưa hiện đầy đủ trong bản in; hành trình/động học là tham số đào tạo; cửa sổ hòa, đường đặc tính P–Q, mapping U2 và thân CMPT chưa được xác nhận.</p><p><b>Khác biệt nguồn:</b> 90% / 95% tốc độ; 92P P >5% qua 1 s và mốc vận hành 10 MW. Mô hình giữ riêng các căn cứ này.</p><p><b>Liên động chọn chế độ 04.1:</b> ALR: JBLOCK PDF 50 / SH70, PLC U1 PDF 72; AQR: PDF 51 / SH71, PLC U1 PDF 73; JLR/JQR: SH72/73. Nhánh tay 7-65P ở SH62 xét ALR NOT USE. 43AVR AUTO/kích từ là điều kiện chức năng OTS cần xác minh FBD riêng.</p><p><b>Điều khiển chung:</b> JBLOCK PDF 54 / SH74 ghi “Không dùng”, trong khi PLC U1 PDF 76 còn đường riêng/chung. Phân phối chung trong app là chức năng đào tạo cần xác minh thực nạp.</p><p><b>Nhiệt độ 04.5:</b> 27 nhóm nhiệt mỗi tổ dùng mốc G từ nhật ký tháng 6/2026 đã sàng lọc. Chế độ không tải/SC, ngoài khoảng mốc, đáp ứng nhiệt và chênh RTD ổ là giả định đào tạo. Nguồn và ô đại diện nằm trong assets/thermal-reference.json. Thống kê nhiệt không thay ngưỡng báo động/trip; s.temp là kim loại ổ nóng nhất, không lấy stator làm nhiệt độ ổ.</p><p><b>Phạm vi còn giản lược:</b> quá độ thủy lực/điện, trạm 220 kV, chuyển nguồn tự dùng và bảo vệ rơ le. BS/CH là hướng dẫn nghiên cứu quy trình. Bảo vệ dầu/nhiệt minh họa mặc định tắt.</p><p><b>Tệp độc lập:</b> không kết nối thiết bị; mọi cấu hình, bản lưu và nhật ký nằm trong phiên mô phỏng.</p>`,btn('CLOSE','close-modal'));}
function showGuide(mode){const list=window.__guides?.[mode]||[];openModal(mode==='BS'?'BLACK START · BS':'LINE CHARGE · CH','BÀI HƯỚNG DẪN THEO QT.AV.VH.604 · CHƯA CÓ MÔ HÌNH ĐIỆN ĐỘNG',list.map(([title,text,ref],i)=>`<p><b>${i+1}. ${esc(title)}</b><br>${esc(text)}<br><small>${esc(ref)}</small></p>`).join(''),btn('CLOSE','close-modal'));}
function download(name,data,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}
const csv=rows=>'\uFEFF'+rows.map(row=>row.map(v=>{let t=String(v??'');if(/^[=+@]/.test(t)||/^-[^\d.]/.test(t))t="'"+t;return '"'+t.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
function exportEvents(){const scope=route.page==='events'||route.page==='alarms'?route.scope:'UNIT-'+(selected+1),rows=route.page==='events'?soeFiltered0425():eventRows(scope);download('AVC_OTS_04_SOE.csv',csv([['ID','SIM_TIME_S','TIME','AREA','TAG_CODE','TYPE','PREVIOUS','STATE','QUALITY','SOURCE','DESCRIPTION'],...rows.slice().reverse().map(e=>[e.id,e.t,soeTime0425(e.t),e.area,e.tag||'',e.kind,e.previous||'',e.state||'',e.quality||'',e.source||'',e.message])]));toast('Đã xuất '+rows.length+' sự kiện theo đồng hồ mô phỏng và bộ lọc.');}
function exportTrend(){const keys=['t','p','pSet','q','rpm','kv','frequency','oil','temp','gate','inlet',...THERMAL_TREND_KEYS,'thermalMode','thermalBand','quality'];download('AVC_OTS_04_3_H'+(selected+1)+'_Trend.csv',csv([['PLANT_TIME_S','P_MW','P_SET_MW','Q_MVAR','N_RPM','U_KV','F_HZ','OIL_MPA','MAX_BEARING_TEMP_C','GATE_PERCENT','INLET_PERCENT',...THERMAL_TREND_KEYS.map(k=>k.toUpperCase()+'_C'),'THERMAL_MODE','POWER_BAND','QUALITY'],...s().history.map(r=>keys.map(k=>r.quality==='BAD'&&!['t','pSet','quality','thermalMode','thermalBand'].includes(k)?'':r[k]??''))]));toast('Đã xuất dữ liệu xu hướng và nhiệt độ.');}
function exportReport(){const c=plant.session||setupDraft,goals=lessonGoals();download('AVC_OTS_04_Ket_qua.html','<!doctype html><html lang="vi"><meta charset="utf-8"><title>Kết quả thực hành AVC OTS 04.25</title><style>body{font:14px/1.6 Arial;max-width:1100px;margin:35px auto;padding:20px;color:#173c59}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:7px;text-align:left;font-size:11px}th{background:#e8f0f7}h1{font-size:25px}tr{break-inside:avoid}</style><h1>Kết quả thực hành AVC OTS 04.25</h1><p>'+esc(LESSON_CATALOG[c.lesson][0])+' · '+esc(c.operator||'Học viên')+' · H'+(selected+1)+' · '+clock(plant.t)+' giờ mô phỏng.</p><table><tr><th>Mục tiêu</th><th>Kết quả</th></tr>'+goals.map(([l,on])=>'<tr><td>'+esc(l)+'</td><td>'+(on?'Hoàn thành':'Chưa hoàn thành')+'</td></tr>').join('')+'</table><p>Căn cứ tốc độ: '+esc(c.speedBasis)+'. Timer theo JBLOCK; hành trình và động học là tham số đào tạo. Kết quả chưa thay thế sát hạch chính thức.</p><h2>Nhật ký sự kiện</h2><table><tr><th>Giờ</th><th>Khu vực</th><th>Loại</th><th>Nội dung</th></tr>'+plant.events.slice().reverse().map(x=>'<tr><td>'+clock(x.t)+'</td><td>'+esc(x.area)+'</td><td>'+esc(x.kind)+'</td><td>'+esc(x.message)+'</td></tr>').join('')+'</table></html>','text/html;charset=utf-8');}
function networkModal(key){
 openModal(key.toUpperCase(),'DCS NETWORK / STATION DIAGNOSTIC',`<p>STATUS: <b>${plant.network[key]?'ONLINE':'OFFLINE'}</b></p><p>Thử mất một kênh dự phòng, sau đó thử mất cả hai kênh ONET/CNET để quan sát chất lượng BQ và khóa quyền điều khiển CCR. Quá trình nội bộ vẫn tiếp tục chạy.</p>`,btn(plant.network[key]?'SIMULATE FAILURE':'RESTORE','toggle-network',`data-key="${key}"`)+btn('CLOSE','close-modal'));
}
function syncModal(){const st=s();openModal('43-25 · SYNCHRONIZER','Cửa sổ hòa và thao tác tay của bài tập',`<p>MODE: <b>${st.syncMode}</b></p><p>Δf: ${fmt(st.df,3)} Hz · ANGLE: ${fmt(st.angle,1)}° · U: ${fmt(st.kv,3)} kV</p><p>Cửa sổ OTS: |Δf|≤0,1 Hz; ΔU≤5%; |góc|≤10°. Đây là giả định, không phải chỉnh định bộ hòa thực tế.</p><div class="row-actions">${btn('AUTO','sync-mode','data-value="AUTO"',st.syncMode==='AUTO')}${btn('MANUAL','sync-mode','data-value="MANUAL"',st.syncMode==='MANUAL')}${btn('ADJUST','sync-adjust')}${btn('CLOSE CB','manual-sync')}</div>`,btn('CLOSE','close-modal'));}
function readSetup(){
 const f=$('#setup-form'),get=k=>f.elements.namedItem(k)?.value,c=clone(setupDraft);
 c.lesson=get('lesson');c.unit=Number(get('unit'));c.method=get('method');c.operator=get('operator');c.states=[get('state0'),get('state1')];c.location=get('location');c.speed=Number(get('speed'));c.speedBasis=get('speedBasis');c.pTarget=Number(get('pTarget'));c.qTarget=Number(get('qTarget'));
 c.fault={key:get('faultKey'),unit:Number(get('faultUnit')),trigger:get('faultTrigger'),stage:Number(get('faultStage')),after:Number(get('faultAfter'))};
 c.thermal={ambient:Number(get('thermalAmbient')),waterIn:Number(get('thermalWater')),initial:[get('thermalInitial0'),get('thermalInitial1')]};
 for(const k of Object.keys(c.dynamics)){const v=get('dyn-'+k);if(v!==undefined)c.dynamics[k]=Number(v);}
 c.illustrativeTrips=!!f.elements.namedItem('illustrativeTrips').checked;return c;
}

function showSetup(){
 if(plant.session&&!paused){paused=true;plant.sessionState='PAUSED';plant.record('SESSION','Về trang thiết lập; tạm dừng phiên.');}
 $('#trainer').classList.remove('open');if($('#modal').open)closeModal();document.body.classList.add('training-mode');$('#training-home').hidden=false;
 $('#training-home').innerHTML=setupHTML(setupDraft,{resume:!!plant.session,evn:window.__assets.evn,time:clock(plant.t)});document.title='AVC — OTS 04.25 | Thiết lập bài thực hành';window.scrollTo(0,0);
}

function resumeSession(){if(!plant.session)return;if(sound.prefs.enabled)void sound.unlock();document.body.classList.remove('training-mode');$('#training-home').hidden=true;paused=false;plant.sessionState='RUNNING';plant.record('SESSION','Tiếp tục phiên.');lastTick=performance.now();openPage(route.page,selected);}

function beginSession(config){
 try{const result=plant.configure(config);sound.reset(plant);if(sound.prefs.enabled)void sound.unlock();epoch=Date.now();setupDraft=clone(plant.session);selected=config.unit;speed=config.speed;paused=false;soePage0425=0;soeType0425="ALL";soeQuery0425="";soeHold0425=false;workspaceTabs=[];navHistory=[];navIndex=-1;achievements[0]={};achievements[1]={};a0Draft[0]={};a0Draft[1]={};tagCache.clear();accumulator=0;lastTick=performance.now();
  $('#training-home').hidden=true;document.body.classList.remove('training-mode');$('#trainer').classList.remove('open');openPage('home',selected);toast(result.message);
  if(['bs','ch'].includes(config.lesson))showGuide(config.lesson.toUpperCase());
 }catch(error){const box=$('#setup-error');if(box)box.textContent=error.message;else toast(error.message,true);}
}

function sequenceDetailHTML(vm){
 if(!vm.matching)return `<div class="sequence-detail seq-inactive">${vm.direction==='stop'?'5X':'1X'} · CHƯA CÓ TRÌNH TỰ ĐANG THỰC HIỆN${s().stopping?' · Tổ máy đang chạy trình tự dừng 5X.':''}</div>`;
 const status=vm.timeout?'QUÁ THỜI GIAN · GIỮ BƯỚC':vm.running?'ĐANG THỰC HIỆN':vm.done?'HOÀN THÀNH':'STAND STILL';
 const states=vm.direction==='stop'?['GIẢM TẢI','MỞ MÁY CẮT','DỪNG KÍCH TỪ','TUABIN / PHANH','ĐÓNG VAN','DỪNG PHỤ TRỢ','STOP']:['STOP','PREPARATION','INLET VALVE','TURBINE START','EXCITATION','PARALLEL IN','LOAD','SC'];
 return `<div class="sequence-detail ${vm.timeout?'is-timeout':''}"><div class="seq-metrics"><span>${vm.direction==='stop'?'5X':'1X'} · PHASE <b>${esc(vm.phase)}</b></span><span>PV <b data-seq-pv></b> / LIMIT <b>${vm.limit||'—'} s</b></span><span>THỜI GIAN PHA <b data-seq-phase-time></b></span><span>${status}</span></div><div class="seq-progress">${states.map((label,i)=>`<span class="${vm.states[i]} ${vm.states[i]==='running'?'seq-pulse':''}">${label}</span>`).join('')}</div><div class="seq-meter"><i data-seq-meter></i></div><div class="seq-live-values">${vm.metrics.map(m=>`<div><label>${esc(m.label)}</label><b data-phase-value="${m.key}">—</b><small>${esc(m.unit)}</small></div>`).join('')}</div><div class="seq-requirements">${vm.requirements.map(r=>`<span class="${r.ok?'':'missing'}">${bit(r.ok,u().qualityGood?r.quality||'GOOD':'BAD')}${esc(r.label)} <small>${esc(r.tag)}</small></span>`).join('')}</div></div>`;
}
function updateSequenceDetails(){
 $$('[data-seq-details]').forEach(n=>{const vm=sequenceDisplay(u(),n.dataset.direction),signature=JSON.stringify({phase:vm.phase,matching:vm.matching,states:vm.states,timeout:vm.timeout,done:vm.done,req:vm.requirements.map(r=>[r.label,r.ok,r.quality]),metrics:vm.metrics.map(m=>m.key),quality:u().qualityGood});
  if(n.dataset.signature!==signature){n.innerHTML=sequenceDetailHTML(vm);n.dataset.signature=signature;}
  const pv=$('[data-seq-pv]',n),pt=$('[data-seq-phase-time]',n),meter=$('[data-seq-meter]',n);if(pv)pv.textContent=fmt(vm.elapsed,1)+' s';if(pt)pt.textContent=fmt(vm.phaseTime,1)+' s';if(meter)meter.style.width=(vm.limit?Math.min(100,vm.elapsed/vm.limit*100):0)+'%';
  $$('[data-phase-value]',n).forEach(e=>{const m=vm.metrics.find(v=>v.key===e.dataset.phaseValue);if(!m)return;const t=readTag(m.key),good=t.quality==='GOOD';e.textContent=!good?'BQ':typeof m.value==='boolean'?(m.key==='breaker'?m.value?'CLOSED':'OPEN':m.value?'ON':'OFF'):fmt(m.value,m.key==='rpm'?0:m.key==='df'?3:2);e.classList.toggle('bad',!good);});
 });
}

function updateCoach(){
 const bar=$('#coach-bar');if(!plant.session){bar.hidden=true;return;}bar.hidden=false;
 const q=u().sequence,missing=q.requirements.filter(r=>!r.ok).map(r=>r.label),isExam=plant.session.method==='exam';
 const html=`<b>OTS · H${selected+1} · ${esc(LESSON_CATALOG[plant.session.lesson][0])}</b><span class="coach-wait">${s().rejection.active?'SA THẢI '+fmt(s().rejection.rejectedMW,1)+' MW · '+s().rejection.phase.toUpperCase()+' · nmax '+fmt(s().rejection.peakRPM,1)+' rpm':s().rejection.completed&&s().stage===4?'EX · KHÔNG TẢI CÓ KÍCH TỪ · CHỜ THAO TÁC':isExam?'BÀI KIỂM TRA · '+clock(plant.t):paused?'PHIÊN ĐANG TẠM DỪNG':q.kind==='idle'?(s().breaker?'Vận hành ổn định · điều chỉnh theo bài tập.':'Kiểm tra START CONDITION, chọn đích và ACTION.'):esc(q.phase)+' · '+(missing.length?'Chờ: '+esc(missing.slice(0,2).join(' / ')):'Phản hồi đạt')}</span>${s().rejection.active||s().rejection.completed?btn('SA THẢI / QUÁ ĐỘ','nav','data-page="rejection"'):''}${btn('LƯU PHIÊN','save-session')}${btn('KẾT QUẢ','nav','data-page="report"')}${btn('HOME ĐÀO TẠO','training-home')}`;
 if(bar.dataset.signature!==html){bar.innerHTML=html;bar.dataset.signature=html;}
 updateSequenceDetails();
}

document.addEventListener('click',async event=>{
 const node=event.target.closest('[data-action]');if(!node)return;const action=node.dataset.action,st=s();
 if(plant.session?.method==='exam'&&['equipment-fault','fault','sensor-fault','condition-override','toggle-module','penstock-check','vh-signal','compressor','nkt-common','reserve-pump','service-fail','plc-input','input-override','auxiliary-lcu'].includes(action)){toast('Công cụ giảng viên không khả dụng trong bài kiểm tra.',true);return;}
 if(action==='audio-settings'){if(sound.prefs.enabled)await sound.unlock();soundModal();}
 else if(action==='audio-toggle'){sound.set('enabled',!sound.prefs.enabled);if(sound.prefs.enabled)await sound.unlock();soundModal();}
 else if(action==='audio-test'){sound.test(node.dataset.sound);}
 else if(action==='sb4a-source')sb4aSourceModal();
 else if(action==='sb4a-apply'){const r=plant.equipment.setSb4a($('#sb4a-online').value==='on',Number($('#sb4a-p').value),Number($('#sb4a-q').value));toast(r.message,!r.ok);if(r.ok)sb4aSourceModal();}
 else if(action==='workflow')workflowModal();
 else if(action==='station-sync')stationSyncModal();
 else if(action==='station-sync-apply'){const r=plant.equipment.setStationSync($('#station-sync-mode').value,$('#station-sync-cb').value);toast(r.message,!r.ok);if(r.ok)stationSyncModal();}
 else if(action==='station-os'){openModal('43 O/S','QUYỀN THAO TÁC TRẠM',`<p>43 O/S theo ảnh DCS: OPS / SYMDU. OPS giao quyền thao tác cho trạm OPS đang giữ quyền; SYMDU giao về trạm tại chỗ, các lệnh từ OPS bị chặn. Khóa độc lập với 143R/43RR và khóa tổ máy.</p><p>Hiện tại: <b>${plant.equipment.control43}</b></p>`,btn('OPS · ĐIỀU KHIỂN TỪ OPS','station-os-confirm','data-value="OPS"')+btn('SYMDU · GIAO TẠI CHỖ','station-os-confirm','data-value="SYMDU"')+btn('ĐÓNG','close-modal'));}
 else if(action==='station-os-confirm'){const r=plant.equipment.setStationControl(node.dataset.value);toast(r.message,!r.ok);closeModal();}
 else if(action==='station-sync-select'){const r=plant.equipment.select(plant.equipment.stationSync.id);toast(r.message,!r.ok);updateTrainingControls();}
 else if(action==='station-sync-adjust'){const x=plant.equipment.stationSync;if(x.mode==='MANUAL'&&!plant.equipment.authority().length){x[node.dataset.key]=approach(x[node.dataset.key],0,node.dataset.key==='df'?.025:5,1);x.stable=0;plant.record('COMMAND','25 MANUAL '+node.dataset.key,'SWITCHYARD');}updateTrainingControls();}
 else if(action==='station-sync-arm'){openModal('XÁC NHẬN HÒA AUTO','LỆNH RIÊNG '+plant.equipment.stationSync.id,'<p>Tự cân chỉnh ΔU/Δf/góc, kiểm tra 25 liên tục và phát một lệnh CLOSE tới máy cắt đã chọn. Mất điều kiện sẽ hủy lệnh.</p>',btn('HỦY','station-sync')+btn('XÁC NHẬN HÒA AUTO','station-sync-arm-confirm'));}
 else if(action==='station-sync-arm-confirm'){const r=plant.equipment.armStationSync();toast(r.message,!r.ok);stationSyncModal();}
 else if(action==='station-sync-device')equipmentFace(plant.equipment.stationSync.id);
 else if(action==='tap-request'){const i=+node.dataset.unit,d=+node.dataset.delta;openModal('XÁC NHẬN ĐỔI NẤC T'+(i+1),'MÔ PHỎNG KHÔNG ĐIỆN','<p>'+esc(d>0?'Tăng':'Giảm')+' một nấc; thời gian 5 s. Liên động được kiểm tra lại khi xác nhận.</p>',btn('HỦY','main-tap-reference0410',`data-unit="${i}"`)+btn('XÁC NHẬN','tap-confirm',`data-unit="${i}" data-delta="${d}"`));}
 else if(action==='tap-confirm'){const r=plant.equipment.changeTap(+node.dataset.unit,+node.dataset.delta);toast(r.message,!r.ok);mainTapReference0410(+node.dataset.unit);}
 else if(action==='fit-screen')fitActiveHmi();
 else if(action==='dcs-photo-reference')photoReferenceModal();
 else if(action==='photo-open')photoReferenceModal(Number(node.dataset.photo));
 else if(action==='photo-select')photoReferenceModal(Number($('#photo-index').value));
 else if(action==='breaker-summary')openModal('MÁY CẮT · PHẢN HỒI ĐỘC LẬP','LỆNH VÀ TRẠNG THÁI RIÊNG',breakerSummary(dynamicContext()),btn('ĐÓNG','close-modal'));
 else if(action==='screen-notes')openModal('GHI CHÚ MÔ PHỎNG','NGUỒN / PHẠM VI',dxContextNote+btn('40 ẢNH DCS HIỆN TẠI','dcs-photo-reference'),btn('ĐÓNG','close-modal'));


 else if(action==='home-reference0410')homeReference0410(node.dataset.reference,Number(node.dataset.unit)||0);
 else if(action==='home-temperature0410')homeTemperature0410();
 else if(action==='main-tap-reference0410')mainTapReference0410(Number(node.dataset.unit));
 else if(action==='real-screen-notes')realScreenNotes();
 else if(action==='real-tag'){const [,i,key]=node.dataset.realKey.split(':');tagModal(key,+i);}
 else if(action==='real-unit-selector'){
  const i=+node.dataset.unit,key=node.dataset.key,val=node.dataset.value;
  openPage(route.page,i);
  if(key==='govf')selectorModal('gov','gov',val==='USE'?'FREQUENCY':'LOAD');
  else selectorModal('switch',key,val);
 }
 else if(action==='real-reference-value'&&/^ref:tap[12]$/.test(node.dataset.realKey))mainTapReference0410(Number(node.dataset.realKey.at(-1))-1);
 else if(action==='real-reference-value'){
  const v=REAL_PHOTO_VALUES[node.dataset.realKey.split(':')[1]];
  if(v)openModal(esc(v.label),'MỐC ẢNH · 29/10/2026 · KHÔNG PHẢI PV ĐANG CHẠY',`<p><b>${fmt(v.value,v.dec)} ${esc(v.unit)}</b></p><p>Giá trị đọc từ ảnh DCS 33 / 36. Mô hình hiện chưa có kênh đo tương ứng; ô này được giữ làm mốc đối chiếu và đánh dấu R, không tự thay đổi theo phiên.</p>`,btn('ẢNH DCS','photo-open',`data-photo="${node.dataset.realKey==='ref:dgEnergy'?36:33}"`)+btn('ĐÓNG','close-modal'));
 }
 else if(action==='real-meter-info'){
  const t=realValue(node.dataset.realKey,plant,gridMeasurements(plant));
  openModal(esc(node.dataset.realKey),'GIÁ TRỊ MÔ PHỎNG',`<p>VALUE: <b>${Number.isFinite(t.value)?fmt(t.value,3):'—'}</b> · QUALITY: <b>${esc(t.quality)}</b></p><p>Giá trị được tính từ nguồn, trạng thái đóng cắt và tải trong phiên OTS. Các pha dùng mô hình cân bằng; dòng DG chưa có mô hình tải riêng và giữ 0 A.</p>`,btn('ĐÓNG','close-modal'));
 }
 else if(action==='real-service-authority')openModal('43_O/A · OPS / ALMDU','KHÓA GHI NHẬN TRÊN ẢNH 36','<p>Hiển thị vị trí trạm đang xem của phiên OTS. Chưa có thân logic chuyển quyền 43_O/A của tự dùng để phát lệnh qua khóa này.</p>',btn('XEM PHÂN QUYỀN OTS','authority')+btn('ĐÓNG','close-modal'));
 else if(action==='real-unmapped')openModal(esc(node.dataset.label),'THIẾT BỊ / KHÓA TRÊN ẢNH DCS','<p>Đã bổ sung đúng vị trí và nhãn trên màn hình. Chưa có DI/DO hoặc logic riêng được xác nhận cho thiết bị này; không phát lệnh đóng cắt. Dấu xám báo chưa có phản hồi mô phỏng độc lập.</p>',btn('ẢNH DCS','photo-open',`data-photo="${route.page==='stationservice'?36:33}"`)+btn('ĐÓNG','close-modal'));
 else if(action==='equipment-open')equipmentFace(node.dataset.equipment);
 else if(action==='equipment-select'){const r=plant.equipment.select(node.dataset.equipment);toast(r.message,!r.ok);equipmentFace(node.dataset.equipment);}
 else if(action==='equipment-cancel'){const r=plant.equipment.cancel();toast(r.message);updateEquipmentModal();}
 else if(action==='equipment-order')equipmentOrder(node.dataset.equipment,Number(node.dataset.target));
 else if(action==='equipment-back')equipmentFace(node.dataset.equipment);
 else if(action==='equipment-confirm'){if(!equipmentDraft)return;const draft={...equipmentDraft};if(draft.token!==plant.equipment.selectionToken){closeModal();toast('SELECT đã thay đổi/hết hạn; chọn lại thiết bị.',true);return;}const r=plant.equipment.command(draft.id,draft.target);closeModal();toast(r.message,!r.ok);renderPage();}
 else if(action==='equipment-fault'){const d=plant.equipment.items[node.dataset.equipment],key=node.dataset.key;if(d&&['failed','bad','ready'].includes(key)){d[key]=!d[key];plant.record('INSTRUCTOR',node.dataset.equipment+' '+key+'='+d[key],'SWITCHYARD');updateEquipmentModal();}}
 else if(action==='yard-authority')yardAuthorityModal();
 else if(action==='yard-authority-apply'){const p=plant;if(p.role==='AVGuest'||p.station==='UMDU'||p.station!==p.activeOps||!p.communicationOK){toast('Cần OPS đang giữ quyền và truyền thông tốt.',true);return;}p.equipment.remote=$('#yard-remote').value==='REMOTE';p.equipment.owner=$('#yard-owner').value;p.equipment.cancel();p.record('AUTHORITY','TRẠM 143R '+(p.equipment.remote?'REMOTE':'LOCAL')+' / 43RR '+p.equipment.owner,'SWITCHYARD');closeModal();renderPage();}
 else if(action==='workspace-tab')activateWorkspaceTab(node.dataset.tabKey);
 else if(action==='workspace-close')closeWorkspaceTab(node.dataset.tabKey);
 else if(action==='nav')openPage(node.dataset.page,Number(node.dataset.unit??selected),1,node.dataset.scope||'ALL');
 else if(action==='official-io-filter'){officialIoFilter={peer:$('#official-io-peer').value,query:$('#official-io-query').value};renderPage();}
 else if(action==='official-io-clear'){officialIoFilter={peer:'ALL',query:''};renderPage();}
 else if(action==='station-unit')openPage('stationcontrol',Number(node.dataset.unit));
 else if(action==='menu')openPage('home');
 else if(action==='training-home')showSetup();
 else if(action==='resume-session')resumeSession();
 else if(action==='choose-lesson'){const before=readSetup();setupDraft={...lessonPreset(node.dataset.lesson,before.unit),operator:before.operator,method:before.method,dynamics:before.dynamics,thermal:before.thermal};showSetup();}
 else if(action==='save-session'){download('AVC_OTS_04_3_Phien.json',JSON.stringify(sessionSnapshot(),null,2),'application/json');toast('Đã lưu toàn bộ phiên mô phỏng.');}
 else if(action==='import-session')$('#session-file').click();
 else if(action==='nkt-common'){plant.cooling.fault=!plant.cooling.fault;plant.record('INSTRUCTOR','NKT COMMON '+(plant.cooling.fault?'FAIL':'RESTORE'),'AUXILIARY');renderTrainer();renderPage();}
 else if(action==='reserve-pump'){delete plant.equipment.auxOverrides['NK-1MB3'];plant.cooling.manualReserve=!plant.cooling.manualReserve;renderTrainer();renderPage();}
 else if(action==='service-fail'){const index=Number(node.dataset.source);plant.service.available[index]=!plant.service.available[index];plant.record('INSTRUCTOR','ST'+(index+1)+' AVAILABLE = '+plant.service.available[index],'AUXILIARY');renderTrainer();renderPage();}
 else if(action==='plc-input')plcInputModal(node.dataset.input);
 else if(action==='input-override'){const key=node.dataset.input,mode=node.dataset.mode,x=u().raw(key,false);for(const k of [key,x.tag]){delete st.di[k];delete st.sensorFaults[k];}if(mode==='bad')st.sensorFaults[x.tag]=true;else if(mode!=='auto')st.di[x.tag]=mode==='on';u().log('INSTRUCTOR',(selected===0?x.tag:'H2 OTS INPUT '+key)+' = '+mode.toUpperCase());plcInputModal(key);}
 else if(action==='nkt-reference'){openModal('SƠ ĐỒ NƯỚC KỸ THUẬT','SD-VH-AV-NK-01B · Nguồn, xử lý/phân phối và phụ tải','<img class="ref-image" alt="Sơ đồ NKT" src="'+window.__officialAssets.nkt+'">',btn('CLOSE','close-modal'));$('#modal').classList.add('reference-modal');}
 else if(action==='back'||action==='forward'){const n=navIndex+(action==='back'?-1:1);if(n>=0&&n<navHistory.length){navIndex=n;const r=navHistory[n];openPage(r.page,r.unit,r.part,r.scope,false);}}
 else if(action==='ann'){const scope=node.dataset.scope||'ALL',index=scope==='UNIT-2'?1:scope==='UNIT-1'?0:selected;openPage('ann',index,Number(node.dataset.part||1),scope);}
 else if(action==='alarms-all')openPage('alarms',selected,1,'ALL');
 else if(action==='alarms-scope')openPage('alarms',selected,1,node.dataset.scope||'ALL');
 else if(action==='events'){soeHold0425=false;soePage0425=0;soeType0425='ALL';soeQuery0425='';openPage('events',selected,1,route.scope||'ALL');}
 else if(action==='soe-hold0425'){soeHold0425=!soeHold0425;renderPage();}
 else if(action==='soe-apply0425'){soePage0425=0;soeType0425=$('#soe-type0425').value;soeQuery0425=$('#soe-query0425').value.trim();openPage('events',selected,1,$('#soe-area0425').value);}
 else if(action==='soe-clear0425'){soePage0425=0;soeType0425='ALL';soeQuery0425='';openPage('events',selected,1,'ALL');}
 else if(action==='soe-page0425'){soeHold0425=true;soePage0425=Math.max(0,Math.min(Math.ceil(soeFiltered0425().length/100)-1,soePage0425+Number(node.dataset.delta)));renderPage();}
 else if(action==='open-trend')openPage('trend');
 else if(action==='official-source'){const key=node.dataset.source;openModal('HMI GỐC','ẢNH TÀI LIỆU · KHÔNG PHẢI TRẠNG THÁI PHIÊN',officialDocument(key),btn('CLOSE','close-modal'));}
 else if(action==='reference')referenceModal();
 else if(action==='reference-page')referenceModal(Number(node.dataset.ref));
 else if(action==='help'){if(route.page==='control')panelNotes049();else showHelp();}
 else if(action==='about')showAbout();
 else if(action==='close-modal')closeModal();
 else if(action==='pause'){paused=!paused;plant.sessionState=paused?'PAUSED':'RUNNING';if(!paused&&sound.prefs.enabled)void sound.unlock();plant.log('SESSION',paused?'Tạm dừng mô phỏng.':'Tiếp tục mô phỏng.');updateBindings();}
 else if(action==='speed'){const speeds=[1,2,5,10];speed=speeds[(speeds.indexOf(speed)+1)%speeds.length];plant.log('SESSION','Tốc độ '+speed+'×.');updateBindings();}
 else if(action==='trainer'){const e=$('#trainer');e.classList.toggle('open');if(e.classList.contains('open'))renderTrainer();}
 else if(action==='select-unit'){selected=Number(node.dataset.unit);openPage('control',selected);renderTrainer();}
 else if(action==='favorites'){openModal('FAVORITE DISPLAYS','Các trang thường dùng',`<div class="row-actions">${nav('MAIN MENU','home')}${nav('U#1 CONTROL','control',0)}${nav('U#2 CONTROL','control',1)}${nav('SYSTEM ARCHITECTURE','architecture')}${nav('ALARM SUMMARY','alarms')}</div>`,btn('CLOSE','close-modal'));}
 else if(action==='history'){openModal('DISPLAY HISTORY','Lịch sử điều hướng trong phiên',`<div class="row-actions">${navHistory.slice().reverse().slice(0,25).map(r=>nav((UNIT_PAGES.has(r.page)?'U#'+(r.unit+1)+' ':'')+PAGES[r.page][0],r.page,r.unit)).join('')}</div>`,btn('CLOSE','close-modal'));}
 else if(action==='tag')tagModal(node.dataset.tag,Number(node.dataset.unit??selected));
 else if(action==='thermal-model')thermalModelModal();
 else if(action==='sensor-fault'){const index=Number(node.dataset.unit??selected),key=node.dataset.tag,unit=plant.units[index];unit.s.sensorFaults[key]=!unit.s.sensorFaults[key];unit.alarm('SENSOR_'+key.toUpperCase(),unit.s.sensorFaults[key],'SENSOR QUALITY BAD: '+key);unit.log('INSTRUCTOR','Tag '+key+' → '+(unit.s.sensorFaults[key]?'BAD':'GOOD'));tagModal(key,index);updateBindings();}
 else if(action==='mode')selectorModal('mode','mode',node.dataset.value);
 else if(action==='switch')selectorModal('switch',node.dataset.key,node.dataset.value);
 else if(action==='avr')selectorModal('avr','avr',node.dataset.value);
 else if(action==='selector-choice'){if(pendingSelector){pendingSelector.value=node.dataset.value;updateSelectorModal();}}
 else if(action==='confirm-selector'){
  const p=pendingSelector;if(!p)return;const unit=plant.units[p.unit],a=unit.selectorBlockers(p.kind,p.key,p.value);if(a.length){$('#modal-error').textContent=a.join('; ');return;}
  const r=p.kind==='switch'?unit.setSwitch(p.key,p.value):p.kind==='mode'?unit.setMode(p.value):p.kind==='avr'?unit.setAvr(p.value):unit.setGovernor(p.value);
  if(r.ok){closeModal();feedback(r);}else $('#modal-error').textContent=r.message;
 }
 else if(action==='manual-nudge'){const r=u().raiseLowerPower(Number(node.dataset.delta));toast(r.message,!r.ok);updateBindings();}
 else if(action==='auxiliary-lcu'){plant.yard.auxiliaryNormal=plant.yard.auxiliaryNormal===false;plant.record('INSTRUCTOR','AL-LCU NORMAL = '+plant.yard.auxiliaryNormal,'AUXILIARY');plant.units.forEach(v=>v.refreshRegulation());renderTrainer();renderPage();}
 else if(action==='authority')authorityModal();
 else if(action==='handover'){const r=plant.handover();feedback(r);if($('#station-select'))authorityModal();}
 else if(action==='edit')editModal(node.dataset.key);
 else if(action==='permit-info')permitModal(node.dataset.permitKey);
 else if(action==='permit-edit')editModal(node.dataset.key);
 else if(action==='nudge-control'){const key=node.dataset.key,step=EDITS[key]?.[4]??1;feedback(key==='manualP'?u().raiseLowerPower(Number(node.dataset.delta)):applyEdit(key,editCurrent(key)+Number(node.dataset.delta)*step));}
 else if(action==='edit-nudge'){const e=$('#edit-input');if(e.value.trim())e.value=clamp(Number(e.value)+Number(node.dataset.delta)*Number(e.step),Number(e.min),Number(e.max)).toFixed(modalKey==='u'||modalKey==='f'?2:1);}
 else if(action==='apply-edit'){const key=modalKey,input=$('#edit-input'),r=applyEdit(key,input.value.trim()?Number(input.value):NaN);if(r.ok){achievements[selected][key]=true;if((key==='q'||key==='jointQ')&&st.workingMode==='SC')achievements[selected].scQ=true;closeModal();feedback(r);}else $('#modal-error').textContent=r.message;}

 else if(action==='panel-agc049'){
  openModal('AGC ON · H'+(selected+1),'CHỌN → XÁC NHẬN',`<p>AGC hiện tại: <b>${st.agc.on?'ON':'OFF'}</b></p><p>${st.agc.on?'Tắt AGC và trả về AV/DN.':'Bật AGC qua đường điều khiển hiện có. Sau đó chọn 43RR-1 A0&A3 / A0 SELECT khi đủ điều kiện.'}</p>`,btn('HỦY','close-modal')+btn(st.agc.on?'XÁC NHẬN OFF':'XÁC NHẬN ON','agc-on'));
 }
 else if(action==='panel-nudge049'){
  const key=node.dataset.key,dir=+node.dataset.delta,step=EDITS[key]?.[4]??1;
  // Fast arrows request one larger setpoint, not a loop of independent commands.
  const amount=dir*(node.dataset.fast==='1'?5:1);
  feedback(key==='manualP'?u().manualPower(st.pSet+amount*.5):applyEdit(key,editCurrent(key)+amount*step));
 }
 else if(action==='panel-stage-permit049'){
  const n=+node.dataset.stage,a=stagePermit049(u(),n);
  openModal(STAGES[n].en+' · PERMIT','H'+(selected+1),a.length?'<p>'+a.map(esc).join('<br>')+'</p>':'<p>PERMIT ON · Đủ điều kiện nhận lệnh theo mô hình hiện có.</p>',btn('ĐÓNG','close-modal'));
 }
 else if(action==='panel-avr-permit049'){
  const a=selectorAuthority(u());openModal('43-90 · PERMIT','H'+(selected+1),'<p>'+esc(a.join('; ')||'Đủ quyền chọn AUTO / MANUAL.')+'</p>',btn('ĐÓNG','close-modal'));
 }
 else if(action==='panel-primary049')openModal('PRI. FREQ. OPERATING','PHẢN HỒI TRẠNG THÁI','<p>Đây là chỉ thị vận hành điều tần sơ cấp trên ảnh HMI. Chưa có phản hồi DI riêng trong mô hình; không biến chỉ thị này thành nút INLET VALVE hay suy ra tác động từ 43GOVF USE.</p>',btn('ĐÓNG','close-modal'));
 else if(action==='quick-stop-condition049')openPage('quickcond',selected);
 else if(action==='quick-photo-reference0411')quickStopPhotoModal0411();
 else if(action==='stage')stageModal(Number(node.dataset.stage));
 else if(action==='confirm-stage'){const n=Number(node.dataset.stage),r=u().command(n);if(r.ok){if(n===7)achievements[selected].scCommand=true;if(n===6)achievements[selected].load=true;closeModal();feedback(r);}else $('#modal-error').textContent=r.message;}
 else if(action==='check-ready')openModal('START CONDITION','Điều kiện mô hình và quyền điều khiển',`<p>${u().ready?'START CONDITION AVAILABLE':esc(u().blockers().join('; '))}</p><p>Danh sách phản hồi vật lý và khóa quyền phải nhất quán trước khi nhận lệnh.</p>`,btn('CLOSE','close-modal'));
 else if(action==='condition-tag')conditionModal0411(Number(node.dataset.part),Number(node.dataset.index),Number(node.dataset.ioUnit??selected));
 else if(action==='io-inspect0411')inspectPoint0411(node);
 else if(action==='quick-simulation0423'){
  const index=Number(node.dataset.unit),kind=node.dataset.kind,key=node.dataset.key;
  const result=setQuickSimulation0423(plant,index,kind,key,node.dataset.mode);
  if(result.ok){renderPage();inspectPoint0411({dataset:{ioKind:kind,ioKey:key,ioUnit:String(index)}});}toast(result.message,!result.ok);
 }
 else if(action==='binary-photo0411'){const key=node.dataset.photo;openModal('DCS THỰC TẾ · '+(key==='quick'?'QUICK STOP':'STARTING CONDITIONS H2'),'ẢNH DO NGƯỜI DÙNG CUNG CẤP · 30/10/2026','<img class="ref-image" alt="Ảnh màn hình DCS thực tế" src="'+window.__binaryPhotoRefs0411[key]+'">',btn('CLOSE','close-modal'));$('#modal').classList.add('reference-modal');}
 else if(action==='condition-override'){const r=u().conditions(Number(node.dataset.part))[Number(node.dataset.index)];st.di[r.key]=!r.raw;u().log('INSTRUCTOR','Override DI '+r.tag+' = '+Number(!r.raw));closeModal();renderPage();toast('Đã đổi tín hiệu thô trong bài tập; kiểm tra điều kiện khởi động.');}
 else if(action==='fault'){const key=node.dataset.fault,on=!st.faults[key];const r=u().setFault(key,on);if(key==='valve'&&!on)achievements[selected].valveCleared=true;if(key==='cooling'&&on)st.injections.cooling=true;feedback(r);}
 else if(action==='pump')feedback(u().pump(node.dataset.pump,node.dataset.on==='1'));
 else if(action==='oil-pump-faceplate')openModal('GOVERNOR OIL PUMP '+node.dataset.pump,'EQUIPMENT FACEPLATE',`<p>STATUS: ${st['pump'+node.dataset.pump]?'RUNNING':'STOPPED'}</p><p>Đang chọn U#${selected+1}. Logic dự phòng AUTO thuộc mô hình bài tập.</p>`,btn('START','pump',`data-pump="${node.dataset.pump}" data-on="1"`)+btn('STOP','pump',`data-pump="${node.dataset.pump}" data-on="0"`)+btn('CLOSE','close-modal'));
 else if(action==='trip')openModal('5E · EMERGENCY STOP','U#'+(selected+1)+' · OTS',`<p>Kích hoạt dừng sự cố, cắt máy cắt/kích từ và giữ khóa bảo vệ 86 trong mô hình.</p>`,btn('CANCEL','close-modal')+btn('5E ACTION','confirm-trip','',true));
 else if(action==='confirm-trip'){closeModal();feedback(u().trip());}
 else if(action==='reset-protection')feedback(u().resetProtection());
 else if(action==='silence'){plant.units.forEach(v=>v.s.silenced=true);plant.record('SILENCE','Giải trừ chỉ báo còi, giữ cảnh báo và trạng thái ACK.');sound.silence(plant);toast('SILENCE — đã im còi; tiếng máy vẫn tiếp tục.');}
 else if(action==='ack')ackScope();
 else if(action==='ack-all')ackScope(true);
 else if(action==='lamp-test'){const tiles=$$('.ann-tile');tiles.forEach(e=>e.classList.add('active'));setTimeout(()=>{if(route.page==='ann')renderPage();},1200);}
 else if(action==='alarm-detail'){const a=areaAlarms(node.dataset.scope).find(a=>a.code===node.dataset.code);openModal(node.dataset.code||'UNASSIGNED ANNUNCIATOR','ALARM FACEPLATE',a?`<p>${esc(a.message)}</p><p>STATUS: ${a.active?'ACTIVE':'RETURNED'} · ${a.ack?'ACK':'UNACK'}</p><p>TIME: ${clock(a.t)} · AREA: ${a.area}</p>`:'<p>Ô này chưa có tín hiệu hoạt động hoặc chưa có mapping ma trận Annunciator trong bộ tài liệu hiện tại.</p>',btn('ACK','ack')+btn('CLOSE','close-modal'));}
 else if(action==='network')networkModal(node.dataset.key);
 else if(action==='toggle-network'){const key=node.dataset.key,r=plant.setNetwork(key,!plant.network[key]);if(plant.communicationOK&&plant.alarms.some(a=>a.code==='CCR_UNAVAILABLE'))achievements[selected].restored=true;closeModal();feedback(r);}
 else if(action==='system-device')openModal(node.dataset.key,'SYSTEM ARCHITECTURE','<p>Thiết bị đang ở mức tham chiếu cấu trúc; chưa mô phỏng đầy đủ phần cứng/giao thức hoặc tín hiệu chẩn đoán tương ứng.</p>',btn('CLOSE','close-modal'));
 else if(action==='cabinet')openPage(node.dataset.scope==='U#1'||node.dataset.scope==='U#2'?'unitdiag':'gateway',Number(node.dataset.unit),1,node.dataset.scope);
 else if(action==='module'){const key=node.dataset.module,on=st.sensorFaults[key];openModal(key,'I/O MODULE / '+node.dataset.type,`<p>STATUS: ${on?'DEVICE ERROR':'NORMAL'}</p><p>Vị trí rack và chủng loại tham chiếu HMI. Chưa có bảng địa chỉ kênh I/O thực để suy diễn thiết bị công nghệ bị ảnh hưởng.</p>`,btn(on?'RESTORE MODULE':'SIMULATE MODULE ERROR','toggle-module',`data-module="${key}"`)+btn('CLOSE','close-modal'));}
 else if(action==='toggle-module'){const key=node.dataset.module;st.sensorFaults[key]=!st.sensorFaults[key];u().alarm('MODULE_'+key,st.sensorFaults[key],'I/O MODULE '+key+' DEVICE ERROR');closeModal();renderPage();}
 else if(action==='agc-on'){const on=!st.agc.on,r=u().enableAGC(on);if(r.ok&&on)achievements[selected].agcOn=true;if(r.ok)closeModal();feedback(r);}
 else if(action==='agc-select')feedback(u().selectAGC(node.dataset.on==='1'));
 else if(action==='a0-send'){const v=['p','q','u'].map(k=>$('#a0-'+k).value.trim()?Number($('#a0-'+k).value):NaN),r=u().applyA0(...v);if(r.ok)achievements[selected].a0=true;feedback(r);}
 else if(action==='agc-return')feedback(u().enableAGC(false));
 else if(action==='penstock-check'){const key=node.dataset.key;plant.penstock[key]=!plant.penstock[key];plant.log('INSTRUCTOR','PENSTOCK '+key+' = '+plant.penstock[key]);renderPage();}
 else if(action==='penstock')feedback(plant.setPenstock(Number(node.dataset.target)));
 else if(action==='force-vh')feedback(plant.forcePenstock());
 else if(action==='clear-force'){plant.penstock.forced=false;plant.log('FORCE','CANCEL FORCE VH OPEN');renderPage();}
 else if(action==='vh-signal'){plant.penstock.signal=!plant.penstock.signal;plant.units.forEach(v=>v.refreshAlarms());plant.log('INSTRUCTOR','VH SIGNAL '+(plant.penstock.signal?'GOOD':'BAD'));renderPage();}
 else if(action==='compressor'){st.compressor=!st.compressor;u().log('INSTRUCTOR','COMPRESSOR '+(st.compressor?'READY':'NOT READY'));renderPage();}
 else if(action==='diesel')equipmentFace('DG');
 else if(action==='equipment-info')openModal(node.dataset.label,'STATION SERVICE / REFERENCE','<p>Chưa có mô hình chuyển nguồn và liên động đóng cắt được đối chiếu sơ đồ hoàn công. Thiết bị này hiện chỉ dùng để tham chiếu trong hướng dẫn BS.</p>',btn('CLOSE','close-modal'));
 else if(action==='guide'){achievements[selected].guide=true;showGuide(node.dataset.mode);}
 else if(action==='sync-panel')syncModal();
 else if(action==='sync-mode'){if(u().controlBlockers().length)toast(u().controlBlockers().join('; '),true);else{st.syncMode=node.dataset.value;u().log('COMMAND','43-25 '+st.syncMode);syncModal();}}
 else if(action==='sync-adjust'){if(st.syncMode!=='MANUAL')toast('Chọn MANUAL trước.',true);else if(u().controlBlockers().length)toast(u().controlBlockers().join('; '),true);else{st.df=approach(st.df,0,.05,1);st.angle=approach(st.angle,0,20,1);u().log('COMMAND','Manual synchronization adjustment');syncModal();}}
 else if(action==='manual-sync'){const r=u().manualSync();if(r.ok)closeModal();feedback(r);}
 else if(action==='gov'){if(['ISOLATED','INLET'].includes(node.dataset.value))openModal('GOV MODE '+node.dataset.value,'REFERENCE MODE','<p>Chế độ này hiện chưa có bộ điều khiển tương ứng được xác minh. Bài tập hỗ trợ điều khiển tải nối lưới, giới hạn cánh hướng và điều tần giản lược.</p>',btn('CLOSE','close-modal'));else selectorModal('gov',node.dataset.value==='NETWORK'?'network':'gov',node.dataset.value);}
 else if(action==='export')exportEvents();
 else if(action==='export-trend')exportTrend();
 else if(action==='export-report')exportReport();
 else if(action==='download-self'){const clone=document.documentElement.cloneNode(true);clone.querySelector('#modal').removeAttribute('open');clone.querySelector('#modal-content').innerHTML='';clone.querySelector('#trainer').classList.remove('open');clone.querySelector('#toast').classList.remove('show');download('AVC_OTS_04_10_Overview_MainUnit_Home.html','<!doctype html>\n'+clone.outerHTML,'text/html;charset=utf-8');}
 else if(action==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Trình duyệt chưa cho phép toàn màn hình; có thể dùng F11.');}}
 if(action==='nav'&&$('#modal').open)closeModal();
});
document.addEventListener('input',event=>{const e=event.target;if(e.dataset.audioVolume){const key=e.dataset.audioVolume;sound.set(key,Number(e.value)/100);const out=$('[data-audio-output="'+key+'"]');if(out)out.textContent=e.value+'%';}if(e.dataset.draft)a0Draft[selected][e.dataset.draft]=e.value;});
document.addEventListener('focusin',event=>{if(['soe-area0425','soe-type0425','soe-query0425'].includes(event.target.id))soeHold0425=true;});
document.addEventListener('change',event=>{
 const e=event.target;if(e.matches('[data-audio-enabled]'))sound.set('enabled',e.checked);else if(e.id==='page-select')openPage(e.value);
 else if(e.id==='setup-lesson'){const c=readSetup();setupDraft={...lessonPreset(c.lesson,c.unit),operator:c.operator,method:c.method,dynamics:c.dynamics,thermal:c.thermal};showSetup();}
 else if(e.id==='setup-unit'){setupDraft=readSetup();setupDraft.states=lessonPreset(setupDraft.lesson,setupDraft.unit).states;setupDraft.fault.unit=setupDraft.unit;showSetup();}
 else if(e.id==='station-select'){if(e.value.startsWith('U')){plant.station='UMDU';plant.localUnit=Number(e.value[1]);}else plant.station=e.value;plant.record('AUTHORITY','STATION VIEW '+e.value);authorityModal();updateBindings();}
 else if(e.id==='role-select'){plant.role=e.value;plant.record('AUTHORITY','TRAINING ROLE '+e.value);authorityModal();updateBindings();}
});
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.id==='edit-input'){$('[data-action="apply-edit"]').click();event.preventDefault();}else if(['Enter',' '].includes(event.key)&&event.target.matches('.dx-device')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}else if(['Enter',' '].includes(event.key)&&event.target.matches('.hmi-value[data-action="tag"],.hmi-value[data-action="edit"]')){event.preventDefault();event.target.click();}else if(event.key==='F1'){event.preventDefault();showHelp();}});
$('#area-selector').innerHTML=AREAS.map(area=>`<button data-action="${area==='ALL'?'alarms-all':'ann'}" data-scope="${area}" data-part="1"><span>${area}</span><b class="area-counter" data-area-counter="${area}">−</b></button>`).join('');
$('#mini-meters-body').innerHTML=[0,1].map(index=>`<tr><th>U#${index+1}</th>${[['rpm',0],['p',1],['q',1],['frequency',2],['pf',2],['kv',2]].map(([key,d])=>`<td><span data-tag="${key}" data-unit="${index}" data-dec="${d}" class="hmi-value" style="min-width:0;width:100%;border:0;background:none;padding:0;text-align:center;font-size:inherit;color:inherit" data-action="tag" role="button" tabindex="0"></span></td>`).join('')}</tr>`).join('');
const toolbar=document.querySelector('.tool-bar');toolbar.querySelector('[data-action="silence"]').insertAdjacentHTML('afterend',btn('ÂM THANH','audio-settings')); toolbar.insertAdjacentHTML('beforeend',stationControlsHTML()+btn('BÀI THỰC HÀNH','workflow'));
openPage('home');
showSetup();
let lastTick=performance.now(),accumulator=0;
setInterval(()=>{
 const now=performance.now(),elapsed=Math.min((now-lastTick)/1000,.5);lastTick=now;
 if(!paused){accumulator+=elapsed*speed;while(accumulator>=.1){plant.tick(.1);accumulator-=.1;plant.units.forEach((unit,index)=>{const st=unit.s;if(unit.scenario==='cooling'&&st.t>=8&&!st.injections.cooling){st.injections.cooling=true;unit.setFault('cooling',true);if(index===selected)toast('U#'+(index+1)+' COOLING WATER FLOW NOT LOW',true);}if(st.events.some(e=>e.message.includes('SC→G hoàn thành')))achievements[index].scReturned=true;});}}
 sound.update(plant,{paused,hidden:document.hidden});updateSoundUI();updateBindings();frame++;
 if(frame%10===0){updateTrainerProgress();const active=document.activeElement,editing=active&&$('#page-surface').contains(active)&&['INPUT','SELECT'].includes(active.tagName);if(!editing&&!(route.page==='events'&&soeHold0425)&&!(route.page==='ann'&&route.scope==='SWYD')&&!$('#modal').open&&['ann','alarms','events','trend','agc','report'].includes(route.page))renderPage();}
},100);

document.addEventListener('visibilitychange',()=>{sound.update(plant,{paused,hidden:document.hidden});});
document.addEventListener('submit',event=>{if(event.target.id==='setup-form'){event.preventDefault();beginSession(readSetup());}});
$('#modal').addEventListener('cancel',()=>{pendingSelector=null;modalKey=null;permitKey=null;});
$('#session-file').addEventListener('change',async event=>{const f=event.target.files[0];if(!f)return;try{if(f.size>5000000)throw new Error('Tệp phiên quá lớn.');const data=JSON.parse(await f.text());plant.importState(data);sound.reset(plant);setupDraft=clone(plant.session);selected=plant.session.unit;speed=plant.session.speed;paused=true;accumulator=0;lastTick=performance.now();restoreTrainingState(data.training);tagCache.clear();$('#training-home').hidden=true;document.body.classList.remove('training-mode');openPage('control',selected);toast('Đã nạp phiên; đang tạm dừng. Kiểm tra và nhấn ▶ để tiếp tục.');}catch(error){toast('Không nạp được phiên: '+error.message,true);}finally{event.target.value='';}});

function plcInputsHTML(){return [['waterOpen','88CWV · van nước mở'],['liftRun','88QT · bơm nâng trục chạy'],['liftPressure','63QT · áp lực nâng trục'],['upperLow','LOW · nước ổ hướng trên'],['lowerLow','LOW · nước ổ hướng dưới'],['airLow','LOW · làm mát không khí'],['speed90','DI0313 · tốc độ'],['inletOpen','33HA · van tuabin mở'],['breakerClosed','901/902 · phản hồi đóng'],['gateClosed','65LB · cánh hướng đóng'],['waterDepressed','WATER DEPRESSED']].map(([key,label])=>`<div class="trainer-row"><span>${label}</span>${btn('INPUT','plc-input',`data-input="${key}"`)}</div>`).join('');}
function legacyPlcInputModal0410(key){const st=s(),d=u().devices,map={waterOpen:d.waterValve.on,liftRun:d.lift.on,liftPressure:st.liftPressure>.98,upperLow:!st.flowUpper,lowerLow:!st.flowLower,airLow:!st.flowAir,speed90:st.rpm>plant.profile.speedExcitation*plant.profile.rpm,inletOpen:d.inlet.on,breakerClosed:d.breaker.on,gateClosed:d.gate.closed,waterDepressed:st.draft<47.85},raw=u().raw(key,map[key]);openModal(esc(raw.tag),'PLC FEEDBACK · OTS INSTRUCTOR',`<p>RAW = <b>${+raw.value}</b> · QUALITY = <b>${raw.quality}</b></p><p>Thay phản hồi hoặc chất lượng đầu vào để luyện tìm nguyên nhân kẹt bước. Lệnh và chuyển động thiết bị vẫn được mô phỏng riêng.</p><p>Nhánh LOW được xử lý đảo. BAD không được dùng để xác nhận điều kiện đạt.</p>`,['auto','off','on','bad'].map(mode=>btn(mode.toUpperCase(),'input-override',`data-input="${key}" data-mode="${mode}"`)).join('')+btn('CLOSE','close-modal'));}
function plcInputModal(key){return plcInputModal0411(key);}
function sessionSnapshot(){const data=plant.exportState();data.training={achievements:clone(achievements),a0Draft:clone(a0Draft),selected,route:clone(route),speed,epoch};return data;}
function restoreTrainingState(t){achievements[0]={};achievements[1]={};a0Draft[0]={};a0Draft[1]={};if(!t||typeof t!=='object')return;if(Array.isArray(t.achievements)&&t.achievements.length===2)t.achievements.forEach((obj,i)=>{if(obj&&typeof obj==='object')for(const [k,v] of Object.entries(obj))if(/^[a-zA-Z0-9]{1,40}$/.test(k)&&typeof v==='boolean')achievements[i][k]=v;});if(Array.isArray(t.a0Draft)&&t.a0Draft.length===2)t.a0Draft.forEach((obj,i)=>{if(obj&&typeof obj==='object')for(const k of ['p','q','u'])if(typeof obj[k]==='string'&&obj[k].length<30&&(obj[k]===''||Number.isFinite(Number(obj[k]))))a0Draft[i][k]=obj[k];});if([0,1].includes(t.selected))selected=t.selected;if([1,2,5,10].includes(t.speed))speed=t.speed;if(Number.isFinite(t.epoch)&&t.epoch>0&&t.epoch<9e12)epoch=t.epoch;}

