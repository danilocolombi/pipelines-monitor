import { getClient } from "azure-devops-extension-api";
import { PipelinesRestClient } from "azure-devops-extension-api/Pipelines/PipelinesClient";
import { Pipeline } from "azure-devops-extension-api/Pipelines/Pipelines";
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

  const pipelines = await getClient(PipelinesRestClient).listPipelines(
    projectName
  );
  const runs = await getClient(BuildRestClient).getBuilds(
    projectName,
    pipelines.map((p) => p.id)
  );

  const result = groupBy(runs.filter((run) => run.finishTime !== undefined));
  const stats: PipelineOverview[] = [];

  result.forEach((runs, key) => {
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    let avgDuration = 0;
    let runCount = 0;
    runs.forEach((run) => {
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

    stats.push({
      name: key,
      stats: {
        runs: runCount,
        succeeded,
        failed,
        skipped,
        avgDuration: Number.isNaN(avgDuration) ? 0 : avgDuration / runCount,
      },
    });
  });

  if (pipelines.length !== stats.length) {
    pipelines.forEach((pipeline) => {
      if (!stats.some((run) => run.name === pipeline.name)) {
        stats.push({
          name: pipeline.name,
          stats: {
            runs: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            avgDuration: 0,
          },
        });
      }
    });
  }

  return stats.sort((a, b) => b.stats.runs - a.stats.runs);
}

function groupBy(list: Build[]): Map<string, Build[]> {
  const map = new Map();
  list.forEach((item) => {
    const key = item.definition.name;
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
}
