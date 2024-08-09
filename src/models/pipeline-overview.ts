export interface PipelineOverview {
  name: string;
  projectName: string,
  stats: {
    runs: number;
    succeeded: number;
    failed: number;
    canceled: number;
    avgDuration: number;
  };
}