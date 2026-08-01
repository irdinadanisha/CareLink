import type { NephropathyPredictionResult } from "@/src/types";

type Tree = {
  childrenLeft: number[];
  childrenRight: number[];
  feature: number[];
  threshold: number[];
  values: number[][];
};
type RandomForestExport = {
  modelType: "RandomForestClassifier";
  target: "NEP";
  targetMeaning: "nephropathy";
  features: string[];
  medians: number[];
  treeCount: number;
  trees: Tree[];
  validation: { accuracy: number; rocAuc: number; testSamples: number };
};

let cachedModel: RandomForestExport | null = null;

async function loadModel(): Promise<RandomForestExport> {
  if (cachedModel) return cachedModel;
  const response = await fetch("/models/random_forest_nephropathy.json");
  if (!response.ok) throw new Error("The Random Forest model could not be loaded.");
  cachedModel = (await response.json()) as RandomForestExport;
  return cachedModel;
}

function treeProbability(tree: Tree, values: number[]): number {
  let node = 0;
  while (tree.childrenLeft[node] !== -1) {
    const featureIndex = tree.feature[node];
    node = values[featureIndex] <= tree.threshold[node]
      ? tree.childrenLeft[node]
      : tree.childrenRight[node];
  }
  const classes = tree.values[node];
  const total = classes.reduce((sum, value) => sum + value, 0);
  return total > 0 ? classes[1] / total : 0;
}

export async function predictNephropathyRisk(
  patientRecord: Record<string, number | undefined>,
): Promise<NephropathyPredictionResult & { modelAccuracy: number; rocAuc: number; treeCount: number }> {
  const model = await loadModel();
  if (model.modelType !== "RandomForestClassifier" || model.target !== "NEP") {
    throw new Error("Unexpected model artifact. Random Forest NEP model required.");
  }
  const values = model.features.map((feature, index) => {
    const value = patientRecord[feature];
    // scikit-learn evaluates decision-tree inputs as float32. Matching that
    // precision here preserves identical branches at threshold boundaries.
    return Math.fround(Number.isFinite(value) ? Number(value) : model.medians[index]);
  });
  const rawProbability = model.trees.reduce((sum, tree) => sum + treeProbability(tree, values), 0) / model.treeCount;
  const probability = Math.round(rawProbability * 1000) / 10;
  const category = probability < 30 ? "Low risk" : probability < 60 ? "Moderate risk" : "High risk";

  return {
    probability,
    category,
    explanation: `The fitted Random Forest estimates a ${probability}% probability of nephropathy for the available patient record. This is a model estimate, not a diagnosis.`,
    factors: [
      "HbA1c and glucose measurements from the latest record",
      "Blood pressure, age, BMI, and diabetes history",
      "Stored training medians for model fields not present in the current record",
    ],
    modelAccuracy: model.validation.accuracy,
    rocAuc: model.validation.rocAuc,
    treeCount: model.treeCount,
  };
}
