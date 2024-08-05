export interface PipelineOverview {
  name: string;
  stats: {
    runs: number;
    succeeded: number;
    failed: number;
    canceled: number;
    avgDuration: number;
  };
}