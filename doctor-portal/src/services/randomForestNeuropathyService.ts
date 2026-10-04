import type { NephropathyPredictionResult } from "@/src/types";

type Tree = { childrenLeft:number[]; childrenRight:number[]; feature:number[]; threshold:number[]; values:number[][] };
type Model = { modelType:string; target:string; features:string[]; medians:number[]; treeCount:number; trees:Tree[]; validation:{accuracy:number;rocAuc:number} };
let cachedModel: Model | null = null;

async function loadModel():Promise<Model>{
  if(cachedModel) return cachedModel;
  const response=await fetch("/models/random_forest_neuropathy.json");
  if(!response.ok) throw new Error("The neuropathy Random Forest model could not be loaded.");
  cachedModel=await response.json() as Model;
  return cachedModel;
}

function treeProbability(tree:Tree,values:number[]){
  let node=0;
  while(tree.childrenLeft[node]!==-1){
    const feature=tree.feature[node];
    node=values[feature]<=tree.threshold[node]?tree.childrenLeft[node]:tree.childrenRight[node];
  }
  const classes=tree.values[node];
  return classes[1]/classes.reduce((sum,value)=>sum+value,0);
}

export async function predictNeuropathyRisk(patientRecord:Record<string,number|undefined>):Promise<NephropathyPredictionResult & {modelAccuracy:number;rocAuc:number;treeCount:number}>{
  const model=await loadModel();
  if(model.modelType!=="RandomForestClassifier"||model.target!=="NEU") throw new Error("Unexpected model artifact. Random Forest NEU model required.");
  const values=model.features.map((feature,index)=>Math.fround(Number.isFinite(patientRecord[feature])?Number(patientRecord[feature]):model.medians[index]));
  const raw=model.trees.reduce((sum,tree)=>sum+treeProbability(tree,values),0)/model.treeCount;
  const probability=Math.round(raw*1000)/10;
  const category=probability<30?"Low risk":probability<60?"Moderate risk":"High risk";
  return {probability,category,explanation:`The fitted Random Forest estimates a ${probability}% probability of neuropathy for the available patient record. This is a model estimate, not a diagnosis.`,factors:["HbA1c and glucose measurements from the latest record","Blood pressure, age, BMI, and diabetes history","Stored training medians for unavailable model fields"],modelAccuracy:model.validation.accuracy,rocAuc:model.validation.rocAuc,treeCount:model.treeCount};
}
