import type { NeuropathyPredictionResult } from "@/src/types";

// TODO: Replace with a clinically validated neuropathy prediction API.
// This mock must never be used to diagnose or guide treatment.
export async function predictNeuropathyRisk(
  patientInput: Record<string, string>,
): Promise<NeuropathyPredictionResult> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  // Deterministic mock variation makes the prototype gauge respond to inputs.
  const duration = Number(patientInput.duration) || 0;
  const hba1c = Number(patientInput.hba1c) || 0;
  const symptomPoints = /yes/i.test(patientInput.numbness || "") ? 18 : 0;
  const probability = Math.min(88, Math.max(8, Math.round(10 + duration * 1.2 + Math.max(0, hba1c - 6) * 5 + symptomPoints)));
  const category = probability < 30 ? "Low risk" : probability < 60 ? "Moderate risk" : "High risk";

  return {
    probability,
    category,
    explanation: `This mock result suggests a ${category.toLowerCase()} of diabetes-related nerve damage based on the information entered. It is not a diagnosis.`,
    factors: [
      "Longer diabetes duration may increase risk",
      "Blood glucose control can affect nerve health",
      /yes/i.test(patientInput.numbness || "")
        ? "Reported numbness or tingling should be discussed with your doctor"
        : "No numbness or tingling was reported",
    ],
  };
}
