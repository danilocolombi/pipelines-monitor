import { getClient } from "azure-devops-extension-api";
import { PipelinesRestClient } from "azure-devops-extension-api/Pipelines/PipelinesClient";
import { Pipeline } from "azure-devops-extension-api/Pipelines/Pipelines";
import {
  Build,
  BuildRestClient,
  BuildResult,
} from "azure-devops-extension-api/Build";
import { PipelineOverview } from "../models/pipeline-overview";
import { getCurrentProjectName } from "./projects";

export async function getPipelineOverview(
  projects: string[],
  showAsPercentage: boolean,
  renderMultipleProjects: boolean
): Promise<PipelineOverview[]> {
  const stats: PipelineOverview[] = [];

  if (renderMultipleProjects) {
    for (const project of projects) {
      stats.push(...(await getPipelinesPerProject(project, showAsPercentage)));
    }
  } else {
    const project = await getCurrentProjectName();
    stats.push(...(await getPipelinesPerProject(project, showAsPercentage)));
  }
  return stats.sort((a, b) => b.stats.runs - a.stats.runs);
}

async function getPipelinesPerProject(
  projectName: string,
  showAsPercentage: boolean
): Promise<PipelineOverview[]> {
  const pipelines = await getClient(PipelinesRestClient).listPipelines(
    projectName
  );
  const map = await getBuildsGroupedByPipeline(projectName, pipelines);
  const stats: PipelineOverview[] = [];

  map.forEach((value, key) => {
    let succeeded = 0;
    let failed = 0;
    let canceled = 0;
    let avgDuration = 0;
    const count = value.builds.length;
    value.builds.forEach((build) => {
      avgDuration += build.finishTime.valueOf() - build.startTime.valueOf();
      if (build.result === BuildResult.Succeeded) {
        succeeded += 1;
      } else if (build.result === BuildResult.Failed) {
        failed += 1;
      } else if (build.result === BuildResult.Canceled) {
        canceled += 1;
      }
    });

    if (showAsPercentage) {
      succeeded = convertValueToPercent(succeeded, count);
      failed = convertValueToPercent(failed, count);
      canceled = convertValueToPercent(canceled, count);
    }

    stats.push({
      projectName: projectName,
      pipeline: {
        name: key,
        url: value.pipelineUrl,
      },
      stats: {
        runs: count,
        succeeded,
        failed,
        canceled,
        avgDuration: avgDuration / count,
      },
    });
  });

  if (pipelines.length !== stats.length) {
    pipelines.forEach((pipeline) => {
      if (!stats.some((run) => run.pipeline.name === pipeline.name)) {
        stats.push({
          projectName: projectName,
          pipeline: {
            name: pipeline.name,
            url: pipeline.url,
          },
          stats: {
            runs: 0,
            succeeded: 0,
            failed: 0,
            canceled: 0,
            avgDuration: 0,
          },
        });
      }
    });
  }

  return stats;
}

async function getBuildsGroupedByPipeline(
  projectName: string,
  pipelines: Pipeline[]
): Promise<Map<string, { builds: Build[]; pipelineUrl: string }>> {
  const buildsClient = getClient(BuildRestClient);

  const builds = await buildsClient.getBuilds(
    projectName,
    pipelines.map((p) => p.id)
  );

  const map = new Map<string, { builds: Build[]; pipelineUrl: string }>();

  builds
    .filter((run) => run.finishTime !== undefined)
    .forEach((build) => {
      const key = build.definition.name;
      const currentValue = map.get(key);
      if (!currentValue) {
        const url = pipelines.find((p) => p.id === build.definition.id)?._links.web.href;
        map.set(key, { builds: [build], pipelineUrl: url });
      } else {
        currentValue.builds.push(build);
      }
    });

  return map;
}

function convertValueToPercent(value: number, total: number): number {
  return Math.round((value / total) * 100);
}
