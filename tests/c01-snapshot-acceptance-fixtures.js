'use strict';
const {fixture,refresh,clone}=require('./c01-documentary-fixtures.js');
const {qualify,RULES_ID,RULES_VERSION}=require('../js/c01-documentary-qualification.js');
const {createProof}=require('../js/c01-completeness-proof.js');
const boundary=require('../js/c01-resolution-boundary.js');
function prepared(options={}){
 const e=fixture(options),q=qualify(e);e.payload.conflicts=clone(q.conflicts);refresh(e);
 e.qualificationProof=createProof(e,qualify(e));
 e.resolutionResult=boundary.run(e);
 return e;
}
module.exports={prepared,clone,refresh,RULES_ID,RULES_VERSION};
