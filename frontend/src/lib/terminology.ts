/**
 * Agentix Institutional Terminology System
 * Maps technical data science primitives into institutional and executive vernacular.
 */

const TERMINOLOGY_MAP: Record<string, string> = {
  'Cleaning': 'Data Hygiene & Sanitization',
  'Profiling': 'Dimensional Profiling',
  'Exploratory Data Analysis': 'Multivariate Distribution Analysis',
  'EDA': 'Exploratory Analysis',
  'Model Planning': 'Algorithmic Candidate Selection',
  'Training': 'Neural Model Training',
  'Feature Engineering': 'Synthetic Feature Synthesis',
  'Explainability': 'Attribution & SHAP Explainability',
  'SHAP Explain': 'XAI Feature Attributions',
  'Evaluation': 'Empirical Benchmark Leaderboard',
  'Insights': 'Institutional Synthesis',
  'Recommendations': 'Strategic Prescriptions',
};

export function getTerm(key: string): string {
  return TERMINOLOGY_MAP[key] || key;
}

export default getTerm;
