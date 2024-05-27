import { Wiql, WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";
import { getCurrentProjectName } from "./projects";
import { getClient } from "azure-devops-extension-api";

export async function getTotalBusinessValue(
  workItemType: string,
  period: string
): Promise<number> {
  const projectName = await getCurrentProjectName();

  if (projectName === undefined) {
    return 0;
  }

  const wiql: Wiql = {
    query: `SELECT [System.Id] FROM workitems WHERE [System.TeamProject] = '${projectName}' AND [System.WorkItemType] = '${workItemType}'`,
  };
  const client = getClient(WorkItemTrackingRestClient);

  const { workItems } = await client.queryByWiql(wiql);

  const workItemIds = workItems.map((workItem) => {
    return workItem.id;
  });

  const workItemsDetails = await client.getWorkItems(workItemIds);
  const businessValueField = "Microsoft.VSTS.Common.BusinessValue";
  const startPeriod = new Date(
    new Date().getFullYear(),
    period === "Year" ? 0 : new Date().getMonth(),
    1
  );

  return workItemsDetails
    .filter(
      ({ fields }) =>
        fields[businessValueField] !== undefined &&
        new Date(fields["System.CreatedDate"]) >= startPeriod
    )
    .reduce((acc, { fields }) => acc + fields[businessValueField], 0);
}
