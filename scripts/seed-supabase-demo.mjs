import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

function loadLocalEnv() {
  const values = {};
  const contents = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    values[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return values;
}

const env = { ...loadLocalEnv(), ...process.env };
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
}

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const credentials = [
  ["Noor Ahmad", "noor.ahmad@demo.carelink.my", "CareLink!Noor26", "CL-10482"],
  ["Aiman Hakim", "aiman.hakim@demo.carelink.my", "CareLink!Aiman26", "CL-10511"],
  ["Tan Mei Ling", "mei.ling.tan@demo.carelink.my", "CareLink!MeiLing26", "CL-10524"],
  ["Kumar Rajan", "kumar.rajan@demo.carelink.my", "CareLink!Kumar26", "CL-10537"],
  ["Nurul Aisyah", "nurul.aisyah@demo.carelink.my", "CareLink!Nurul26", "CL-10549"],
  ["Rajesh Nair", "rajesh.nair@demo.carelink.my", "CareLink!Rajesh26", "CL-10563"],
  ["Chong Wei Jian", "wei.jian.chong@demo.carelink.my", "CareLink!WeiJian26", "CL-10578"],
];

const modelInputs = [
  { AGE:38,SEX:0,BMI:26.4,SP:128,BP:82,HbA1c:7.1,FPS:140.4,PPS:190,"FAMILY H/O":0,"ONSET AGE":29,SMOKING:0,"PHY ACT":1,"MED USE":1,"MED ADH":1,NEU:0,RET:0,CV:0,NEP:0 },
  { AGE:53,SEX:0,BMI:27.9,SP:155,BP:96,HbA1c:6.1,FPS:138,PPS:220,"FAMILY H/O":0,"ONSET AGE":48,SMOKING:0,"PHY ACT":1,"MED USE":1,"MED ADH":0,NEU:0,RET:0,CV:1,NEP:0 },
  { AGE:46,SEX:0,BMI:34.1,SP:168,BP:89,HbA1c:8.5,FPS:181,PPS:257,"FAMILY H/O":0,"ONSET AGE":25,SMOKING:0,"PHY ACT":1,"MED USE":1,"MED ADH":1,NEU:0,RET:0,CV:0,NEP:0 },
  { AGE:73,SEX:1,BMI:24,SP:164,BP:88,HbA1c:10.8,FPS:199,PPS:231,"FAMILY H/O":0,"ONSET AGE":44,SMOKING:1,"PHY ACT":0,"MED USE":1,"MED ADH":1,NEU:0,RET:0,CV:0,NEP:0 },
  { AGE:50,SEX:1,BMI:24,SP:119,BP:103,HbA1c:8.4,FPS:185,PPS:258,"FAMILY H/O":0,"ONSET AGE":37,SMOKING:1,"PHY ACT":0,"MED USE":1,"MED ADH":1,NEU:0,RET:0,CV:1,NEP:0 },
  { AGE:73,SEX:1,BMI:20.7,SP:139,BP:101,HbA1c:10.7,FPS:226,PPS:348,"FAMILY H/O":0,"ONSET AGE":59,SMOKING:1,"PHY ACT":0,"MED USE":1,"MED ADH":0,NEU:0,RET:0,CV:0,NEP:0 },
  { AGE:77,SEX:1,BMI:34.7,SP:157,BP:75,HbA1c:10.1,FPS:172,PPS:324,"FAMILY H/O":1,"ONSET AGE":47,SMOKING:0,"PHY ACT":1,"MED USE":1,"MED ADH":1,NEU:0,RET:0,CV:1,NEP:0 },
];

const details = [
  { dob:"1988-03-14",duration:9,medication:"Metformin 500 mg twice daily",egfr:82,creatinine:78,urea:5.2,potassium:4.2,haemoglobin:132,doctor:"Dr. Michelle Lim",summary:"Blood sugar control has improved slightly. Kidney function is stable." },
  { dob:"1973-11-08",duration:5,medication:"Metformin 500 mg once daily",egfr:91,creatinine:71,urea:4.6,potassium:4.0,haemoglobin:139,doctor:"Dr. Amirul Hakim",summary:"Long-term glucose is near target. Blood pressure needs clinician review." },
  { dob:"1980-06-22",duration:21,medication:"Metformin 1 g twice daily",egfr:76,creatinine:84,urea:5.8,potassium:4.4,haemoglobin:128,doctor:"Dr. Michelle Lim",summary:"Glucose and blood pressure are above target. Kidney monitoring remains important." },
  { dob:"1953-01-17",duration:29,medication:"Metformin 500 mg twice daily and insulin",egfr:58,creatinine:104,urea:7.1,potassium:4.8,haemoglobin:121,doctor:"Dr. S. Devi",summary:"Glucose remains well above target. Kidney function is reduced and requires close follow-up." },
  { dob:"1976-09-03",duration:13,medication:"Metformin 1 g twice daily",egfr:68,creatinine:91,urea:6.3,potassium:4.5,haemoglobin:130,doctor:"Dr. Amirul Hakim",summary:"Glucose is above target. Cardiovascular and kidney risk factors should be reviewed." },
  { dob:"1953-12-29",duration:14,medication:"Metformin 500 mg twice daily and gliclazide",egfr:54,creatinine:112,urea:7.4,potassium:4.9,haemoglobin:118,doctor:"Dr. S. Devi",summary:"Glucose control and kidney filtration need prompt clinical review and ongoing monitoring." },
  { dob:"1949-05-12",duration:30,medication:"Metformin 500 mg twice daily and insulin",egfr:48,creatinine:119,urea:8.1,potassium:4.8,haemoglobin:116,doctor:"Dr. S. Devi",summary:"Glucose is well above target and kidney filtration is reduced. Close clinical follow-up is required for kidney and nerve complication risks." },
];

function makeRecord(index) {
  const input = modelInputs[index];
  const detail = details[index];
  const fastingMmol = Math.round((input.FPS / 18) * 10) / 10;
  const appointmentDate = "20 August 2026";
  const tests = [
    { name:"HbA1c",value:String(input.HbA1c),unit:"%",range:"4.0–7.0",status:input.HbA1c<=7?"Normal":input.HbA1c<8?"Slightly above":"High",category:"Diabetes",explanation:"HbA1c reflects average blood glucose over the previous two to three months.",trend:[Math.round((input.HbA1c+0.4)*10)/10,input.HbA1c] },
    { name:"Fasting blood glucose",value:String(fastingMmol),unit:"mmol/L",range:"4.4–7.0",status:fastingMmol<=7?"Normal":"High",category:"Diabetes",explanation:"This measures glucose after not eating for at least eight hours.",trend:[Math.round((fastingMmol+0.5)*10)/10,fastingMmol] },
    { name:"Serum creatinine",value:String(detail.creatinine),unit:"µmol/L",range:"45–90",status:detail.creatinine<=90?"Normal":"High",category:"Kidney",explanation:"Creatinine helps show how effectively the kidneys remove waste.",trend:[detail.creatinine-2,detail.creatinine] },
    { name:"eGFR",value:String(detail.egfr),unit:"mL/min/1.73m²",range:">60",status:detail.egfr>60?"Good":"Needs attention",category:"Kidney",explanation:"eGFR estimates how well the kidneys filter blood.",trend:[detail.egfr+2,detail.egfr] },
    { name:"Blood urea",value:String(detail.urea),unit:"mmol/L",range:"2.5–7.8",status:"Normal",category:"Kidney",explanation:"Urea is a waste product filtered by the kidneys.",trend:[detail.urea-0.2,detail.urea] },
    { name:"Potassium",value:String(detail.potassium),unit:"mmol/L",range:"3.5–5.1",status:"Normal",category:"General",explanation:"Potassium supports muscles, nerves and heart rhythm.",trend:[detail.potassium-0.1,detail.potassium] },
    { name:"Haemoglobin",value:String(detail.haemoglobin),unit:"g/L",range:"120–160",status:detail.haemoglobin>=120?"Normal":"Low",category:"General",explanation:"Haemoglobin carries oxygen around the body.",trend:[detail.haemoglobin-2,detail.haemoglobin] },
  ];
  return {
    medication: detail.medication,
    bloodPressure: `${input.SP}/${input.BP}`,
    kidneyFunction: detail.egfr,
    bloodTests: tests,
    trendData: tests[0].trend.map((value,i)=>({month:["Feb","May"][i],value})),
    clinicalSummary: { sections: [
      { title:"Current condition",text:detail.summary },
      { title:"Medication",text:`Continue ${detail.medication} as prescribed. Do not change medication without speaking to the clinician.` },
      { title:"Important blood test findings",text:`Latest HbA1c is ${input.HbA1c}%, fasting glucose is ${fastingMmol} mmol/L, and eGFR is ${detail.egfr}.` },
      { title:"Recommended actions",text:"Continue the agreed care plan and complete scheduled monitoring.",items:["Take medication consistently","Monitor blood glucose","Attend the next appointment"] },
    ]},
    appointments:[{type:"Diabetes follow-up",doctor:detail.doctor,date:appointmentDate,time:"10:30 AM"}],
  };
}

const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

for (let index = 0; index < credentials.length; index += 1) {
  const [name, email, password, patientId] = credentials[index];
  let user = listed.users.find((candidate) => candidate.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, demo_patient: true },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw error;
  }

  const detail = details[index];
  const profile = {
    id: user.id,
    patient_id: patientId,
    full_name: name,
    email,
    date_of_birth: detail.dob,
    diabetes_type: "Type 2 diabetes",
    diabetes_duration_years: detail.duration,
    preferred_language: "en",
  };
  const { error: profileError } = await admin.from("profiles").upsert(profile);
  if (profileError) throw new Error(`Profile seed failed for ${email}: ${profileError.message}`);

  const input = modelInputs[index];
  const { error: recordError } = await admin.from("patient_records").upsert({
    user_id: user.id,
    record_date: "2026-07-28",
    record_data: makeRecord(index),
    nephropathy_input: Object.fromEntries(Object.entries(input).filter(([key]) => key !== "NEP")),
    neuropathy_input: Object.fromEntries(Object.entries(input).filter(([key]) => key !== "NEU")),
  });
  if (recordError) throw new Error(`Record seed failed for ${email}: ${recordError.message}`);
  console.log(`Seeded ${patientId} ${email}`);
}
