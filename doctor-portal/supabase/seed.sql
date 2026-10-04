-- Demo data. Run AFTER creating two users in Supabase Auth (Authentication -> Users):
--   sarah@example.com  (patient)      dr.lim@example.com  (doctor)

insert into public.profiles (id, patient_id, full_name, email, date_of_birth, diabetes_type, diabetes_duration_years, preferred_language, role)
select id, 'CL-10482', 'Sarah Ahmad', email, '1972-03-14', 'Type 2 diabetes', 9, 'en', 'patient'
from auth.users where email = 'sarah@example.com' on conflict (id) do nothing;

insert into public.profiles (id, patient_id, full_name, email, date_of_birth, diabetes_type, diabetes_duration_years, preferred_language, role)
select id, 'DR-0001', 'Dr. Michelle Lim', email, '1980-01-01', 'n/a', 0, 'en', 'doctor'
from auth.users where email = 'dr.lim@example.com' on conflict (id) do update set role = 'doctor';

insert into public.patient_records (user_id, record_date, record_data, nephropathy_input, neuropathy_input)
select id, '2026-07-28', $json$
{
  "medication": "Metformin 500 mg twice daily",
  "bloodPressure": "128/82",
  "kidneyFunction": 82,
  "trendData": [{"month":"Feb","value":7.5},{"month":"May","value":7.4},{"month":"Jul","value":7.1}],
  "bloodTests": [
    {"name":"HbA1c","value":"7.1","unit":"%","range":"4.0–7.0","status":"Slightly above","category":"Diabetes","date":"28 Jul 2026","explanation":"HbA1c reflects your average blood glucose over the previous two to three months.","trend":[{"month":"Feb","value":7.5},{"month":"May","value":7.4}]},
    {"name":"Fasting blood glucose","value":"7.8","unit":"mmol/L","range":"4.4–7.0","status":"High","category":"Diabetes","date":"28 Jul 2026","explanation":"This measures glucose after you have not eaten for at least eight hours.","trend":[{"month":"Feb","value":8.3},{"month":"May","value":7.9}]},
    {"name":"Serum creatinine","value":"78","unit":"µmol/L","range":"45–90","status":"Normal","category":"Kidney","date":"28 Jul 2026","explanation":"Creatinine helps show how effectively your kidneys remove waste.","trend":[{"month":"Feb","value":76},{"month":"May","value":78}]},
    {"name":"eGFR","value":"82","unit":"mL/min/1.73m²","range":">60","status":"Good","category":"Kidney","date":"28 Jul 2026","explanation":"eGFR estimates how well your kidneys filter your blood.","trend":[{"month":"Feb","value":84},{"month":"May","value":82}]}
  ],
  "clinicalSummary": {"sections": [
    {"title":"Current condition","text":"Your diabetes is moderately controlled. Your latest HbA1c is slightly above target, but it has improved since your previous visit."},
    {"title":"Kidney health","text":"Your kidney function is within a healthy range. Regular monitoring remains important."},
    {"title":"Recommended actions","text":"Small, consistent actions help.","items":["Reduce sugary drinks","Take medication consistently","Complete your next blood test"]}
  ]},
  "appointments": [{"type":"Diabetes follow-up","doctor":"Dr. Michelle Lim","date":"20 August 2026","time":"10:30 AM"}]
}
$json$::jsonb,
'{"AGE":54,"SEX":0,"BMI":26.4,"SP":128,"BP":82,"HbA1c":7.1,"FPS":140.4,"FAMILY H/O":0,"ONSET AGE":45,"SMOKING":0,"PHY ACT":1,"MED USE":1,"MED ADH":1,"NEU":0,"RET":0,"CV":0}'::jsonb,
'{"AGE":54,"SEX":0,"BMI":26.4,"SP":128,"BP":82,"HbA1c":7.1,"FPS":140.4,"FAMILY H/O":0,"ONSET AGE":45,"SMOKING":0,"PHY ACT":1,"MED USE":1,"MED ADH":1,"NEP":0}'::jsonb
from public.profiles where email = 'sarah@example.com' on conflict (user_id) do nothing;
