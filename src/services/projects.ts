import { CommonServiceIds, getClient, IProjectPageService } from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";
import { CoreRestClient } from "azure-devops-extension-api/Core/CoreClient";
export async function getCurrentProjectName(): Promise<string> {
  const pps = await SDK.getService<IProjectPageService>(
    CommonServiceIds.ProjectPageService
  );

  const project = await pps.getProject();
  return project?.name ?? "";
}

export async function getAllProjects(): Promise<string[]> {
  const coreClient = getClient(CoreRestClient);
  const projects = await coreClient.getProjects();
  return projects.map((p) => p.name);
}