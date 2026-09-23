import { evaluateBreaker as sharedEvaluateBreaker, recommendBreaker, deriveBreakerType, generateSections, getBusbarRule, getPhysicalDimensions, getRuleAudit, buildDesignExport, getDesignConfigurationSchema, getConfigurationCompleteness, validateDesignConfiguration, getAvailableManufacturerDimensions } from './manufacturer-rules.js';
import { buildGaViewModel } from './ga-view-model.js';
import { renderProfessionalGa } from './ga-renderer.js';
import { FUNCTIONS, FUNCTION_OPTIONS, busForFunction, renumberBreakersBySwitchboard } from './topology.js';
import { BUS_RATINGS, applySwitchboardAssignment, breakerDisplayLabel, cableRouteLabel, designStatus, ensureSwitchboardState, proposedSwitchboardAssignment, ratedMainBus, revertRatedMainBus, setRatedMainBus, switchboardIds, updateDefaultMainBus } from './ux-state.js';

const SIEMENS_MCCB=['3VA1563','3VA2563','3VA1580','3VA2580','3VA1510','3VA2510'];
const AUDIT=getRuleAudit();
const key='switchboard-data-v2',projectKey='switchboard-project-v2';
function busbarRule(boardId,bus){return getBusbarRule(project,boardId,bus)}
function saveBusbarPosition(boardId,bus,value){setBoardConfiguration(boardId,'busbarPositions',value,bus)}
function uid(){return globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():`breaker-${Date.now()}-${Math.random().toString(36).slice(2)}`}let project=ensureSwitchboardState(loadProject());let data=loadBreakers();let selected=0;let dragId=null;let pointerTargetId=null;let pointerAfter=false;let selectedGa=null;let currentGaModel=null;let gaMode=['SCHEMATIC','PHYSICAL'].includes(project.gaView?.mode)?project.gaView.mode:'SCHEMATIC';let gaZoom=Math.max(50,Math.min(200,Number(project.gaView?.zoom)||100));
function loadProject(){
  const fallback={manufacturer:'ABB',system:'MNS R',mainBus:'6300 A',defaultRoute:'Bottom',quantity:1,configuration:{switchboards:{},breakers:{}},switchboards:{},currentDimensions:{heightMm:2400,depthMm:1200},gaView:{mode:'SCHEMATIC',zoom:100}};
  try{
    const p={...fallback,...JSON.parse(localStorage.getItem(projectKey)||'{}')};
    p.manufacturer=p.manufacturer==='Siemens'?'Siemens':'ABB';p.system=p.manufacturer==='ABB'?'MNS R':'SIVACON S8';p.quantity=p.quantity===2?2:1;
    const configuration=p.configuration||{switchboards:{},breakers:{}};
    if(p.busbarLayouts&&!Object.keys(configuration.switchboards||{}).length){configuration.switchboards={};Object.entries(p.busbarLayouts).forEach(([boardId,buses])=>{configuration.switchboards[boardId]={busbarPositions:{}};Object.entries(buses).forEach(([bus,item])=>configuration.switchboards[boardId].busbarPositions[bus]=item.selectedPosition||'')})}
    p.configuration={switchboards:configuration.switchboards||{},breakers:configuration.breakers||{}};
    return p;
  }catch{return fallback}
}function oldToObject(b){
  const legacy={Main_Input:'MAIN_INPUT',Gen_Input:'GEN_INPUT',UPS_Input:'UPS_INPUT',UPS_Output:'UPS_OUTPUT',Loadbank:'LOADBANK',Bypass:'BYPASS',UPS_Input_Load:'UPS_INPUT_LOAD',UPS_Output_Load:'UPS_OUTPUT_LOAD'};
  const f=FUNCTION_OPTIONS.includes(b[1])?b[1]:(legacy[b[1]]||'UPS_INPUT_LOAD');
  return{internalId:uid(),id:b[0],function:f,series:b[4],frame:b[5],rating:b[6],pole:b[7],type:b[8],direction:FUNCTIONS[f].direction,route:['Top','Bottom'].includes(b[9])?b[9]:project.defaultRoute,routeMode:['Top','Bottom'].includes(b[9])?'explicit':'default',connection:'Cable',entry:b[9]||'Top',cableSize:b[10]||'',cableQty:b[11]||'1',section:'',switchboardId:'SWB-01',assignmentMode:'inherited',bus:busForFunction(f)}
}function normalize(b){
  const x=b.id?{...b}:oldToObject(b);x.internalId=x.internalId||uid();x.switchboardId=x.switchboardId||'SWB-01';x.assignmentMode=x.assignmentMode||'inherited';x.function=FUNCTIONS[x.function]?x.function:'UPS_INPUT_LOAD';x.bus=x.busRole||x.bus||busForFunction(x.function);x.busRole=x.bus;x.direction=FUNCTIONS[x.function].direction;
  if(x.route==='INHERIT'||!['Top','Bottom'].includes(x.route)){x.route=project.defaultRoute;x.routeMode='default'}else{x.routeMode=x.routeMode||'explicit'}
  x.type=deriveType(x);x.seriesMode=x.seriesMode||'auto';x.frameMode=x.frameMode||'auto';if(x.seriesMode==='auto'&&x.frameMode==='auto')applyRecommendation(x);x.connection=x.connection||'Cable';x.entry=x.entry||'Top';return x
}function loadBreakers(){try{const x=JSON.parse(localStorage.getItem(key));if(Array.isArray(x)&&x.length)return x.map(normalize);const old=JSON.parse(localStorage.getItem('switchboard-data'));if(Array.isArray(old)&&old.length)return old.map(normalize)}catch{}return defaults()}
function defaults(){return[['CB-01','MAIN_INPUT','ABB','MNS R','Emax 2','E6.2','6300A','4P','ACB','Bottom','300 mm2','4'],['CB-02','GEN_INPUT','ABB','MNS R','Emax 2','E1.2','1250A','4P','ACB','Bottom','185 mm2','2'],['CB-03','UPS_INPUT_LOAD','ABB','MNS R','Emax 2','E1.2','1250A','3P','ACB','Top','185 mm2','2'],['CB-04','BYPASS','ABB','MNS R','Emax 2','E1.2','1250A','4P','ACB','Top','185 mm2','2']].map(oldToObject)}function save(){localStorage.setItem(key,JSON.stringify(data));localStorage.setItem(projectKey,JSON.stringify(project))}
function effectiveRoute(b){return b.route}
function options(b,col){const m=project.manufacturer;if(col==='function')return FUNCTION_OPTIONS;if(col==='series')return m==='ABB'?['Emax 2','Tmax XT','Tmax T5','Tmax T6']:['SENTRON 3WA','SENTRON 3VA'];if(col==='frame'){if(m==='ABB'){if(b.series==='Emax 2')return['E1.2','E2.2','E4.2','E6.2'];if(b.series==='Tmax T5')return['T5 400A','T5 630A'];if(b.series==='Tmax T6')return['T6 630A'];return['XT1','XT2','XT3','XT4','XT5']}return b.series==='SENTRON 3WA'?['3WA1106','3WA1108','3WA1110','3WA1112','3WA1116','3WA1120','3WA1220','3WA1225','3WA1232','3WA1240','3WA1340','3WA1350','3WA1363']:SIEMENS_MCCB}if(col==='rating')return['16A','20A','25A','32A','40A','50A','63A','80A','100A','125A','160A','200A','250A','315A','400A','500A','630A','800A','1000A','1250A','1600A','2000A','2500A','3200A','4000A','5000A','6300A'];if(col==='pole')return['3P','4P'];if(col==='direction')return['Incoming','Outgoing'];if(col==='route')return['Top','Bottom'];if(col==='connection')return['Cable','Busbar / Busduct'];if(col==='bus')return['Input Bus','UPS Output Bus'];if(col==='switchboard')return project.quantity===2?['SWB-01','SWB-02']:['SWB-01'];return[]}
function evaluate(b){const result=sharedEvaluateBreaker(b,project);return {...result,source:{...result.source,pages:result.source.pdfPage||result.source.pages||'-'}}}function sortBreakers(){selected=Math.max(0,Math.min(selected,data.length-1))}
function deriveType(b){return deriveBreakerType(b.series)}
function ratingAmps(b){return Number.parseInt(String(b.rating).replace(/[^0-9]/g,''),10)||0}
function recommendation(b){return recommendBreaker({...b,manufacturer:project.manufacturer,system:project.system})}
function applyRecommendation(b){const r=recommendation(b);b.series=r.series;b.frame=r.frame;b.type=r.type;b.recommendationClass=r.classification}
function renumber(){renumberBreakersBySwitchboard(data);data.forEach((b,i)=>{b.section=`S${String(i+1).padStart(2,'0')}`})}
function selectValue(b,col){if(col==='function')return b.function;if(col==='series')return b.series;if(col==='frame')return b.frame;if(col==='rating')return b.rating;if(col==='pole')return b.pole;if(col==='direction')return b.direction;if(col==='route')return b.route;if(col==='connection')return b.connection;if(col==='bus')return b.bus;if(col==='switchboard')return b.switchboardId;return''}
function makeSelect(b,col){
  const select=document.createElement('select');select.dataset.col=col;
  options(b,col).forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=col==='function'?FUNCTIONS[value].label:col==='route'?cableRouteLabel(value):value;select.append(option)});
  select.value=selectValue(b,col);select.title=select.selectedOptions[0]?.textContent||select.value;return select;
}
function stateBadge(textValue,className=''){const badge=document.createElement('span');badge.className='state-badge '+className;badge.textContent=textValue;return badge}
function control(b,i,col){
  if(col==='cb'){const wrap=document.createElement('span');wrap.className='cb-cell';const handle=document.createElement('span');handle.className='drag-handle';handle.textContent='⋮⋮';handle.title='Drag to reorder';handle.setAttribute('aria-label','Drag to reorder');const label=document.createElement('b');label.textContent=b.id;wrap.append(handle,label);return wrap}
  if(['function','rating','pole','switchboard'].includes(col))return makeSelect(b,col);
  if(col==='series'||col==='frame'){
    const wrap=document.createElement('div');wrap.className='field-with-state';const select=makeSelect(b,col);const mode=col==='series'?b.seriesMode:b.frameMode;wrap.append(select,stateBadge(mode==='manual'?'MANUAL':'AUTO',mode));
    if(col==='series'&&(b.seriesMode==='manual'||b.frameMode==='manual')){const reset=document.createElement('button');reset.type='button';reset.className='inline-reset';reset.textContent='Revert to Auto';reset.title='Revert Series and Frame to shared-engine automatic recommendation';reset.addEventListener('click',event=>{event.stopPropagation();revertBreakerAuto(i)});wrap.append(reset)}
    return wrap;
  }
  if(col==='route'){
    const wrap=document.createElement('div');wrap.className='field-with-state route-state';wrap.append(makeSelect(b,col),stateBadge(b.routeMode==='default'?'Inherited':'Override',b.routeMode));
    if(b.routeMode!=='default'){const reset=document.createElement('button');reset.type='button';reset.className='inline-reset';reset.textContent='Revert to Inherited';reset.addEventListener('click',event=>{event.stopPropagation();revertRoute(i)});wrap.append(reset)}
    return wrap;
  }
  return null;
}function setBoardConfiguration(boardId,key,value,subKey){
  project.configuration=project.configuration||{switchboards:{},breakers:{}};
  project.configuration.switchboards=project.configuration.switchboards||{};
  const board=project.configuration.switchboards[boardId]||(project.configuration.switchboards[boardId]={});
  if(subKey){board[key]=board[key]||{};board[key][subKey]=value}else board[key]=value;
  render();
}
function setBreakerConfiguration(internalId,key,value){
  project.configuration=project.configuration||{switchboards:{},breakers:{}};
  project.configuration.breakers=project.configuration.breakers||{};
  const config=project.configuration.breakers[internalId]||(project.configuration.breakers[internalId]={});
  config[key]=value;
  render();
}
function configSelect(control,onChange){
  const select=document.createElement('select');const empty=document.createElement('option');empty.value='';empty.textContent='Select manufacturer configuration';select.append(empty);
  control.options.forEach(value=>{const option=document.createElement('option');option.value=String(value);option.textContent=typeof value==='number'?value+' mm':value;select.append(option)});
  select.value=String(control.value||'');select.title=select.selectedOptions[0]?.textContent||select.value;select.addEventListener('change',event=>onChange(event.target.value));return select;
}
function inlineIssue(issue,control){
  const box=document.createElement('div');box.className='inline-config-error';
  const alternatives=issue.validAlternatives?.length?issue.validAlternatives.join(', '):control.options.filter(value=>String(value)!==String(control.value)).join(', ');
  box.innerHTML='<b>Invalid configuration</b><span>Current Value: '+(issue.currentValue||control.value||'Not selected')+'</span><span>Conflict: '+issue.message+'</span><span>Manufacturer Rule: '+(issue.manufacturerRule||control.sourceRule||'Not specified in source metadata')+'</span><span>Valid Alternatives: '+(alternatives||'Manufacturer confirmation required')+'</span>';
  return box;
}
function renderBoardRatings(){
  const host=document.querySelector('#boardRatings');host.innerHTML='<div><p class="eyebrow">PHYSICAL SWITCHBOARD RATINGS</p><h3>Rated Main Bus Current</h3><p>Each switchboard inherits the project default until explicitly overridden.</p></div>';
  const cards=document.createElement('div');cards.className='board-rating-cards';
  switchboardIds(project).forEach(boardId=>{const state=project.switchboards[boardId];const card=document.createElement('label');card.className='board-rating-card';card.innerHTML='<b>'+boardId+'</b><span>Rated Main Bus Current</span>';const select=document.createElement('select');BUS_RATINGS.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)});select.value=ratedMainBus(project,boardId);select.addEventListener('change',event=>{setRatedMainBus(project,boardId,event.target.value);render()});card.append(select,stateBadge(state.ratingMode==='override'?'Override':'Inherited',state.ratingMode));if(state.ratingMode==='override'){const reset=document.createElement('button');reset.type='button';reset.className='inline-reset';reset.textContent='Revert to Project Default';reset.addEventListener('click',()=>{revertRatedMainBus(project,boardId);render()});card.append(reset)}cards.append(card)});
  host.append(cards);
}
function renderDesignConfiguration(){
  const host=document.querySelector('#designConfiguration');if(!host)return;
  const schema=getDesignConfigurationSchema(project,data),complete=getConfigurationCompleteness(project,data),validation=validateDesignConfiguration(project,data),available=getAvailableManufacturerDimensions(project),missing=complete.items.filter(item=>item.status==='Missing');
  const statusName=!validation.valid?'INVALID':missing.length?'INCOMPLETE':'VALID / MATCHED';host.innerHTML='';
  const head=document.createElement('div');head.className='config-summary';head.innerHTML='<div><p class="eyebrow">DESIGN CONFIGURATION</p><h3>Manufacturer Rule Matching</h3><p>Only configuration inputs required by the selected manufacturer rules are shown.</p></div><div class="completeness '+statusName.toLowerCase().replaceAll(/[^a-z]+/g,'-')+'"><small>DESIGN CONFIGURATION STATUS</small><b>'+statusName+'</b><span>Required '+complete.required+' · Resolved '+complete.resolved+' · Missing '+complete.missing+' · Not Applicable '+complete.notApplicable+'</span></div>';host.append(head);
  const grids=document.createElement('div');grids.className='config-grid';const sw=document.createElement('div');sw.className='config-panel';sw.innerHTML='<h4>SWITCHBOARD CONFIGURATION</h4>';
  schema.switchboards.forEach(board=>{if(!board.controls.length)return;const group=document.createElement('div');group.className='config-group';group.innerHTML='<b>'+board.boardId+'</b>';board.controls.forEach(control=>{const label=document.createElement('label');label.textContent=control.label;label.append(configSelect(control,value=>setBoardConfiguration(board.boardId,control.key,value,control.subKey)));const help=document.createElement('small');help.textContent=control.reason+' · '+control.sourceRule;label.append(help);validation.issues.filter(issue=>issue.scope===board.boardId&&issue.field==='Physical Busbar Position'&&control.key==='busbarPositions').forEach(issue=>label.append(inlineIssue(issue,control)));group.append(label)});sw.append(group)});
  if(!schema.switchboards.some(board=>board.controls.length))sw.insertAdjacentHTML('beforeend','<p class="config-empty">No switchboard configuration is required for the current design.</p>');
  const br=document.createElement('div');br.className='config-panel';br.innerHTML='<h4>BREAKER CONFIGURATION</h4>';
  schema.breakers.forEach(entry=>{const group=document.createElement('div');group.className='config-group';group.innerHTML='<b>'+entry.displayLabel+' · '+entry.series+' · '+entry.frame+'</b>';entry.controls.forEach(control=>{const label=document.createElement('label');label.textContent=control.label;label.append(configSelect(control,value=>setBreakerConfiguration(entry.internalId,control.key,value)));const help=document.createElement('small');help.textContent=control.reason+' · '+control.sourceRule;label.append(help);validation.issues.filter(issue=>issue.internalId===entry.internalId).forEach(issue=>label.append(inlineIssue(issue,control)));group.append(label)});br.append(group)});
  if(!schema.breakers.length)br.insertAdjacentHTML('beforeend','<p class="config-empty">No breaker-specific configuration is required for the current selection.</p>');grids.append(sw,br);host.append(grids);
  const status=document.createElement('div');status.className='config-status '+(statusName==='INVALID'?'invalid':statusName==='INCOMPLETE'?'incomplete':'valid');status.innerHTML='<b>'+statusName+'</b><span>'+(statusName==='VALID / MATCHED'?'No conflicts and required manufacturer conditions resolved.':statusName==='INCOMPLETE'?'No conflicts detected — configuration incomplete.':'Invalid Manufacturer Configuration.')+'</span>';
  if(validation.issues.length){const title=document.createElement('strong');title.textContent='Invalid Conditions';status.append(title);const list=document.createElement('ul');validation.issues.forEach(issue=>{const item=document.createElement('li');item.textContent=issue.scope+' · '+issue.message;list.append(item)});status.append(list)}
  if(missing.length){const title=document.createElement('strong');title.textContent='Missing Conditions';status.append(title);const list=document.createElement('ul');missing.forEach(item=>{const li=document.createElement('li');li.textContent=item.scope+' · '+item.label;list.append(li)});status.append(list)}
  const dims=document.createElement('div');dims.className='dimension-status';const a=available.availableConfigurations;dims.innerHTML='<div><b>Current Design Dimension</b><span>'+getPhysicalDimensions(project).heightMm+' × '+getPhysicalDimensions(project).depthMm+' mm · User Defined</span></div><div><b>Manufacturer-Listed Dimensions</b><span>'+(a?.heightsMm?'H '+a.heightsMm.join('/')+' mm · ':'Not available · ')+(a?.widthsMm?'W '+a.widthsMm.join('/')+' mm · ':'')+(a?.depthsMm?'D '+a.depthsMm.join('/')+' mm':'')+'</span><small>Not matched to current configuration</small></div><div><b>Matched Manufacturer Dimension</b><span>None matched</span></div>';status.append(dims);host.append(status);
}function revertBreakerAuto(index){const breaker=data[index];breaker.seriesMode='auto';breaker.frameMode='auto';applyRecommendation(breaker);const cfg=project.configuration?.breakers?.[breaker.internalId];if(cfg){delete cfg.cubicleWidthMm;delete cfg.mountingDesign}render()}
function revertRoute(index){data[index].routeMode='default';data[index].route=project.defaultRoute;render()}
function edit(i,col,value){
  const b=data[i];
  if(col==='function'){b.function=value;b.direction=FUNCTIONS[value].direction;b.bus=busForFunction(value);b.busRole=b.bus}
  else if(col==='route'){b.route=value;b.routeMode='explicit'}
  else if(col==='switchboard'){b.switchboardId=value;b.assignmentMode='explicit'}
  else b[col]=value;
  if(col==='rating'&&b.seriesMode!=='manual'&&b.frameMode!=='manual')applyRecommendation(b);
  if(col==='series'){b.series=value;b.seriesMode='manual';b.frame=options(b,'frame')[0];b.frameMode='manual';b.type=deriveType(b)}
  if(col==='frame'){b.frameMode='manual';b.type=deriveType(b)}
  if(['series','frame','pole','rating'].includes(col)){const cfg=project.configuration?.breakers?.[b.internalId];if(cfg){delete cfg.cubicleWidthMm;if(col==='series'||col==='frame')delete cfg.mountingDesign}}
  render();
}
function wireDrag(tr,b){
  tr.addEventListener('pointerdown',event=>{if(!event.target.closest('.drag-handle'))return;event.preventDefault();dragId=b.internalId;tr.classList.add('dragging');const move=pointer=>{const target=document.elementFromPoint(pointer.clientX,pointer.clientY)?.closest('#rows tr');document.querySelectorAll('#rows tr').forEach(row=>row.classList.remove('drag-over-before','drag-over-after'));if(!target||target.dataset.internalId===dragId)return;pointerTargetId=target.dataset.internalId;const rect=target.getBoundingClientRect();pointerAfter=pointer.clientY>=rect.top+rect.height/2;target.classList.add(pointerAfter?'drag-over-after':'drag-over-before')};const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.querySelectorAll('#rows tr').forEach(row=>row.classList.remove('dragging','drag-over-before','drag-over-after'));if(pointerTargetId)reorder(dragId,pointerTargetId,pointerAfter);dragId=null;pointerTargetId=null};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up)});
  tr.addEventListener('dragstart',event=>{dragId=b.internalId;tr.classList.add('dragging');event.dataTransfer?.setData('text/plain',b.internalId)});
  tr.addEventListener('dragover',event=>{event.preventDefault();if(dragId===b.internalId)return;const rect=tr.getBoundingClientRect(),after=event.clientY>=rect.top+rect.height/2;tr.classList.toggle('drag-over-before',!after);tr.classList.toggle('drag-over-after',after)});
  tr.addEventListener('dragleave',()=>tr.classList.remove('drag-over-before','drag-over-after'));
  tr.addEventListener('drop',event=>{event.preventDefault();const sourceId=event.dataTransfer?.getData('text/plain')||dragId;const after=event.clientY>=tr.getBoundingClientRect().top+tr.getBoundingClientRect().height/2;tr.classList.remove('drag-over-before','drag-over-after');reorder(sourceId,b.internalId,after);dragId=null});
  tr.addEventListener('dragend',()=>{dragId=null;tr.classList.remove('dragging','drag-over-before','drag-over-after')});
}
function render(){
  sortBreakers();renumber();renderBoardRatings();const rows=document.querySelector('#rows');rows.innerHTML='';
  data.forEach((b,i)=>{const tr=document.createElement('tr');tr.className=i===selected?'selected':'';tr.draggable=true;tr.dataset.internalId=b.internalId;wireDrag(tr,b);
    ['cb','switchboard','function','rating','series','frame','pole','route'].forEach(col=>{const td=document.createElement('td');const component=control(b,i,col);if(component){td.append(component);const select=component.matches?.('select')?component:component.querySelector?.('select');if(select)select.addEventListener('change',event=>edit(i,col,event.target.value));if(col==='cb')td.addEventListener('click',()=>{selected=i;updateInspector()})}tr.append(td)});
    const actions=document.createElement('td');const duplicateButton=document.createElement('button');duplicateButton.textContent='Duplicate';duplicateButton.addEventListener('click',event=>{event.stopPropagation();duplicate(i)});const deleteButton=document.createElement('button');deleteButton.textContent='Delete';deleteButton.addEventListener('click',event=>{event.stopPropagation();remove(i)});actions.append(duplicateButton,deleteButton);tr.append(actions);tr.addEventListener('click',event=>{if(!event.target.matches('input,select,button')){selected=i;updateInspector()}});rows.append(tr)});
  renderDesignConfiguration();renderGA();document.querySelector('#oneBoard').classList.toggle('active',project.quantity===1);document.querySelector('#twoBoards').classList.toggle('active',project.quantity===2);updateInspector();renderAudit();save();
}function renderGA(){
  const boardSections=switchboardIds(project).map(boardId=>({boardId,sections:sections(boardId)}));
  const allSections=boardSections.flatMap(board=>board.sections),combined=allSections.reduce((sum,section)=>sum+section.width,0),physicalDimensions=getPhysicalDimensions(project);
  currentGaModel=buildGaViewModel({project,breakers:data,boardSections,busRules:busbarRule,evaluations:evaluate,dimensions:physicalDimensions});currentGaModel.mode=gaMode;
  document.querySelector('#count').textContent=data.length+' breakers';
  document.querySelector('#inheritNote').textContent=project.quantity+' switchboard'+(project.quantity===1?'':'s')+' · '+project.manufacturer+' · '+project.system+' · Inherited Cable Route '+cableRouteLabel(project.defaultRoute);
  const widths=currentGaModel.boards.map(board=>board.id+' Width '+board.totalWidthMm+' mm');
  document.querySelector('#widthLabel').textContent=project.quantity===2?'Per-Switchboard Width':'Switchboard Width';
  document.querySelector('#total').innerHTML=project.quantity===2?widths.map(value=>'<span>'+value+'</span>').join('')+'<i>Combined Planning Width '+combined+' mm</i>':currentGaModel.boards[0].totalWidthMm+' <i>mm</i>';
  document.querySelector('#gaTotal').textContent=project.quantity===2?widths.join(' · ')+' · Combined Planning Width '+combined+' mm':widths[0];
  document.querySelector('#sections').textContent=allSections.length;document.querySelector('#breakerCount').textContent=data.length;document.querySelector('#busLabel').textContent='Project Default '+project.mainBus;
  const completeness=getConfigurationCompleteness(project,data),validation=validateDesignConfiguration(project,data),status=designStatus(project,data,evaluate,validation,completeness),counts=status.confidenceSummary;
  document.querySelector('#designStatus').textContent=status.designStatus;
  document.querySelector('#confidenceCounts').textContent='Manufacturer Matched '+counts.manufacturerMatched+' · Confirmation Required '+counts.confirmationRequired+' · Engineering Estimate '+counts.engineeringEstimate+' · Invalid '+counts.invalid;
  document.querySelector('#criticalItems').textContent=status.unresolvedConditions.length?status.unresolvedConditions.length+' unresolved manufacturer condition(s)':'No unresolved critical items';
  const dimensionNode=document.querySelector('#physicalDimensions');if(dimensionNode)dimensionNode.innerHTML=physicalDimensions.heightMm+' <i>× '+physicalDimensions.depthMm+' mm · '+physicalDimensions.classification+'</i>';
  const config=document.querySelector('#busbarConfig');config.innerHTML='';
  currentGaModel.boards.forEach(board=>{if(!board.buses.length)return;const card=document.createElement('div');card.className='busbar-board-config';card.innerHTML='<b>'+board.id+' · Rated Main Bus '+board.ratedMainBus+' · Electrical / physical busbar configuration</b>';board.buses.forEach(bus=>{const item=document.createElement('button');item.type='button';item.className='busbar-config-item';item.innerHTML='<strong>'+bus.id+' · '+bus.role+'</strong><span>Physical position: '+bus.physicalPosition+'</span><small>'+bus.sourceRule+' · '+bus.confidence+'</small>';item.addEventListener('click',()=>selectBus(bus,board));card.append(item)});config.append(card)});
  document.querySelector('#gaSchematic').classList.toggle('active',gaMode==='SCHEMATIC');document.querySelector('#gaPhysical').classList.toggle('active',gaMode==='PHYSICAL');document.querySelector('#gaZoomLabel').textContent=gaZoom+'%';
  renderProfessionalGa(document.querySelector('#ga'),currentGaModel,{mode:gaMode,zoom:gaZoom,selected:selectedGa,onSelectSection:selectSection,onSelectBus:selectBus});
}function sections(boardId){return generateSections(data,project,boardId).map(section=>({...section,items:section.items.map(item=>data.indexOf(item))}))}function traceLines(title,values){
  const entries=Array.isArray(values)?values:Object.entries(values||{}).map(([key,value])=>key+': '+value);
  return '<div class="trace-group"><small>'+title+'</small>'+(entries.length?entries.map(value=>'<span>'+value+'</span>').join(''):'<span>None</span>')+'</div>';
}
function sourceTraceHtml(ruleId,source={},extra={}){
  const value=value=>value===undefined||value===null||value===''?'Not specified in source metadata':value;
  return traceLines('SOURCE TRACE',{ruleId:value(ruleId),manufacturer:value(source.manufacturer||project.manufacturer),system:value(source.system||project.system),document:value(source.document||source.sourceDocument),revision:value(source.revision),pdfPage:value(source.pdfPage||source.pages),printedPage:value(source.printedPage),section:value(source.section||source.chapter),table:value(extra.table||source.table),figure:value(extra.figure||source.figure)});
}
function applyTrace(title,b,e,bar,section){
  document.querySelector('#selectedTitle').textContent=title;const inputs=[b.series,b.frame,b.rating,b.pole,b.type,'Function: '+FUNCTIONS[b.function].label,'Cable Route: '+cableRouteLabel(b.route),'Rated Main Bus: '+ratedMainBus(project,b.switchboardId)];const config=e.userConfiguration||{};
  const engineeringResult={ruleId:e.ruleId,confidence:e.confidence,classification:e.classification};
  if(e.confidence==='Manufacturer Verified')engineeringResult.finalWidth=e.widthMm+' mm';else if(e.widthMm)engineeringResult.provisionalPlanningWidth=e.widthMm+' mm · Engineering Estimate';
  if(e.operationalCurrent!=null)engineeringResult.operationalCurrent=e.operationalCurrent+' A';if(e.operationalCurrentStatus)engineeringResult.operationalCurrentStatus=e.operationalCurrentStatus;
  document.querySelector('#spec').innerHTML='<b>'+project.manufacturer+' '+project.system+'</b>'+traceLines('INPUTS',inputs)+traceLines('DERIVED INPUTS',e.derivedInputs||{circuitRole:b.direction,entryDirection:b.route,electricalBusRole:b.bus})+traceLines('USER CONFIGURATION',config)+traceLines('MATCHED MANUFACTURER CONDITIONS',e.matchedConditions||[])+traceLines('ENGINEERING RESULT',engineeringResult)+traceLines('MISSING CONDITIONS',e.missingParameters||[])+(section?'<span>Section: '+section.id+' · '+section.width+' mm · '+section.confidence+'</span>':'')+'<span>Physical Busbar Position: '+bar.physicalPosition+'</span>';
  document.querySelector('#min').textContent=e.manufacturerBaseSize;const resultText=e.confidence==='Manufacturer Verified'?(section?section.width+' mm':e.finalRecommendation):e.widthMm?e.widthMm+' mm · Provisional Planning Width · Engineering Estimate':e.finalRecommendation;document.querySelector('#rec').textContent=resultText;document.querySelector('#rule').textContent=e.ruleId;document.querySelector('#why').textContent='RESULT: '+resultText+' · CONFIDENCE: '+e.confidence+' · '+e.matchedRule+' · Busbar: '+bar.manufacturerRule;document.querySelector('#source').innerHTML=sourceTraceHtml(e.ruleId,e.source,{table:e.table,figure:e.figure});
}
function selectSection(section){selectedGa={type:'section',key:section.key};const first=section.breakers[0],index=data.findIndex(item=>item.internalId===first?.internalId);if(index>=0)selected=index;renderGA();updateInspector()}
function applyBusTrace(bus,board){
  document.querySelector('#selectedTitle').textContent=board.id+' · '+bus.id+' · '+bus.role;document.querySelector('#spec').innerHTML=traceLines('BUS ROLE',[bus.role,'Electrical bus: '+bus.name,'Rated Main Bus: '+bus.rating])+traceLines('PHYSICAL CONFIGURATION',['Physical position: '+bus.physicalPosition,bus.userSelected?'Manufacturer-Supported · User Selected':'No manufacturer-required position is implied'])+traceLines('SOURCE RULE',[bus.sourceRule,bus.manufacturerRule]);document.querySelector('#min').textContent='Not a sizing result';document.querySelector('#rec').textContent=bus.physicalPosition;document.querySelector('#rule').textContent=bus.sourceRule;document.querySelector('#why').textContent='LAYOUT RESULT: '+bus.physicalPosition+' · CONFIDENCE: '+bus.confidence+' · '+bus.manufacturerRule;document.querySelector('#source').innerHTML=sourceTraceHtml(bus.sourceRule,bus.source||{});
}
function selectBus(bus,board){selectedGa={type:'bus',key:bus.key};renderGA();updateInspector()}
function updateInspector(){
  if(selectedGa&&currentGaModel){
    if(selectedGa.type==='section'){const section=currentGaModel.boards.flatMap(board=>board.sections).find(item=>item.key===selectedGa.key);if(section){const b=data.find(item=>item.internalId===section.breakers[0]?.internalId),e=b&&evaluate(b),bar=b&&busbarRule(section.boardId,section.busName);if(b&&e&&bar){applyTrace(section.boardId+' / '+section.id+' · '+breakerDisplayLabel(b)+' · '+section.busName,b,e,bar,section.rawSection);return}}}
    if(selectedGa.type==='bus'){for(const board of currentGaModel.boards){const bus=board.buses.find(item=>item.key===selectedGa.key);if(bus){applyBusTrace(bus,board);return}}}selectedGa=null;
  }
  if(!data[selected])return;const b=data[selected],e=evaluate(b),bar=busbarRule(b.switchboardId,b.bus);applyTrace(breakerDisplayLabel(b)+' · '+FUNCTIONS[b.function].label,b,e,bar,null);
}function renderAudit(){const body=document.querySelector('#ruleAuditRows');body.innerHTML='';AUDIT.forEach(r=>{const tr=document.createElement('tr');[r.id,r.result,r.source,r.classification,r.usedBy,r.action].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});body.append(tr)})}
function reorder(sourceId,targetId,after){const from=data.findIndex(x=>x.internalId===sourceId),to=data.findIndex(x=>x.internalId===targetId);if(from<0||to<0||from===to)return;const item=data.splice(from,1)[0];let insert=to+(after?1:0);if(from<insert)insert-=1;data.splice(insert,0,item);selected=insert;render()}function duplicate(i=selected){const source=data[i],b={...source,id:nextId(),internalId:uid()};const sourceConfig=project.configuration?.breakers?.[source.internalId];if(sourceConfig){project.configuration.breakers[b.internalId]={...sourceConfig}}data.splice(i+1,0,b);selected=i+1;render()}
function nextId(){let n=1;while(data.some(b=>b.id===`CB-${String(n).padStart(2,'0')}`))n++;return`CB-${String(n).padStart(2,'0')}`}
function remove(i){if(data.length<=1)return;const removed=data.splice(i,1)[0];if(project.configuration?.breakers)delete project.configuration.breakers[removed.internalId];selected=Math.min(selected,data.length-1);render()}
function add(){data.push({id:nextId(),function:'UPS_INPUT_LOAD',series:project.manufacturer==='ABB'?'Tmax XT':'SENTRON 3VA',frame:project.manufacturer==='ABB'?'XT4':'3VA1563',rating:'160A',seriesMode:'auto',frameMode:'auto',pole:'4P',type:'MCCB',direction:'Outgoing',route:project.defaultRoute,routeMode:'default',connection:'Cable',entry:'Top',cableSize:'70 mm2',cableQty:'1',section:'',switchboardId:'SWB-01',assignmentMode:'inherited',bus:'Input Bus',internalId:uid()});selected=data.length-1;render()}
function showConfirmation({eyebrow,title,body,applyLabel='Apply',onApply}){const dialog=document.querySelector('#confirmationDialog');document.querySelector('#dialogEyebrow').textContent=eyebrow;document.querySelector('#dialogTitle').textContent=title;document.querySelector('#dialogBody').innerHTML=body;document.querySelector('#dialogApply').textContent=applyLabel;const closed=()=>{dialog.removeEventListener('close',closed);if(dialog.returnValue==='apply')onApply()};dialog.addEventListener('close',closed);dialog.showModal()}
function setQuantity(quantity){
  if(project.quantity===quantity){render();return}
  const proposal=proposedSwitchboardAssignment(data,quantity),changed=proposal.filter(item=>item.current!==item.proposed),inputCount=proposal.filter(item=>item.proposed==='SWB-01').length,criticalCount=proposal.filter(item=>item.proposed==='SWB-02').length;
  const body=quantity===2?'<div class="assignment-preview"><b>Proposed Assignment</b><span>Input / Normal Bus → SWB-01</span><span>UPS Output / Critical Bus → SWB-02</span><span>Breakers affected: '+changed.length+'</span><small>Explicit switchboard assignments are preserved.</small></div>':'<div class="assignment-preview"><b>Merge into SWB-01</b><span>SWB-01 breakers after merge: '+(inputCount+criticalCount)+'</span><span>Breakers affected: '+changed.length+'</span></div>';
  showConfirmation({eyebrow:'SWITCHBOARD QUANTITY CHANGE',title:quantity+' Switchboard'+(quantity===1?'':'s'),body,applyLabel:'Apply Assignment',onApply:()=>{applySwitchboardAssignment(project,data,quantity,proposal);selected=Math.min(selected,data.length-1);render()}})
}
function updateProject(){const m=document.querySelector('#projectManufacturer').value;project.manufacturer=m;project.system=m==='ABB'?'MNS R':'SIVACON S8';project.configuration={switchboards:{},breakers:{}};data=data.map(b=>{const x={...b};x.series=m==='ABB'?'Emax 2':'SENTRON 3WA';x.frame=m==='ABB'?'E1.2':'3WA11';x.type='ACB';x.seriesMode='auto';x.frameMode='auto';applyRecommendation(x);return x});syncSystem();render()}function syncSystem(){const s=document.querySelector('#projectSystem');s.innerHTML='';const o=document.createElement('option');o.value=project.system;o.textContent=project.system;s.append(o);s.value=project.system;s.disabled=true;s.title='System is derived from Manufacturer'}
function resetExample(){project=ensureSwitchboardState({manufacturer:'ABB',system:'MNS R',mainBus:'6300 A',defaultRoute:'Bottom',quantity:1,configuration:{switchboards:{},breakers:{}},switchboards:{},currentDimensions:{heightMm:2400,depthMm:1200},gaView:{mode:'SCHEMATIC',zoom:100}});gaMode='SCHEMATIC';gaZoom=100;selectedGa=null;data=defaults();selected=0;syncSystem();document.querySelector('#projectManufacturer').value=project.manufacturer;document.querySelector('#mainBus').value=project.mainBus;document.querySelector('#defaultRoute').value=project.defaultRoute;render()}
function setGaMode(mode){gaMode=mode;project.gaView={mode:gaMode,zoom:gaZoom};renderGA();save()}
function setGaZoom(value){gaZoom=Math.max(50,Math.min(200,value));project.gaView={mode:gaMode,zoom:gaZoom};renderGA();save()}
function performExport(){const button=document.querySelector('#reportBtn'),exportData=buildDesignExport(project,data),payload=JSON.stringify(exportData,null,2),anchor=document.createElement('a');button.dataset.lastExportBytes=String(payload.length);button.dataset.designStatus=exportData.designStatus;button.dataset.lastExportJson=payload;anchor.href=URL.createObjectURL(new Blob([payload],{type:'application/json'}));anchor.download='switchboard-design-basis.json';document.body.append(anchor);anchor.click();setTimeout(()=>{URL.revokeObjectURL(anchor.href);anchor.remove()},1000)}
function requestExport(){const exportData=buildDesignExport(project,data);if(exportData.designStatus==='VALID / MATCHED'){performExport();return}const unresolved=exportData.unresolvedConditions.length,invalid=exportData.invalidConditions.length;showConfirmation({eyebrow:'DESIGN STATUS: '+exportData.designStatus,title:exportData.designStatus==='INVALID'?'Export Invalid Design?':'Export as Draft?',body:'<div class="export-warning"><b>'+exportData.designStatus+'</b><span>'+unresolved+' Manufacturer Confirmation Required item(s) remain.</span><span>'+invalid+' invalid condition(s).</span><small>The exported JSON will retain designStatus, unresolvedConditions, invalidConditions and confidenceSummary.</small></div>',applyLabel:exportData.designStatus==='INVALID'?'Export INVALID Draft':'Export as Draft',onApply:performExport})}
document.querySelector('#gaSchematic').addEventListener('click',()=>setGaMode('SCHEMATIC'));
document.querySelector('#gaPhysical').addEventListener('click',()=>setGaMode('PHYSICAL'));
document.querySelector('#gaZoomOut').addEventListener('click',()=>setGaZoom(gaZoom-25));
document.querySelector('#gaZoomIn').addEventListener('click',()=>setGaZoom(gaZoom+25));
document.querySelector('#gaZoomReset').addEventListener('click',()=>setGaZoom(100));
document.querySelector('#oneBoard').addEventListener('click',()=>setQuantity(1));
document.querySelector('#twoBoards').addEventListener('click',()=>setQuantity(2));
document.querySelector('#add').addEventListener('click',add);
document.querySelector('#duplicate').addEventListener('click',()=>duplicate());
document.querySelector('#reset').addEventListener('click',resetExample);
document.querySelector('#reportBtn').addEventListener('click',requestExport);
document.querySelector('#projectManufacturer').addEventListener('change',updateProject);
document.querySelector('#mainBus').addEventListener('change',event=>{updateDefaultMainBus(project,event.target.value);render()});
document.querySelector('#defaultRoute').addEventListener('change',event=>{project.defaultRoute=event.target.value;data.forEach(breaker=>{if(breaker.routeMode==='default')breaker.route=project.defaultRoute});render()});
syncSystem();document.querySelector('#projectManufacturer').value=project.manufacturer;document.querySelector('#mainBus').value=project.mainBus;document.querySelector('#defaultRoute').value=project.defaultRoute;render();