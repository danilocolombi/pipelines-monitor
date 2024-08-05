import { getClient } from "azure-devops-extension-api";
import { PipelinesRestClient } from "azure-devops-extension-api/Pipelines/PipelinesClient";
import { Pipeline } from "azure-devops-extension-api/Pipelines/Pipelines";
import { getAllProjects, getCurrentProjectName } from "./projects";
import {
  Build,
  BuildRestClient,
  BuildResult,
} from "azure-devops-extension-api/Build";
import { PipelineOverview } from "../models/pipeline-overview";

export async function getPipelineOverview(
  loadAllProjects: boolean,
  showAsPercentage: boolean
): Promise<PipelineOverview[]> {
  const allProjects = loadAllProjects
    ? await getAllProjects()
    : [await getCurrentProjectName()];
  const stats: PipelineOverview[] = [];

  for (const project of allProjects) {
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
  const buildsGroupByPipeline = await getBuildsGroupedByPipeline(
    projectName,
    pipelines
  );
  const stats: PipelineOverview[] = [];

  buildsGroupByPipeline.forEach((builds, pipeline) => {
    let succeeded = 0;
    let failed = 0;
    let canceled = 0;
    let avgDuration = 0;
    builds.forEach((run) => {
      avgDuration += run.finishTime.valueOf() - run.startTime.valueOf();
      if (run.result === BuildResult.Succeeded) {
        succeeded += 1;
      } else if (run.result === BuildResult.Failed) {
        failed += 1;
      } else if (run.result === BuildResult.Canceled) {
        canceled += 1;
      }
    });

    if (showAsPercentage) {
      succeeded = convertValueToPercent(succeeded, builds.length);
      failed = convertValueToPercent(failed, builds.length);
      canceled = convertValueToPercent(canceled, builds.length);
    }

    stats.push({
      projectName: projectName,
      name: pipeline,
      stats: {
        runs: builds.length,
        succeeded,
        failed,
        canceled,
        avgDuration: avgDuration / builds.length,
      },
    });
  });

  if (pipelines.length !== stats.length) {
    pipelines.forEach((pipeline) => {
      if (!stats.some((run) => run.name === pipeline.name)) {
        stats.push({
          projectName: projectName,
          name: pipeline.name,
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
): Promise<Map<string, Build[]>> {
  const builds = await getClient(BuildRestClient).getBuilds(
    projectName,
    pipelines.map((p) => p.id)
  );
  const map = new Map();

  builds
    .filter((run) => run.finishTime !== undefined)
    .forEach((build) => {
      const key = build.definition.name;
      const currentValue = map.get(key);
      if (!currentValue) {
        map.set(key, [build]);
      } else {
        currentValue.push(build);
      }
    });

  return map;
}

function convertValueToPercent(value: number, total: number): number {
  return Math.round((value / total) * 100);
}
