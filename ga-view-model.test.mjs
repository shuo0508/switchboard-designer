import assert from 'node:assert/strict';
import { buildGaViewModel, __test } from './ga-view-model.js';

const breakers=[
  {internalId:'a',id:'CB-01',function:'MAIN_INPUT',series:'Emax 2',frame:'E4.2',rating:'4000A',pole:'4P',type:'ACB',route:'Bottom',bus:'Input Bus'},
  {internalId:'b',id:'CB-02',function:'UPS_INPUT',series:'Emax 2',frame:'E1.2',rating:'1250A',pole:'4P',type:'ACB',route:'Top',bus:'Input Bus'},
  {internalId:'c',id:'CB-03',function:'UPS_OUTPUT',series:'Emax 2',frame:'E4.2',rating:'3200A',pole:'4P',type:'ACB',route:'Bottom',bus:'UPS Output Bus'},
  {internalId:'d',id:'CB-04',function:'UPS_OUTPUT_LOAD',series:'Tmax XT',frame:'XT4',rating:'160A',pole:'4P',type:'MCCB',route:'Top',bus:'UPS Output Bus'},
];
const boardSections=[{boardId:'SWB-01',sections:breakers.map((breaker,index)=>({id:`S0${index+1}`,boardId:'SWB-01',bus:breaker.bus,items:[index],width:index===0?800:600,confidence:index===3?'Manufacturer Confirmation Required':'Manufacturer Verified',packingRuleId:index===3?'NO_AUTOMATIC_MCCB_PACKING':'INDIVIDUAL_CUBICLE',packingMissingParameters:[]}))}];
const project={manufacturer:'ABB',system:'MNS R',mainBus:'6300 A'};
const busRules=(_board,bus)=>({busId:bus==='Input Bus'?'BUS-A':'BUS-B',roleLabel:bus==='Input Bus'?'Input / Normal Bus':'UPS Output / Critical Bus',physicalPosition:bus==='Input Bus'?'Top':'Physical Position Not Confirmed',selectedPosition:bus==='Input Bus'?'Top':null,confidence:bus==='Input Bus'?'Manufacturer Verified':'Manufacturer Confirmation Required',ruleId:'TEST_BUS_RULE',source:{document:'test'},manufacturerRule:'test rule'});
const evaluations=breaker=>({confidence:breaker.type==='MCCB'?'Manufacturer Confirmation Required':'Manufacturer Verified',ruleId:'TEST_BREAKER'});
const model=buildGaViewModel({project,breakers,boardSections,busRules,evaluations,dimensions:{heightMm:2400,depthMm:1200,classification:'User Defined'}});
assert.equal(model.boards.length,1);
assert.equal(model.boards[0].totalWidthMm,2600);
assert.equal(model.boards[0].buses.length,2);
assert.equal(model.boards[0].sections[0].widthMm,800);
assert.equal(model.boards[0].sections[3].physicalArrangementConfidence,'SCHEMATIC DEVICE POSITION');
assert.equal(model.boards[0].dimensions.confidence,'User Defined');
assert.equal(__test.flowFor(breakers[0]).direction,'SOURCE_TO_BUS');
assert.equal(__test.flowFor(breakers[1]).direction,'BUS_TO_DESTINATION');
assert.equal(__test.flowFor(breakers[2]).sourceLabel,'UPS OUTPUT');
assert.equal(__test.flowFor(breakers[3]).destinationLabel,'CRITICAL LOAD');
console.log('GA view model topology and presentation tests passed');