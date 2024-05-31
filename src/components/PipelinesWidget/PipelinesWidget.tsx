import "./PipelinesWidget.scss";
import * as Dashboard from "azure-devops-extension-api/Dashboard";
import React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { showRootComponent } from "../../Common";
import { Card } from "azure-devops-ui/Card";
import { ColumnSorting, ISimpleTableCell, ITableColumn, SimpleTableCell, SortOrder, Table, renderSimpleCell, sortItems } from "azure-devops-ui/Table";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";
import { Observer } from "azure-devops-ui/Observer";
import { PipelineOverview, getPipelines } from "../../services/pipelines";
import { IPipelineWidgetSettings } from "../PipelinesWidgetConfig/IPipelineWidgetSettings";

interface IPipelinesWidgetState {
  title: string;
  pipelines: PipelineOverview[];
  showAsPercentage: boolean;
  showRuns: boolean;
  showSucceeded: boolean;
  showFailed: boolean;
  showAverage: boolean;
  showSkipped: boolean;
}

export interface IPipelineTableItem extends ISimpleTableCell {
  name: string;
  runs: number;
  succeeded: number;
  failed: number;
  skipped: number;
  avgDuration: number;
}

const numericSortProps = {
  ariaLabelAscending: "Sorted low to high",
  ariaLabelDescending: "Sorted high to low",
};

class PipelinesWidget
  extends React.Component<{}, IPipelinesWidgetState>
  implements Dashboard.IConfigurableWidget {

  componentDidMount(): void {
    SDK.init().then(() => {
      SDK.register("pipelines-widget", this);
    });
  }

  render(): JSX.Element {

    if (!this.state) {
      return <div></div>;
    }

    const { title, showAsPercentage, pipelines, showRuns, showSucceeded, showFailed, showAverage, showSkipped } = this.state;
    const tableItems = pipelines.map(({ name, stats: { runs, succeeded, failed, skipped, avgDuration } }) => {
      return {
        name: name,
        runs,
        succeeded,
        failed,
        skipped,
        avgDuration: avgDuration,
      }
    });

    const itemProvider = new ObservableValue<ArrayItemProvider<IPipelineTableItem>>(
      new ArrayItemProvider(tableItems)
    );

    const renderNumericColumn = (
      rowIndex: number,
      columnIndex: number,
      tableColumn: ITableColumn<IPipelineTableItem>,
      tableItem: IPipelineTableItem,
    ): JSX.Element => {
      const tableItemValue = Number(tableItem[tableColumn.id]);

      if (Number.isNaN(tableItemValue)) {
        return (
          <div>0</div>
        );
      }
      return (
        <SimpleTableCell
          columnIndex={columnIndex}
          tableColumn={tableColumn}
          key={"col-" + columnIndex}
        >
          <div>{showAsPercentage ? `${tableItemValue}%` : `${tableItemValue}`}</div>
        </SimpleTableCell>
      );
    }

    const humanizeDuration = (duration: number): string => {
      if (Number.isNaN(duration)) {
        return "N/A";
      }

      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);

      if (minutes === 0) {
        return `${seconds}s`;
      }
      else if (seconds === 0) {
        return `${minutes}m`;
      }
      else {
        return `${minutes}m ${seconds}s`;
      }
    }

    const renderAverageColumn = (
      rowIndex: number,
      columnIndex: number,
      tableColumn: ITableColumn<IPipelineTableItem>,
      tableItem: IPipelineTableItem,
    ): JSX.Element => {
      const tableItemValue = Number(tableItem[tableColumn.id]);
      const duration = humanizeDuration(tableItemValue);
      return (
        <SimpleTableCell
          columnIndex={columnIndex}
          tableColumn={tableColumn}
          key={"col-" + columnIndex}
        >
          <div>{duration}</div>
        </SimpleTableCell>
      );
    }

    let columns: ITableColumn<IPipelineTableItem>[] = [
      {
        id: "name",
        name: "Name",
        renderCell: renderSimpleCell,
        width: -35,
        sortProps: {
          ariaLabelAscending: "Sorted A to Z",
          ariaLabelDescending: "Sorted Z to A",
        },
      },
    ];

    let sortFunctions = [
      (item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.name.localeCompare(item2.name)
    ];

    if (showRuns) {
      columns.push({
        id: "runs",
        name: "Runs",
        renderCell: renderSimpleCell,
        width: -12,
        sortProps: { ...numericSortProps }
      });

      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.runs - item2.runs);
    }

    if (showSucceeded) {
      columns.push({
        id: "succeeded",
        name: "Succeeded",
        renderCell: renderNumericColumn,
        width: -14,
        sortProps: { ...numericSortProps }
      });

      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.succeeded - item2.succeeded);
    }

    if (showFailed) {
      columns.push({
        id: "failed",
        name: "Failed",
        renderCell: renderNumericColumn,
        width: -12,
        sortProps: { ...numericSortProps }
      });

      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.failed - item2.failed);
    }

    if (showSkipped) {
      columns.push({
        id: "skipped",
        name: "Skipped",
        renderCell: renderNumericColumn,
        width: -12,
        sortProps: { ...numericSortProps }
      });

      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.skipped - item2.skipped);
    }

    if (showAverage) {
      columns.push({
        id: "avgDuration",
        name: "Avg Duration",
        renderCell: renderAverageColumn,
        width: -15,
        sortProps: { ...numericSortProps }
      });

      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.avgDuration - item2.avgDuration);
    }

    const sortingBehavior = new ColumnSorting<IPipelineTableItem>(
      (columnIndex: number, proposedSortOrder: SortOrder) => {
        itemProvider.value = new ArrayItemProvider(
          sortItems(
            columnIndex,
            proposedSortOrder,
            sortFunctions,
            columns,
            tableItems
          )
        );
      }
    );

    const renderedTitle = `${title} (${pipelines.length ?? 0})`;

    return (
      <Card className="flex-grow bolt-table-card" titleProps={{ text: renderedTitle, ariaLevel: 3 }}>
        <Observer itemProvider={itemProvider}>
          {(observableProps: { itemProvider: ArrayItemProvider<IPipelineTableItem> }) => (
            <Table<IPipelineTableItem>
              ariaLabel="Pipelines Table"
              columns={columns}
              behaviors={[sortingBehavior]}
              itemProvider={observableProps.itemProvider}
              role="table"
              containerClassName="h-scroll-auto"
            />
          )}
        </Observer>
      </Card>
    );
  }

  async preload(_widgetSettings: Dashboard.WidgetSettings): Promise<Dashboard.WidgetStatus> {
    return Dashboard.WidgetStatusHelper.Success();
  }

  async load(
    widgetSettings: Dashboard.WidgetSettings
  ): Promise<Dashboard.WidgetStatus> {
    try {
      await this.setStateFromWidgetSettings(widgetSettings);
      return Dashboard.WidgetStatusHelper.Success();
    } catch (e) {
      return Dashboard.WidgetStatusHelper.Failure((e as any).toString());
    }
  }

  async reload(
    widgetSettings: Dashboard.WidgetSettings
  ): Promise<Dashboard.WidgetStatus> {
    try {
      await this.setStateFromWidgetSettings(widgetSettings);
      return Dashboard.WidgetStatusHelper.Success();
    } catch (e) {
      return Dashboard.WidgetStatusHelper.Failure((e as any).toString());
    }
  }

  private async setStateFromWidgetSettings(
    widgetSettings: Dashboard.WidgetSettings
  ) {
    try {
      const deserialized: IPipelineWidgetSettings | null = JSON.parse(
        widgetSettings.customSettings.data
      );

      const pipelines = await getPipelines(deserialized?.showAsPercentage ?? false);

      if (!deserialized) {
        this.setState({
          title: "Pipelines Overview",
          pipelines: pipelines,
          showAsPercentage: false,
          showRuns: true,
          showSucceeded: true,
          showFailed: true,
          showSkipped: true,
          showAverage: true,
        })
        return;
      }

      this.setState({ title: widgetSettings.name, pipelines, ...deserialized });

    } catch (e) {
      console.log("Error: ", e);
    }
  }

  private humanizeDuration = (duration: number): string => {
    if (Number.isNaN(duration)) {
      return "N/A";
    }

    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    if (minutes === 0) {
      return `${seconds}s`;
    }
    else if (seconds === 0) {
      return `${minutes}m`;
    }
    else {
      return `${minutes}m ${seconds}s`;
    }
  }

}
showRootComponent(<PipelinesWidget />);