import { CommonServiceIds, IProjectPageService } from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";

export async function getCurrentProjectName(): Promise<string | undefined> {
  const pps = await SDK.getService<IProjectPageService>(
    CommonServiceIds.ProjectPageService
  );

  const project = await pps.getProject();
  return project?.name;
}