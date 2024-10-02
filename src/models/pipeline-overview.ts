export interface PipelineOverview {
  pipeline: {
    name: string;
    url: string;
  }
  projectName: string,
  stats: {
    runs: number;
    succeeded: number;
    failed: number;
    canceled: number;
    avgDuration: number;
  };
}