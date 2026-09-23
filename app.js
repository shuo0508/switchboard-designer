import { ENGINEERING_SELECTION_POLICY, evaluateBreaker as sharedEvaluateBreaker, deriveBreakerType, getBreakerCandidates, framesForSeries, sanitizeBreakerConfiguration, getAvailableManufacturerDimensions, getBusbarRule, getDesignConfigurationSchema, getProductCatalog, getRuleAudit } from './manufacturer-rules.js';
import { DESIGN_STATUS, buildDesignExport, designStatus, sectionsBySwitchboard } from './design-evaluation.js';
import { buildGaViewModel } from './ga-view-model.js';
import { renderProfessionalGa } from './ga-renderer.js';
import { FUNCTIONS, FUNCTION_OPTIONS, busForFunction, renumberBreakersBySwitchboard } from './topology.js';
import { BUS_RATINGS, applySwitchboardAssignment, assignBreakerToSwitchboard, breakerDisplayLabel, cableRouteLabel, ensureSwitchboardState, proposedSwitchboardAssignment, ratedMainBus, revertRatedMainBus, setRatedMainBus, switchboardIds, updateDefaultMainBus } from './ux-state.js';
import { getSwitchboardDimensions, normalizeDimensionInput } from './project-model.js';
import { STORAGE_KEYS, defaultProject, normalizeBreaker, normalizeBreakers, normalizeProject, parseJson, recommendInto } from './persistence.js';
import { openConfirmation } from './confirm-dialog.js';
import { escapeHtml as esc } from './html.js';

function uid(){return globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():`breaker-${Date.now()}-${Math.random().toString(36).slice(2)}`}
const $=selector=>document.querySelector(selector);

let project=loadProject();
let data=loadBreakers();
// One active engineering selection: a schedule row (selectedIndex) unless a GA item is selected.
let selectedIndex=0;
let selectedGa=null;
let dragId=null,pointerTargetId=null,pointerAfter=false;
let currentGaModel=null;
let gaMode=project.gaView.mode;
let gaZoom=project.gaView.zoom;

function loadProject(){return normalizeProject(parseJson(localStorage.getItem(STORAGE_KEYS.project)))}
function loadBreakers(){
  const current=normalizeBreakers(parseJson(localStorage.getItem(STORAGE_KEYS.breakers)),project,uid);
  if(current)return current;
  const legacy=normalizeBreakers(parseJson(localStorage.getItem(STORAGE_KEYS.legacyBreakers)),project,uid);
  return legacy||defaults();
}
function defaults(){
  return[['CB-01','MAIN_INPUT','Emax 2','E6.2','6300A','4P','Bottom'],['CB-02','GEN_INPUT','Emax 2','E1.2','1250A','4P','Bottom'],['CB-03','UPS_INPUT_LOAD','Emax 2','E1.2','1250A','3P','Top'],['CB-04','BYPASS','Emax 2','E1.2','1250A','4P','Top']]
    .map(([id,fn,series,frame,rating,pole,route])=>normalizeBreaker({id,function:fn,series,frame,rating,pole,route,routeMode:'explicit',switchboardId:'SWB-01',assignmentMode:'inherited'},project,uid));
}
function save(){localStorage.setItem(STORAGE_KEYS.breakers,JSON.stringify(data));localStorage.setItem(STORAGE_KEYS.project,JSON.stringify(project))}

function evaluate(b){return sharedEvaluateBreaker(b,project,data)}
function busbarRule(boardId,bus){return getBusbarRule(project,boardId,bus)}
function catalog(){return getProductCatalog(project.manufacturer)}
function options(b,col){
  if(col==='function')return FUNCTION_OPTIONS;
  if(col==='series')return catalog().series;
  if(col==='frame')return framesForSeries(project.manufacturer,b.series);
  if(col==='rating')return catalog().ratings;
  if(col==='pole')return catalog().poles;
  if(col==='route')return['Top','Bottom'];
  if(col==='switchboard')return switchboardIds(project);
  return[];
}
function selectValue(b,col){return col==='switchboard'?b.switchboardId:b[col]}
function applyRecommendation(b){recommendInto(b,project)}
function renumber(){renumberBreakersBySwitchboard(data)}
function clampSelection(){selectedIndex=Math.max(0,Math.min(selectedIndex,data.length-1))}

function makeSelect(b,col){
  const select=document.createElement('select');select.dataset.col=col;
  if((col==='series'||col==='frame')&&!b[col]){const none=document.createElement('option');none.value='';none.textContent='No source-backed candidate';select.append(none);select.classList.add('no-candidate')}
  options(b,col).forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=col==='function'?FUNCTIONS[value].label:col==='route'?cableRouteLabel(value):value;select.append(option)});
  select.value=selectValue(b,col)??'';select.title=select.selectedOptions[0]?.textContent||select.value;return select;
}
function stateBadge(textValue,className=''){const badge=document.createElement('span');badge.className='state-badge '+className;badge.textContent=textValue;return badge}
function control(b,i,col){
  if(col==='cb'){const wrap=document.createElement('span');wrap.className='cb-cell';const handle=document.createElement('span');handle.className='drag-handle';handle.textContent='⋮⋮';handle.title='Drag to reorder';handle.setAttribute('aria-label','Drag to reorder');const label=document.createElement('b');label.textContent=b.id;wrap.append(handle,label);return wrap}
  if(['function','rating','pole','switchboard'].includes(col))return makeSelect(b,col);
  if(col==='series'||col==='frame'){
    const wrap=document.createElement('div');wrap.className='field-with-state';const select=makeSelect(b,col);const mode=col==='series'?b.seriesMode:b.frameMode;const alternatives=Math.max(0,(b.recommendation?.candidates?.length||0)-1);const noCandidate=mode!=='manual'&&!b.frame;wrap.append(select,stateBadge(mode==='manual'?'MANUAL':noCandidate?'AUTO · NO SOURCE-BACKED CANDIDATE':'AUTO'+(alternatives?' +'+alternatives+' alt':''),noCandidate?'no-candidate':mode));
    if(col==='series'&&(b.seriesMode==='manual'||b.frameMode==='manual')){const reset=document.createElement('button');reset.type='button';reset.className='inline-reset';reset.textContent='Revert to Auto';reset.title='Revert Series and Frame to shared-engine automatic recommendation';reset.addEventListener('click',event=>{event.stopPropagation();revertBreakerAuto(i)});wrap.append(reset)}
    return wrap;
  }
  if(col==='route'){
    const wrap=document.createElement('div');wrap.className='field-with-state route-state';wrap.append(makeSelect(b,col),stateBadge(b.routeMode==='default'?'Inherited':'Override',b.routeMode));
    if(b.routeMode!=='default'){const reset=document.createElement('button');reset.type='button';reset.className='inline-reset';reset.textContent='Revert to Inherited';reset.addEventListener('click',event=>{event.stopPropagation();revertRoute(i)});wrap.append(reset)}
    return wrap;
  }
  return null;
}
function setBoardConfiguration(boardId,key,value,subKey){
  const board=project.configuration.switchboards[boardId]||(project.configuration.switchboards[boardId]={busbarPositions:{}});
  if(subKey){board[key]=board[key]||{};board[key][subKey]=value}else board[key]=value;
  render();
}
function setBreakerConfiguration(internalId,key,value){
  const config=project.configuration.breakers[internalId]||(project.configuration.breakers[internalId]={});
  config[key]=key==='cubicleWidthMm'?(Number(value)||undefined):value;
  if(config[key]===undefined||config[key]==='')delete config[key];
  render();
}
function configSelect(controlItem,onChange){
  const select=document.createElement('select');const empty=document.createElement('option');empty.value='';empty.textContent='Select manufacturer configuration';select.append(empty);
  controlItem.options.forEach(value=>{const option=document.createElement('option');option.value=String(value);option.textContent=typeof value==='number'?value+' mm':value;select.append(option)});
  select.value=String(controlItem.value||'');select.title=select.selectedOptions[0]?.textContent||select.value;select.addEventListener('change',event=>onChange(event.target.value));return select;
}
function inlineIssue(issue,controlItem){
  const box=document.createElement('div');box.className='inline-config-error';
  const alternatives=issue.validAlternatives?.length?issue.validAlternatives.join(', '):controlItem.options.filter(value=>String(value)!==String(controlItem.value)).join(', ');
  box.innerHTML='<b>Invalid configuration</b><span>Current Value: '+esc(issue.currentValue||controlItem.value||'Not selected')+'</span><span>Conflict: '+esc(issue.message)+'</span><span>Manufacturer Rule: '+esc(issue.manufacturerRule||controlItem.sourceRule||'Not specified in source metadata')+'</span><span>Valid Alternatives: '+esc(alternatives||'Manufacturer confirmation required')+'</span>';
  return box;
}
function renderBoardRatings(){
  const host=$('#boardRatings');host.innerHTML='<div><p class="eyebrow">PHYSICAL SWITCHBOARD RATINGS</p><h3>Rated Main Bus Current</h3><p>Each switchboard inherits the project default until explicitly overridden.</p></div>';
  const cards=document.createElement('div');cards.className='board-rating-cards';
  switchboardIds(project).forEach(boardId=>{const state=project.switchboards[boardId];const card=document.createElement('label');card.className='board-rating-card';card.innerHTML='<b>'+esc(boardId)+'</b><span>Rated Main Bus Current</span>';const select=document.createElement('select');BUS_RATINGS.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)});select.value=ratedMainBus(project,boardId);select.addEventListener('change',event=>{setRatedMainBus(project,boardId,event.target.value);render()});card.append(select,stateBadge(state.ratingMode==='override'?'Override':'Inherited',state.ratingMode));if(state.ratingMode==='override'){const reset=document.createElement('button');reset.type='button';reset.className='inline-reset';reset.textContent='Revert to Project Default';reset.addEventListener('click',()=>{revertRatedMainBus(project,boardId);render()});card.append(reset)}cards.append(card)});
  host.append(cards);
}
function statusClass(name){return name.toLowerCase().replaceAll(/[^a-z]+/g,'-').replace(/-$/,'')}
function listBlock(title,items){const wrap=document.createDocumentFragment();const heading=document.createElement('strong');heading.textContent=title;const list=document.createElement('ul');items.forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li)});wrap.append(heading,list);return wrap}
function renderDesignConfiguration(status){
  const host=$('#designConfiguration');if(!host)return;
  const schema=getDesignConfigurationSchema(project,data),complete=status.completeness,validation=status.validation,available=getAvailableManufacturerDimensions(project),statusName=status.designStatus;
  host.replaceChildren();
  const head=document.createElement('div');head.className='config-summary';head.innerHTML='<div><p class="eyebrow">DESIGN CONFIGURATION</p><h3>Manufacturer Rule Matching</h3><p>Only configuration inputs required by the selected manufacturer rules are shown.</p></div><div class="completeness '+statusClass(statusName)+'"><small>DESIGN STATUS</small><b>'+esc(statusName)+'</b><span>Required '+complete.required+' · Resolved '+complete.resolved+' · Missing '+complete.missing+' · Not Applicable '+complete.notApplicable+'</span></div>';host.append(head);
  const grids=document.createElement('div');grids.className='config-grid';const sw=document.createElement('div');sw.className='config-panel';sw.innerHTML='<h4>SWITCHBOARD CONFIGURATION</h4>';
  schema.switchboards.forEach(board=>{if(!board.controls.length)return;const group=document.createElement('div');group.className='config-group';const title=document.createElement('b');title.textContent=board.boardId;group.append(title);board.controls.forEach(controlItem=>{const label=document.createElement('label');label.textContent=controlItem.label;label.append(configSelect(controlItem,value=>setBoardConfiguration(board.boardId,controlItem.key,value,controlItem.subKey)));const help=document.createElement('small');help.textContent=controlItem.reason+' · '+controlItem.sourceRule;label.append(help);validation.issues.filter(issue=>issue.scope===board.boardId&&issue.field==='Physical Busbar Position'&&controlItem.key==='busbarPositions').forEach(issue=>label.append(inlineIssue(issue,controlItem)));group.append(label)});sw.append(group)});
  if(!schema.switchboards.some(board=>board.controls.length))sw.insertAdjacentHTML('beforeend','<p class="config-empty">No switchboard configuration is required for the current design.</p>');
  const br=document.createElement('div');br.className='config-panel';br.innerHTML='<h4>BREAKER CONFIGURATION</h4>';
  schema.breakers.forEach(entry=>{const group=document.createElement('div');group.className='config-group';const title=document.createElement('b');title.textContent=entry.displayLabel+' · '+entry.series+' · '+entry.frame;group.append(title);entry.controls.forEach(controlItem=>{const label=document.createElement('label');label.textContent=controlItem.label;label.append(configSelect(controlItem,value=>setBreakerConfiguration(entry.internalId,controlItem.key,value)));const help=document.createElement('small');help.textContent=controlItem.reason+' · '+controlItem.sourceRule;label.append(help);validation.issues.filter(issue=>issue.internalId===entry.internalId).forEach(issue=>label.append(inlineIssue(issue,controlItem)));group.append(label)});br.append(group)});
  if(!schema.breakers.length)br.insertAdjacentHTML('beforeend','<p class="config-empty">No breaker-specific configuration is required for the current selection.</p>');grids.append(sw,br);host.append(grids);
  const box=document.createElement('div');box.className='config-status '+statusClass(statusName);
  const title=document.createElement('b');title.textContent=statusName;const summaryLine=document.createElement('span');
  summaryLine.textContent=status.designStatusWording+(status.statusBasis.length?' Basis: '+status.statusBasis.join(' · ')+'.':'');
  box.append(title,summaryLine);
  if(status.invalidConditions.length)box.append(listBlock('Invalid Manufacturer Conditions',status.invalidConditions.map(item=>item.scope+' · '+item.message)));
  if(status.electricalConflicts.length)box.append(listBlock('Electrical Design Conflicts',status.electricalConflicts.map(item=>item.scope+' · '+item.message)));
  if(status.unresolvedConditions.length)box.append(listBlock('Unresolved Conditions',status.unresolvedConditions.map(item=>item.scope+' · '+item.category+' · '+item.condition)));
  if(status.qualifiedConditions.length)box.append(listBlock('Qualified Results (not fully Manufacturer Verified)',status.qualifiedConditions.map(item=>item.scope+' · '+item.confidence+' · '+item.condition)));
  const dims=document.createElement('div');dims.className='dimension-status';const a=available.availableConfigurations;const dimension=getSwitchboardDimensions(project);
  dims.innerHTML='<div><b>Current Design Dimension</b><span>'+esc(dimension.label)+'</span></div><div><b>Manufacturer-Listed Dimensions</b><span>'+esc((a?.heightsMm?'H '+a.heightsMm.join('/')+' mm · ':'Not available in rule catalog · ')+(a?.widthsMm?'W '+a.widthsMm.join('/')+' mm · ':'')+(a?.depthsMm?'D '+a.depthsMm.join('/')+' mm':''))+'</span><small>Not matched to current configuration</small></div><div><b>Matched Manufacturer Dimension</b><span>None matched</span></div>';box.append(dims);host.append(box);
}
function revertBreakerAuto(index){const breaker=data[index];breaker.seriesMode='auto';breaker.frameMode='auto';applyRecommendation(breaker);render()}
function revertRoute(index){data[index].routeMode='default';data[index].route=project.defaultRoute;render()}
function edit(i,col,value){
  const b=data[i];
  if(col==='function'){b.function=value;b.direction=FUNCTIONS[value].direction;b.bus=busForFunction(value)}
  else if(col==='route'){b.route=value;b.routeMode='explicit'}
  else if(col==='switchboard'){assignBreakerToSwitchboard(b,value)}
  else b[col]=value;
  if(col==='rating'&&b.seriesMode!=='manual'&&b.frameMode!=='manual')applyRecommendation(b);
  if(col==='series'){b.seriesMode='manual';b.frame=framesForSeries(project.manufacturer,value)[0];b.frameMode='manual';b.type=deriveBreakerType(b.series)}
  if(col==='frame'){b.frameMode='manual';b.type=deriveBreakerType(b.series)}
  // Frame-specific configuration is revalidated against the rule engine in render().
  selectedGa=null;selectedIndex=i;
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
function selectRow(i){selectedGa=null;selectedIndex=i;document.querySelectorAll('#rows tr').forEach((row,index)=>row.classList.toggle('selected',index===i));renderGA(designStatus(project,data));updateInspector()}
function render(){
  sanitizeBreakerConfiguration(project,data);
  clampSelection();renumber();renderBoardRatings();const rows=$('#rows');rows.replaceChildren();
  data.forEach((b,i)=>{const tr=document.createElement('tr');tr.className=!selectedGa&&i===selectedIndex?'selected':'';tr.draggable=true;tr.dataset.internalId=b.internalId;wireDrag(tr,b);
    ['cb','switchboard','function','rating','series','frame','pole','route'].forEach(col=>{const td=document.createElement('td');const component=control(b,i,col);if(component){td.append(component);const select=component.matches?.('select')?component:component.querySelector?.('select');if(select)select.addEventListener('change',event=>edit(i,col,event.target.value))}tr.append(td)});
    const actions=document.createElement('td');const duplicateButton=document.createElement('button');duplicateButton.textContent='Duplicate';duplicateButton.addEventListener('click',event=>{event.stopPropagation();duplicate(i)});const deleteButton=document.createElement('button');deleteButton.textContent='Delete';deleteButton.addEventListener('click',event=>{event.stopPropagation();remove(i)});actions.append(duplicateButton,deleteButton);tr.append(actions);tr.addEventListener('click',event=>{if(!event.target.closest('input,select,button'))selectRow(i)});rows.append(tr)});
  const status=designStatus(project,data);
  renderDesignConfiguration(status);renderGA(status);renderSummary(status);$('#oneBoard').classList.toggle('active',project.quantity===1);$('#twoBoards').classList.toggle('active',project.quantity===2);updateInspector();renderAudit();save();
}
function gaSections(){return sectionsBySwitchboard(project,data).map(board=>({boardId:board.boardId,sections:board.sections.map(section=>({...section,items:section.items.map(item=>data.indexOf(item))}))}))}
function renderGA(status){
  currentGaModel=buildGaViewModel({project,breakers:data,boardSections:gaSections(),busRules:busbarRule,evaluations:evaluate,dimensions:getSwitchboardDimensions(project),designStatus:status.designStatus});currentGaModel.mode=gaMode;
  const widths=currentGaModel.boards.map(board=>board.id+' '+board.combinedPlanningWidthMm+' mm'+(board.containsProvisionalWidth?' (incl. provisional)':'')+(board.containsQualifiedWidth?' (incl. qualified)':''));
  $('#gaTotal').textContent=widths.join(' · ')+' · '+status.designStatus;
  const config=$('#busbarConfig');config.replaceChildren();
  currentGaModel.boards.forEach(board=>{if(!board.buses.length)return;const card=document.createElement('div');card.className='busbar-board-config';const title=document.createElement('b');title.textContent=board.id+' · Rated Main Bus '+board.ratedMainBus+' · Electrical / physical busbar configuration';card.append(title);board.buses.forEach(bus=>{const item=document.createElement('button');item.type='button';item.className='busbar-config-item';item.innerHTML='<strong>'+esc(bus.id+' · '+bus.role)+'</strong><span>Physical position: '+esc(bus.physicalPosition)+'</span><small>'+esc(bus.sourceRule+' · '+bus.confidence)+'</small>';item.addEventListener('click',()=>selectBus(bus,board));card.append(item)});config.append(card)});
  $('#gaSchematic').classList.toggle('active',gaMode==='SCHEMATIC');$('#gaPhysical').classList.toggle('active',gaMode==='PHYSICAL');$('#gaZoomLabel').textContent=gaZoom+'%';
  renderProfessionalGa($('#ga'),currentGaModel,{mode:gaMode,zoom:gaZoom,selected:selectedGa,onSelectSection:selectSection,onSelectBus:selectBus});
}
function renderSummary(status){
  const w=status.widths;
  $('#count').textContent=data.length+' breakers';
  $('#inheritNote').textContent=project.quantity+' switchboard'+(project.quantity===1?'':'s')+' · '+project.manufacturer+' · '+project.system+' · Inherited Cable Route '+cableRouteLabel(project.defaultRoute);
  $('#widthLabel').textContent=project.quantity===2?'Per-Switchboard Planning Width':'Combined Planning Width';
  const total=$('#total');total.replaceChildren();
  status.boards.forEach(board=>{const sum=board.sections.reduce((acc,section)=>acc+section.width,0);const widthOf=status=>board.sections.filter(section=>section.widthStatus===status).reduce((acc,section)=>acc+section.width,0);const provisional=widthOf('PROVISIONAL'),userSelected=widthOf('USER_SELECTED'),partial=widthOf('PARTIALLY_VERIFIED');const line=document.createElement('span');line.textContent=(project.quantity===2?board.boardId+' ':'')+sum+' mm';total.append(line);const parts=[provisional?provisional+' mm Provisional Planning Width':'',userSelected?userSelected+' mm User-Selected Width':'',partial?partial+' mm Partially Verified Width':''].filter(Boolean);const note=document.createElement('i');note.textContent=parts.length?' incl. '+parts.join(' · '):' Verified Section Width';total.append(note)});
  if(project.quantity===2){const combined=document.createElement('i');combined.textContent=' · Combined Planning Width '+w.combinedPlanningWidthMm+' mm'+(w.containsProvisionalWidth?' (contains provisional)':'')+(!w.containsProvisionalWidth&&w.containsNonVerifiedWidth?' (contains qualified)':'');total.append(combined)}
  $('#sections').textContent=status.boards.reduce((acc,board)=>acc+board.sections.length,0);$('#breakerCount').textContent=data.length;$('#busLabel').textContent='Project Default '+project.mainBus;
  const counts=status.confidenceSummary;
  $('#designStatus').textContent=status.designStatus;
  $('#confidenceCounts').textContent='Devices Verified '+counts.manufacturerMatched+' · Qualified '+counts.qualified+' · User Selected '+counts.userSelected+' · Partially Verified '+counts.partiallyVerified+' · Confirmation Required '+counts.confirmationRequired+' · Provisional Sections '+counts.engineeringEstimate+' · Packing Unresolved '+counts.packingUnresolved+' · Invalid '+counts.invalid+' · Electrical Conflicts '+counts.electricalConflicts;
  $('#criticalItems').textContent=(status.unresolvedConditions.length?status.unresolvedConditions.length+' unresolved condition(s)':'No unresolved conditions')+(status.qualifiedConditions.length?' · '+status.qualifiedConditions.length+' qualified result(s)':'');
  $('#physicalDimensions').textContent=getSwitchboardDimensions(project).label;
}
function traceLines(title,values){
  const entries=Array.isArray(values)?values:Object.entries(values||{}).map(([key,value])=>key+': '+value);
  return '<div class="trace-group"><small>'+esc(title)+'</small>'+(entries.length?entries.map(value=>'<span>'+esc(value)+'</span>').join(''):'<span>None</span>')+'</div>';
}
function sourceTraceHtml(ruleId,source={}){
  return traceLines('SOURCE TRACE',{ruleId,resolvedRuleId:source.resolvedRuleId||'Not specified in source metadata',sourceType:source.sourceType,manufacturer:source.manufacturer,system:source.system,document:source.document,revision:source.revision,pdfPage:source.pdfPage,printedPage:source.printedPage,section:source.section,table:source.table,figure:source.figure});
}
function sectionForBreaker(b){for(const board of sectionsBySwitchboard(project,data)){const section=board.sections.find(item=>item.items.includes(b));if(section)return section}return null}
function applyTrace(title,b,e,bar,section){
  $('#selectedTitle').textContent=title;const inputs=[b.series||'Series: No source-backed candidate',b.frame||'Frame: No source-backed candidate',b.rating,b.pole,b.type||'Type: not selected','Function: '+FUNCTIONS[b.function].label,'Cable Route: '+cableRouteLabel(b.route),'Rated Main Bus: '+ratedMainBus(project,b.switchboardId)];
  const deviceData={ruleId:e.ruleId,confidence:e.confidence,classification:e.classification,deviceWidth:e.widthMm+' mm'+(e.status==='MANUFACTURER_VERIFIED'?'':e.status==='MANUFACTURER_SUPPORTED_USER_SELECTED'?' (user selected from '+(e.availableWidths||[]).join(' / ')+' mm)':e.status==='PARTIALLY_VERIFIED'?' (nominal · partially verified)':' (provisional / not matched)')};if(e.module)deviceData.module=e.module+(e.moduleKind?' · '+e.moduleKind:'');if(e.widthReason)deviceData.widthReason=e.widthReason;if(e.arrangement)deviceData.arrangement=e.arrangement;
  const operational={breakerRatedCurrent:b.rating};if(e.operationalCurrent!=null)operational.manufacturerOperationalCurrent=e.operationalCurrent+' A (Tab. 3/17, informational — not compared with Breaker Rated Current)';if(e.operationalCurrentStatus)operational.operationalCurrentStatus=e.operationalCurrentStatus;const info=e.manufacturerOperationalCurrent;if(info){operational.manufacturerOperationalCurrentSource=info.table;['status','note','nonVentilated','ventilated','usage'].forEach(key=>{if(info[key])operational[key]=info[key]})}
  const candidates=getBreakerCandidates(project.manufacturer,b.rating).map(item=>item.frame+(item.performanceLevelDependency?' (performance level '+item.performanceLevels.join(' / ')+' only)':''));const auto=b.seriesMode==='manual'||b.frameMode==='manual'?{mode:'MANUAL (user selection)',sourceBackedCandidates:candidates.join(', ')||'None'}:{mode:'AUTO',status:b.recommendation?.status||'-',sourceBackedCandidates:candidates.join(', ')||'None - NO_ESTABLISHED_CANDIDATE · Manufacturer Confirmation Required',selected:b.frame||'No source-backed candidate (no breaker selected)',policy:ENGINEERING_SELECTION_POLICY.id+' ('+ENGINEERING_SELECTION_POLICY.classification+', not a manufacturer recommendation)',unresolved:(b.recommendation?.unresolvedConditions||[]).join(' · ')||'None'};
  const tableData={table:e.table||'Not specified in source metadata'};if(e.cubicleType)tableData.cubicleType=e.cubicleType;if(e.tableId)tableData.tableId=e.tableId;
  const sectionData=section?{section:section.boardId+' / '+section.id,planningWidth:section.width+' mm · '+section.widthLabel,arrangementConfidence:section.confidence,packingStatus:section.packingStatus,packingRule:section.packingRuleId}:{section:'Not assigned to an active switchboard'};
  const dimension=getSwitchboardDimensions(project);
  $('#spec').innerHTML='<b>'+esc(project.manufacturer+' '+project.system)+'</b>'+traceLines('INPUTS',inputs)+traceLines('DERIVED INPUTS',e.derivedInputs||{})+traceLines('USER CONFIGURATION',e.userConfiguration||{})+traceLines('AUTO SELECTION',auto)+traceLines('MANUFACTURER TABLE',tableData)+traceLines('SOURCE CONDITIONS',e.sourceConditions||[])+traceLines('MATCHED MANUFACTURER CONDITIONS',e.matchedConditions||[])+traceLines('CONFLICTS',e.conflicts||[])+traceLines('DEVICE MANUFACTURER DATA',deviceData)+traceLines('OPERATIONAL CURRENT (informational)',operational)+traceLines('SECTION PLANNING WIDTH',sectionData)+traceLines('MISSING CONDITIONS',[...(e.missingParameters||[]),...(section?.packingStatus==='UNRESOLVED'?section.packingMissingParameters.map(item=>'packing: '+item):[])])+traceLines('SWITCHBOARD DIMENSIONS',[dimension.label])+'<span>'+esc('Physical Busbar Position: '+bar.physicalPosition)+'</span>';
  $('#min').textContent=e.widthMm+' mm'+(e.module?' / '+e.module:'')+' · '+e.confidence;
  $('#rec').textContent=section?section.width+' mm · '+section.widthLabel:'-';
  $('#rule').textContent=e.ruleId;
  $('#why').textContent='DEVICE: '+e.widthMm+' mm · '+e.confidence+' · TABLE: '+(e.table||'Not specified')+(e.cubicleType?' · CUBICLE TYPE: '+e.cubicleType:'')+' · '+e.matchedRule+(section?' · SECTION: '+section.width+' mm '+section.widthLabel+' · PACKING: '+section.packingStatus:'')+' · Busbar: '+bar.manufacturerRule;
  $('#source').innerHTML=sourceTraceHtml(e.ruleId,e.source);
}
function selectSection(section){selectedGa={type:'section',key:section.key};const first=section.breakers[0],index=data.findIndex(item=>item.internalId===first?.internalId);if(index>=0)selectedIndex=index;document.querySelectorAll('#rows tr').forEach(row=>row.classList.remove('selected'));renderGA(designStatus(project,data));updateInspector()}
function applyBusTrace(bus,board){
  $('#selectedTitle').textContent=board.id+' · '+bus.id+' · '+bus.role;$('#spec').innerHTML=traceLines('BUS ROLE',[bus.role,'Electrical bus: '+bus.name,'Rated Main Bus: '+bus.rating])+traceLines('PHYSICAL CONFIGURATION',['Physical position: '+bus.physicalPosition,bus.userSelected?'Manufacturer-Supported · User Selected':'No manufacturer-required position is implied'])+traceLines('SOURCE RULE',[bus.sourceRule,bus.manufacturerRule]);$('#min').textContent='Not a sizing result';$('#rec').textContent=bus.physicalPosition;$('#rule').textContent=bus.sourceRule;$('#why').textContent='LAYOUT RESULT: '+bus.physicalPosition+' · CONFIDENCE: '+bus.confidence+' · '+bus.manufacturerRule;$('#source').innerHTML=sourceTraceHtml(bus.sourceRule,bus.source||{});
}
function selectBus(bus){selectedGa={type:'bus',key:bus.key};document.querySelectorAll('#rows tr').forEach(row=>row.classList.remove('selected'));renderGA(designStatus(project,data));updateInspector()}
function updateInspector(){
  if(selectedGa&&currentGaModel){
    if(selectedGa.type==='section'){const section=currentGaModel.boards.flatMap(board=>board.sections).find(item=>item.key===selectedGa.key);if(section){const b=data.find(item=>item.internalId===section.breakers[0]?.internalId);if(b){applyTrace(section.boardId+' / '+section.id+' · '+breakerDisplayLabel(b)+' · '+section.busName,b,evaluate(b),busbarRule(section.boardId,section.busName),section.rawSection);return}}}
    if(selectedGa.type==='bus'){for(const board of currentGaModel.boards){const bus=board.buses.find(item=>item.key===selectedGa.key);if(bus){applyBusTrace(bus,board);return}}}
    selectedGa=null;
  }
  const b=data[selectedIndex];if(!b)return;applyTrace(breakerDisplayLabel(b)+' · '+FUNCTIONS[b.function].label,b,evaluate(b),busbarRule(b.switchboardId,b.bus),sectionForBreaker(b));
}
function renderAudit(){const body=$('#ruleAuditRows');body.replaceChildren();getRuleAudit(project.manufacturer).forEach(r=>{const tr=document.createElement('tr');[r.id,r.result,r.source,r.classification,r.usedBy,r.notes].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});body.append(tr)})}
function reorder(sourceId,targetId,after){const from=data.findIndex(x=>x.internalId===sourceId),to=data.findIndex(x=>x.internalId===targetId);if(from<0||to<0||from===to)return;const item=data.splice(from,1)[0];let insert=to+(after?1:0);if(from<insert)insert-=1;data.splice(insert,0,item);selectedIndex=insert;selectedGa=null;render()}
function duplicate(i=selectedIndex){const source=data[i];if(!source)return;const b={...source,internalId:uid()};const sourceConfig=project.configuration.breakers[source.internalId];if(sourceConfig)project.configuration.breakers[b.internalId]={...sourceConfig};data.splice(i+1,0,b);selectedIndex=i+1;selectedGa=null;render()}
function remove(i){if(data.length<=1)return;const removed=data.splice(i,1)[0];delete project.configuration.breakers[removed.internalId];selectedIndex=Math.min(selectedIndex,data.length-1);selectedGa=null;render()}
function add(){data.push(normalizeBreaker({function:'UPS_INPUT_LOAD',rating:'160A',pole:'4P',routeMode:'default',switchboardId:'SWB-01',assignmentMode:'inherited'},project,uid));selectedIndex=data.length-1;selectedGa=null;render()}
function showConfirmation({eyebrow,title,body,applyLabel='Apply',onApply}){$('#dialogEyebrow').textContent=eyebrow;$('#dialogTitle').textContent=title;$('#dialogBody').replaceChildren(body);$('#dialogApply').textContent=applyLabel;openConfirmation($('#confirmationDialog'),onApply)}
function textBlock(className,lines){const box=document.createElement('div');box.className=className;lines.forEach(([tag,text])=>{const node=document.createElement(tag);node.textContent=text;box.append(node)});return box}
function setQuantity(quantity){
  if(project.quantity===quantity){render();return}
  const proposal=proposedSwitchboardAssignment(data,quantity),changed=proposal.filter(item=>item.current!==item.proposed);
  const body=quantity===2?textBlock('assignment-preview',[['b','Proposed Assignment'],['span','Input / Normal Bus → SWB-01'],['span','UPS Output / Critical Bus → SWB-02'],['span','Breakers affected: '+changed.length],['small','Explicit switchboard assignments are restored.']]):textBlock('assignment-preview',[['b','Merge into SWB-01'],['span','SWB-01 breakers after merge: '+data.length],['span','Breakers affected: '+changed.length],['small','Explicit SWB-02 assignments are remembered and restored when returning to 2 switchboards.']]);
  showConfirmation({eyebrow:'SWITCHBOARD QUANTITY CHANGE',title:quantity+' Switchboard'+(quantity===1?'':'s'),body,applyLabel:'Apply Assignment',onApply:()=>{applySwitchboardAssignment(project,data,quantity,proposal);selectedGa=null;clampSelection();render()}});
}
function updateProject(){const m=$('#projectManufacturer').value;project.manufacturer=m==='Siemens'?'Siemens':'ABB';project.system=project.manufacturer==='ABB'?'MNS R':'SIVACON S8';project.configuration={switchboards:{},breakers:{}};data.forEach(b=>{b.seriesMode='auto';b.frameMode='auto';applyRecommendation(b)});selectedGa=null;syncSystem();render()}
function syncSystem(){const s=$('#projectSystem');s.replaceChildren();const o=document.createElement('option');o.value=project.system;o.textContent=project.system;s.append(o);s.value=project.system;s.disabled=true;s.title='System is derived from Manufacturer'}
function syncProjectInputs(){$('#projectManufacturer').value=project.manufacturer;$('#mainBus').value=project.mainBus;$('#defaultRoute').value=project.defaultRoute;$('#heightMm').value=project.dimensions.heightMm??'';$('#depthMm').value=project.dimensions.depthMm??''}
function resetExample(){project=defaultProject();gaMode='SCHEMATIC';gaZoom=100;selectedGa=null;data=defaults();selectedIndex=0;syncSystem();syncProjectInputs();render()}
function setGaMode(mode){gaMode=mode;project.gaView={mode:gaMode,zoom:gaZoom};renderGA(designStatus(project,data));save()}
function setGaZoom(value){gaZoom=Math.max(50,Math.min(200,value));project.gaView={mode:gaMode,zoom:gaZoom};renderGA(designStatus(project,data));save()}
function performExport(exportData){const payload=JSON.stringify(exportData,null,2),anchor=document.createElement('a');$('#reportBtn').dataset.designStatus=exportData.designStatus;globalThis.__lastExport=exportData;anchor.href=URL.createObjectURL(new Blob([payload],{type:'application/json'}));anchor.download='switchboard-design-basis.json';document.body.append(anchor);anchor.click();setTimeout(()=>{URL.revokeObjectURL(anchor.href);anchor.remove()},1000)}
function requestExport(){
  const exportData=buildDesignExport(project,data);
  if(exportData.designStatus===DESIGN_STATUS.VALID){performExport(exportData);return}
  const body=textBlock('export-warning',[['b',exportData.designStatus],['span',exportData.designStatusWording],['span',exportData.unresolvedConditions.length+' unresolved condition(s).'],['span',exportData.qualifiedConditions.length+' qualified result(s).'],['span',exportData.invalidConditions.length+' invalid manufacturer condition(s).'],['span',exportData.electricalConflicts.length+' electrical design conflict(s).'],['span',exportData.containsProvisionalWidth?'Combined Planning Width contains provisional section widths.':exportData.widthSummary.containsNonVerifiedWidth?'Combined Planning Width contains qualified (not fully verified) section widths.':'All section widths verified.'],['small','The exported JSON retains designStatus, unresolvedConditions, invalidConditions, electricalConflicts, confidenceSummary and width status.']]);
  const draft=exportData.designStatus===DESIGN_STATUS.INCOMPLETE||exportData.designStatus===DESIGN_STATUS.QUALIFIED;
  showConfirmation({eyebrow:'DESIGN STATUS: '+exportData.designStatus,title:draft?'Export as Draft?':'Export '+exportData.designStatus+' Draft?',body,applyLabel:draft?'Export as Draft':'Export '+exportData.designStatus+' Draft',onApply:()=>performExport(buildDesignExport(project,data))});
}
function setDimension(key,value){project.dimensions[key]=normalizeDimensionInput(value);render()}

BUS_RATINGS.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;$('#mainBus').append(option)});
$('#gaSchematic').addEventListener('click',()=>setGaMode('SCHEMATIC'));
$('#gaPhysical').addEventListener('click',()=>setGaMode('PHYSICAL'));
$('#gaZoomOut').addEventListener('click',()=>setGaZoom(gaZoom-25));
$('#gaZoomIn').addEventListener('click',()=>setGaZoom(gaZoom+25));
$('#gaZoomReset').addEventListener('click',()=>setGaZoom(100));
$('#oneBoard').addEventListener('click',()=>setQuantity(1));
$('#twoBoards').addEventListener('click',()=>setQuantity(2));
$('#add').addEventListener('click',add);
$('#duplicate').addEventListener('click',()=>duplicate());
$('#reset').addEventListener('click',resetExample);
$('#reportBtn').addEventListener('click',requestExport);
$('#projectManufacturer').addEventListener('change',updateProject);
$('#mainBus').addEventListener('change',event=>{updateDefaultMainBus(project,event.target.value);render()});
$('#defaultRoute').addEventListener('change',event=>{project.defaultRoute=event.target.value==='Top'?'Top':'Bottom';data.forEach(breaker=>{if(breaker.routeMode==='default')breaker.route=project.defaultRoute});render()});
$('#heightMm').addEventListener('change',event=>setDimension('heightMm',event.target.value));
$('#depthMm').addEventListener('change',event=>setDimension('depthMm',event.target.value));
ensureSwitchboardState(project);syncSystem();syncProjectInputs();render();
