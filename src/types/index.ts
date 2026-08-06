export type Page = "dashboard"|"summary"|"assistant"|"ckd"|"results"|"footcheck"|"profile"|"settings";
export interface Patient { name:string; id:string; age:number; diabetesType:string; diabetesDuration:number; medication:string; }
export interface ChatMessage { id:string; role:"user"|"assistant"; content:string; time:string; }
export interface BloodTestResult { name:string; value:string; unit:string; range:string; status:string; date:string; category:string; explanation:string; trend:{month:string;value:number}[]; }
export interface NephropathyPredictionResult { probability:number; category:string; explanation:string; factors:string[]; }
export interface ClinicalSummary { sections:{title:string;text:string;items?:string[]}[] }
export interface PatientProfile {
  id:string; patientId:string; fullName:string; email:string; dateOfBirth:string;
  diabetesType:string; diabetesDurationYears:number; preferredLanguage:"en"|"ms";
}
export interface PatientRecordData {
  medication:string; bloodPressure:string; kidneyFunction:number;
  bloodTests:BloodTestResult[]; trendData:{month:string;value:number}[];
  clinicalSummary:ClinicalSummary;
  appointments:{type:string;doctor:string;date:string;time:string}[];
}
export interface CareLinkPatientData {
  profile:PatientProfile; recordDate:string; record:PatientRecordData;
  nephropathyInput:Record<string,number|undefined>;
  neuropathyInput:Record<string,number|undefined>;
}
