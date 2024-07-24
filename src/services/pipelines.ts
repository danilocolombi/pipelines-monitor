import { getClient } from "azure-devops-extension-api";
import { PipelinesRestClient } from "azure-devops-extension-api/Pipelines/PipelinesClient";
import { Pipeline, Run } from "azure-devops-extension-api/Pipelines/Pipelines";
import { getCurrentProjectName } from "./projects";
import {
  Build,
  BuildRestClient,
  BuildResult,
} from "azure-devops-extension-api/Build";
export interface PipelineWithRuns {
  pipeline: Pipeline;
  runs: Build[];
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
  const buildClient = getClient(BuildRestClient);

  const runPromises: Promise<PipelineWithRuns>[] = pipelines.map(
    async (pipeline) => {
      return {
        pipeline,
        runs: await buildClient.getBuilds(projectName, [pipeline.id]),
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
  runs: Build[],
  showAsPercentage: boolean
): PipelineStats {
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let avgDuration = 0;
  let runCount = 0;

  runs
    .filter((run) => run.finishTime !== undefined)
    .forEach((run) => {
      avgDuration += run.finishTime.valueOf() - run.startTime.valueOf();
      if (run.result === BuildResult.Succeeded) {
        succeeded += 1;
      } else if (run.result === BuildResult.Failed) {
        failed += 1;
      } else if (run.result === BuildResult.Canceled) {
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
