export interface PipelineOverview {
  name: string;
  stats: {
    runs: number;
    succeeded: number;
    failed: number;
    skipped: number;
    avgDuration: number;
  };
}