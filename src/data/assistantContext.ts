/**
 * Read-only mock context supplied to the health assistant on the server.
 * TODO: Replace with an authenticated, consent-aware database query. Only
 * retrieve the signed-in patient's minimum necessary record fields.
 */
export const assistantPatientContext = {
  recordType: "mock patient record",
  recordDate: "28 July 2026",
  patient: {
    firstName: "Sarah",
    age: 54,
    diabetesType: "Type 2 diabetes",
    diabetesDurationYears: 9,
  },
  medications: [
    { name: "Metformin", dose: "500 mg", schedule: "twice daily" },
  ],
  bloodTests: [
    { test: "HbA1c", result: 7.1, unit: "%", referenceOrTarget: "below 7.0%", status: "slightly above target" },
    { test: "Fasting blood glucose", result: 7.8, unit: "mmol/L", referenceOrTarget: "4.4–7.0 mmol/L", status: "high" },
    { test: "Serum creatinine", result: 78, unit: "µmol/L", referenceOrTarget: "45–90 µmol/L", status: "normal" },
    { test: "eGFR", result: 82, unit: "mL/min/1.73m²", referenceOrTarget: "above 60", status: "good" },
    { test: "Blood urea", result: 5.2, unit: "mmol/L", referenceOrTarget: "2.5–7.8 mmol/L", status: "normal" },
    { test: "Potassium", result: 4.2, unit: "mmol/L", referenceOrTarget: "3.5–5.1 mmol/L", status: "normal" },
    { test: "Haemoglobin", result: 132, unit: "g/L", referenceOrTarget: "120–160 g/L", status: "normal" },
  ],
  observations: [
    { measurement: "Blood pressure", result: "128/82 mmHg", target: "below 130/80", status: "close to target" },
  ],
  modelRiskEstimates: [
    { complication: "Diabetic nephropathy", probability: "34.9%", category: "Moderate risk", model: "Random Forest" },
    { complication: "Diabetic neuropathy", probability: "56.0%", category: "Moderate risk", model: "Random Forest" },
  ],
  clinicalSummary: "Blood sugar control has improved slightly since the previous appointment. Kidney function is currently stable. Continue prescribed medication and be mindful of carbohydrate portions.",
  upcomingCare: {
    nextBloodTestDue: "before 15 August 2026",
    nextAppointment: "20 August 2026 at 10:30 AM with Dr. Michelle Lim",
  },
} as const;
