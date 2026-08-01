export type Page = "dashboard"|"summary"|"assistant"|"ckd"|"results"|"profile";
export interface Patient { name:string; id:string; age:number; diabetesType:string; diabetesDuration:number; medication:string; }
export interface ChatMessage { id:string; role:"user"|"assistant"; content:string; time:string; }
export interface BloodTestResult { name:string; value:string; unit:string; range:string; status:string; date:string; category:string; explanation:string; trend:{month:string;value:number}[]; }
export interface NephropathyPredictionResult { probability:number; category:string; explanation:string; factors:string[]; }
export interface ClinicalSummary { sections:{title:string;text:string;items?:string[]}[] }
