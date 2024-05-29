import "./PipelinesWidget.scss";
import * as Dashboard from "azure-devops-extension-api/Dashboard";
import React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { showRootComponent } from "../../Common";
import { Card } from "azure-devops-ui/Card";
import { ColumnSorting, ISimpleTableCell, ITableColumn, SortOrder, Table, renderSimpleCell, sortItems } from "azure-devops-ui/Table";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";
import { Observer } from "azure-devops-ui/Observer";
import { PipelineOverview, getPipelines } from "../../services/pipelines";
import { IPipelineWidgetSettings } from "../PipelinesWidgetConfig/IPipelineWidgetSettings";

interface IPipelinesWidgetState {
  title: string;
  pipelines: PipelineOverview[];
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
  avgDuration: string;
}

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

    const { pipelines, showRuns, showSucceeded, showFailed, showAverage, showSkipped } = this.state;
    const tableItems = pipelines.map(({ name, stats }) => {
      return {
        runs: stats.runs,
        name: name,
        succeeded: stats.succeeded,
        failed: stats.failed,
        skipped: stats.skipped,
        avgDuration: this.humanizeDuration(stats.avgDuration),
      }
    });

    const itemProvider = new ObservableValue<ArrayItemProvider<IPipelineTableItem>>(
      new ArrayItemProvider(tableItems)
    );

    const numericSortProps = {
      ariaLabelAscending: "Sorted low to high",
      ariaLabelDescending: "Sorted high to low",
    };

    let columns: ITableColumn<IPipelineTableItem>[] = [
      {
        id: "name",
        name: "Name",
        renderCell: renderSimpleCell,
        readonly: true,
        width: -35,
        sortProps: {
          ariaLabelAscending: "Sorted A to Z",
          ariaLabelDescending: "Sorted Z to A",
        },
      },
    ];

    let sortFunctions = [
      (item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
        return item1.name.localeCompare(item2.name);
      }
    ];

    if (showRuns) {
      columns.push({
        id: "runs",
        name: "Runs",
        renderCell: renderSimpleCell,
        readonly: true,
        width: -12,
        sortProps: { ...numericSortProps }
      });

      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
        return item1.runs - item2.runs;
      });
    }

    if (showSucceeded) {
      columns.push({
        id: "succeeded",
        name: "Succeeded",
        renderCell: renderSimpleCell,
        readonly: true,
        width: -14,
        sortProps: { ...numericSortProps }
      });

      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
        return item2.succeeded - item1.succeeded;
      });
    }

    if (showFailed) {
      columns.push({
        id: "failed",
        name: "Failed",
        renderCell: renderSimpleCell,
        readonly: true,
        width: -12,
        sortProps: { ...numericSortProps }
      });

      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
        return item2.failed - item1.failed;
      });
    }

    if (showSkipped) {
      columns.push({
        id: "skipped",
        name: "Skipped",
        renderCell: renderSimpleCell,
        readonly: true,
        width: -12,
        sortProps: { ...numericSortProps }
      });

      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
        return item2.skipped - item1.skipped;
      });
    }

    if (showAverage) {
      columns.push({
        id: "avgDuration",
        name: "Avg Duration",
        renderCell: renderSimpleCell,
        readonly: true,
        width: -15
      });
      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
        return item1.name.localeCompare(item2.name);
      });
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

    return (
      <Card className="flex-grow bolt-table-card" titleProps={{ text: this.state.title, ariaLevel: 3 }}>
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

  humanizeDuration(duration: number): string {
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

      if (!deserialized) {
        return;
      }

      const pipelines = await getPipelines();

      this.setState({
        title: widgetSettings.name,
        pipelines,
        showRuns: deserialized.showRuns,
        showSucceeded: deserialized.showSucceeded,
        showFailed: deserialized.showFailed,
        showSkipped: deserialized.showSkipped,
        showAverage: deserialized.showAverage,
      });
    } catch (e) {
      console.log("Error: ", e);
    }
  }
}
showRootComponent(<PipelinesWidget />);