import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import { getBackendAuthToken, getClientBackendBase } from '@/lib/backendClient';

const backendAxios = axios.create();
backendAxios.interceptors.request.use(async (config) => {
  const base = getClientBackendBase();
  if (config.url && !config.url.startsWith('http')) {
    config.url = `${base}${config.url.startsWith('/') ? '' : '/'}${config.url}`;
  }
  const token = await getBackendAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const PLATFORM_PATH = '/api/v1/platform';

export interface DashboardMetrics {
  active_dataset: string;
  dataset_health_score: number;
  best_model: string;
  model_accuracy: number;
  active_agents: number;
  ollama_status: string;
  langgraph_status: string;
  mlops_status: string;
  workflow_state: string;
}

export type WorkflowState = 'Idle' | 'Uploading' | 'Processing' | 'Completed' | 'Failed';

export interface ProfileData {
  rows: number;
  cols: number;
  missing: number;
  duplicates: number;
  outliers: number;
  schema: Record<string, string>;
}

export interface EDAData {
  correlations: Record<string, Record<string, number>>;
  histograms: Record<string, { counts: number[]; bins: number[] }>;
  boxplots: Record<string, { min: number; q1: number; median: number; q3: number; max: number }>;
  statistics: Record<string, { mean: number; std: number; skew: number }>;
}

export interface AlgorithmCatalogItem {
  id: string;
  name: string;
  task_type: string;
  tier: string;
  description: string;
  pros: string[];
  cons: string[];
  interpretability: string;
  computational_complexity: string;
  supports_sparse: boolean;
  requires_scaling: boolean;
  handles_missing_natively: boolean;
  is_available: boolean;
  speed_tier: string;
}

export interface CandidateRecommendationItem {
  algorithm_id: string;
  algorithm_name: string;
  task_type: string;
  tier: string;
  is_recommended: boolean;
  is_baseline: boolean;
  priority_rank: number;
  rationale: string;
  estimated_training_speed: string;
  interpretability: string;
}

export interface LeaderboardItem {
  rank?: number;
  model: string;
  algorithm_id?: string;
  tier?: string;
  is_best?: boolean;
  is_baseline?: boolean;
  score: number | null;
  primary_metric?: string;
  fit_time_sec?: number;
  problem_type?: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  roc_auc?: number;
  mae?: number;
  rmse?: number;
  r2?: number;
  mape?: number;
  silhouette_score?: number;
  davies_bouldin_score?: number;
  calinski_harabasz_score?: number;
  feature_importances?: Record<string, number>;
  confusion_matrix?: number[][];
  class_labels?: string[];
}

export interface AutoMLData {
  problem_type: string;
  target?: string;
  best_model: string;
  best_score?: number;
  primary_metric?: string;
  leaderboard: LeaderboardItem[];
  recommended_candidates?: CandidateRecommendationItem[];
  feature_importances?: Record<string, number>;
}

export interface XAIData {
  method?: string;
  method_label?: string;
  model?: string | null;
  best_model?: string | null;
  target?: string | null;
  top_drivers: string[];
  bias_detected?: boolean;
  leakage_alert?: boolean;
  dominant_feature: string | null;
  importances: Record<string, number>;
  waterfall?: { feature: string; start: number; end: number; impact: number }[];
  base_value?: number;
  final_prediction?: number;
}

export interface InsightsData {
  insights: string[];
}

export interface RecommendationsData {
  actions: string[];
}

export interface MLOpsData {
  status: string;
  drift: boolean;
  accuracy_trend: number[];
  deployments: number;
}

export interface JobStatus {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  dataset_name: string;
  current_stage: string;
  current_stage_index: number;
  total_stages: number;
  progress: number;
  estimated_remaining: number;
  error: string | null;
  result: Record<string, any> | null;
}

interface PlatformState {
  datasetName: string | null;
  isLoading: boolean;
  error: string | null;

  dashboardMetrics: DashboardMetrics | null;
  profileData: ProfileData | null;
  edaData: EDAData | null;
  automlData: AutoMLData | null;
  xaiData: XAIData | null;
  insightsData: InsightsData | null;
  recommendationsData: RecommendationsData | null;
  mlopsData: MLOpsData | null;
  algorithmCatalog: AlgorithmCatalogItem[];

  currentJobId: string | null;
  jobStatus: JobStatus | null;
  uploadProgress: number;
  workflowState: WorkflowState;

  setDatasetName: (name: string) => void;
  setWorkflowState: (state: WorkflowState) => void;
  fetchDashboardMetrics: () => Promise<void>;
  fetchEDA: () => Promise<void>;
  fetchAutoML: () => Promise<void>;
  fetchAlgorithms: () => Promise<void>;
  fetchXAI: () => Promise<void>;
  fetchInsights: () => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  fetchMLOps: () => Promise<void>;
  uploadDataset: (file: File) => Promise<{ job_id: string; dataset_name: string } | null>;
  pollJobStatus: (jobId: string) => Promise<JobStatus | null>;
  clearJob: () => void;
  startWorkflow: (datasetName: string) => Promise<void>;
  chat: (query: string) => Promise<string>;
  fetchProfile: () => Promise<void>;
  fetchReports: () => Promise<any>;
  fetchHistory: () => Promise<{ runs: any[]; activity: any[] }>;
}

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set, get) => ({
      datasetName: null,
      isLoading: false,
  error: null,

  dashboardMetrics: null,
  profileData: null,
  edaData: null,
  automlData: null,
  xaiData: null,
  insightsData: null,
  recommendationsData: null,
  mlopsData: null,
  algorithmCatalog: [],

  currentJobId: null,
  jobStatus: null,
  uploadProgress: 0,
  workflowState: 'Idle',

  setDatasetName: (name: string) => set({ datasetName: name }),
  setWorkflowState: (state: WorkflowState) => set({ workflowState: state }),

  fetchDashboardMetrics: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.get(`${PLATFORM_PATH}/dashboard-metrics`);
      set({ dashboardMetrics: res.data.data, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  fetchEDA: async () => {
    const ds = get().datasetName;
    if (!ds) { set({ error: 'No active dataset', edaData: null }); return; }
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.get(`${PLATFORM_PATH}/eda?dataset_name=${encodeURIComponent(ds)}`);
      set({ edaData: res.data.data, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  fetchAutoML: async () => {
    const ds = get().datasetName;
    if (!ds) { set({ error: 'No active dataset', automlData: null }); return; }
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.post(`${PLATFORM_PATH}/predict`, { dataset_name: ds });
      set({ automlData: res.data.data, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  fetchAlgorithms: async () => {
    try {
      const res = await backendAxios.get(`${PLATFORM_PATH}/algorithms`);
      if (res.data?.data?.algorithms) {
        set({ algorithmCatalog: res.data.data.algorithms });
      }
    } catch (err: unknown) {
      console.error("Failed to fetch algorithms catalog:", err);
    }
  },

  fetchXAI: async () => {
    const ds = get().datasetName;
    if (!ds) { set({ error: 'No active dataset', xaiData: null }); return; }
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.get(`${PLATFORM_PATH}/xai?dataset_name=${encodeURIComponent(ds)}`);
      set({ xaiData: res.data.data, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  fetchInsights: async () => {
    const ds = get().datasetName;
    if (!ds) { set({ error: 'No active dataset', insightsData: null }); return; }
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.get(`${PLATFORM_PATH}/insights?dataset_name=${encodeURIComponent(ds)}`);
      set({ insightsData: res.data.data, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  fetchRecommendations: async () => {
    const ds = get().datasetName;
    if (!ds) { set({ error: 'No active dataset', recommendationsData: null }); return; }
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.get(`${PLATFORM_PATH}/recommendations?dataset_name=${encodeURIComponent(ds)}`);
      set({ recommendationsData: res.data.data, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  fetchMLOps: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.get(`${PLATFORM_PATH}/mlops`);
      set({ mlopsData: res.data.data, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  uploadDataset: async (file: File) => {
    if (get().workflowState === 'Failed') {
      // Do not proceed if already failed. User must clear/retry explicitly.
    }
    set({ isLoading: true, error: null, currentJobId: null, jobStatus: null, uploadProgress: 0, workflowState: 'Uploading' });
    try {
      const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks (safe under Vercel's 4.5MB serverless limit)
      const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
      const MAX_RETRIES = 3;

      // Init upload
      const initRes = await backendAxios.post('/api/v1/dataset/upload/init', {
        file_name: file.name,
        total_chunks: totalChunks,
        total_size: file.size
      });
      const uploadId = initRes.data.upload_id;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('upload_id', uploadId);
        formData.append('chunk_index', chunkIndex.toString());

        let attempt = 0;
        let success = false;
        while (attempt < MAX_RETRIES && !success) {
          try {
            await backendAxios.post('/api/v1/dataset/upload/chunk', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            success = true;
          } catch {
            attempt++;
            if (attempt >= MAX_RETRIES) throw new Error(`Failed to upload chunk ${chunkIndex} after ${MAX_RETRIES} attempts`);
            await new Promise(res => setTimeout(res, 1000 * attempt)); // exponential backoff
          }
        }

        set({ uploadProgress: Math.round(((chunkIndex + 1) / totalChunks) * 100) });
      }

      // Complete upload
      const completeRes = await backendAxios.post('/api/v1/dataset/upload/complete', {
        upload_id: uploadId,
        file_name: file.name
      });

      const { job_id, dataset_name } = completeRes.data;
      set({
        datasetName: dataset_name,
        currentJobId: job_id,
        jobStatus: {
          job_id,
          status: 'queued',
          dataset_name,
          current_stage: '',
          current_stage_index: 0,
          total_stages: 9,
          progress: 0,
          estimated_remaining: 0,
          error: null,
          result: null,
        },
        isLoading: false,
      });
      set({ workflowState: 'Processing' });
      return { job_id, dataset_name };
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail || err.message || String(err);
      set({ error: typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail), isLoading: false, workflowState: 'Failed' });
      return null;
    }
  },

  pollJobStatus: async (jobId: string) => {
    const currentState = get().workflowState;
    if (currentState === 'Failed' || currentState === 'Completed') {
      return get().jobStatus;
    }

    try {
      const res = await backendAxios.get(`/api/v1/jobs/${jobId}`);
      const status: JobStatus = res.data;
      set({ jobStatus: status });
      if (status.status === 'completed') {
        set({ workflowState: 'Completed' });
      } else if (status.status === 'failed') {
        set({ workflowState: 'Failed' });
      }
      return status;
    } catch (err: any) {
      const failedStatus: JobStatus = {
        job_id: jobId,
        status: 'failed',
        dataset_name: get().datasetName || '',
        current_stage: 'Polling',
        current_stage_index: 0,
        total_stages: 9,
        progress: 0,
        estimated_remaining: 0,
        error: err.message || 'Connection lost during polling',
        result: null
      };
      set({ jobStatus: failedStatus, workflowState: 'Failed' });
      return failedStatus;
    }
  },

  clearJob: () => set({ currentJobId: null, jobStatus: null, workflowState: 'Idle', uploadProgress: 0, error: null }),

  startWorkflow: async (datasetName: string) => {
    set({ isLoading: true, error: null });
    try {
      await backendAxios.post(`${PLATFORM_PATH}/start-workflow`, { dataset_name: datasetName });
      set({ isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  chat: async (query: string) => {
    const ds = get().datasetName;
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.post(`${PLATFORM_PATH}/chat`, { query, dataset_name: ds || '' });
      set({ isLoading: false });
      return res.data?.data?.response || res.data?.data || 'No response received.';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
      return `Error: ${msg}`;
    }
  },

  fetchProfile: async () => {
    const ds = get().datasetName;
    if (!ds) { set({ error: 'No active dataset', profileData: null }); return; }
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.post(`${PLATFORM_PATH}/profile`, { dataset_name: ds });
      set({ profileData: res.data.data, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  fetchReports: async () => {
    const ds = get().datasetName;
    if (!ds) return null;
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.get(`${PLATFORM_PATH}/reports?dataset_name=${encodeURIComponent(ds)}`);
      set({ isLoading: false });
      return res.data?.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await backendAxios.get(`${PLATFORM_PATH}/experiment-runs`);
      const activity = await backendAxios.get(`${PLATFORM_PATH}/recent-activity`);
      set({ isLoading: false });
      return { runs: res.data?.data?.runs || [], activity: activity.data?.data || [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
      return { runs: [], activity: [] };
    }
  },
  }),
  {
    name: 'agentix-platform-storage', // unique name
    storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    partialize: (state) => ({ 
      datasetName: state.datasetName,
      dashboardMetrics: state.dashboardMetrics,
      currentJobId: state.currentJobId,
      jobStatus: state.jobStatus,
      workflowState: state.workflowState
    }),
  }
));
