import { getClient } from "azure-devops-extension-api";
import { PipelinesRestClient } from "azure-devops-extension-api/Pipelines/PipelinesClient";
import { Pipeline, Run } from "azure-devops-extension-api/Pipelines/Pipelines";
import { getCurrentProjectName } from "./projects";

export interface PipelineWithRuns {
  pipeline: Pipeline;
  runs: Run[];
}

export interface PipelineOverview {
  name: string;
  stats: PipelineStats;
}

export interface PipelineStats {
  runs: number;
  succeeded: number;
  failed: number;
  skipped: number;
  avgDuration: number;
}

export async function getPipelines(
  showAsPercentage: boolean
): Promise<PipelineOverview[]> {
  const projectName = await getCurrentProjectName();

  if (projectName === undefined) {
    return [];
  }

  const client = getClient(PipelinesRestClient);
  const pipelines = await client.listPipelines(projectName);

  const runPromises: Promise<PipelineWithRuns>[] = pipelines.map(
    async (pipeline) => {
      return {
        pipeline,
        runs: await client.listRuns(projectName, pipeline.id),
      };
    }
  );

  const pipelinesWithRuns = await Promise.all(runPromises);

  return pipelinesWithRuns
    .map(({ pipeline, runs }) => {
      return {
        name: pipeline.name,
        stats: getPipelineStats(runs, showAsPercentage),
      };
    })
    .sort((a, b) => b.stats.runs - a.stats.runs);
}

function getPipelineStats(
  runs: Run[],
  showAsPercentage: boolean
): PipelineStats {
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let avgDuration = 0;
  let runCount = 0;

  runs
    .filter((run) => run.finishedDate !== undefined)
    .forEach((run) => {
      avgDuration += run.finishedDate.valueOf() - run.createdDate.valueOf();
      if (run.result.toString() === "succeeded") {
        succeeded += 1;
      } else if (run.result.toString() === "failed") {
        failed += 1;
      } else if (run.result.toString() === "canceled") {
        skipped += 1;
      }
      runCount += 1;
    });

  if (showAsPercentage && runCount > 0) {
    succeeded = Math.round((succeeded / runCount) * 100);
    failed = Math.round((failed / runCount) * 100);
    skipped = Math.round((skipped / runCount) * 100);
  }

  return {
    runs: runCount,
    succeeded,
    failed,
    skipped,
    avgDuration: Number.isNaN(avgDuration) ? 0 : avgDuration / runCount,
  };
}
