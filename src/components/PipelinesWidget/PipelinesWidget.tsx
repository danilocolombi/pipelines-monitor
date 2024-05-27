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

interface IPipelinesWidgetState {
  title: string;
  pipelines: PipelineOverview[];
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

  private readonly numericSortProps = {
    ariaLabelAscending: "Sorted low to high",
    ariaLabelDescending: "Sorted high to low",
  };

  private readonly columns: ITableColumn<IPipelineTableItem>[] = [
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
    {
      id: "runs",
      name: "Runs",
      renderCell: renderSimpleCell,
      readonly: true,
      width: -12,
      sortProps: { ...this.numericSortProps }
    },
    {
      id: "succeeded",
      name: "Succeeded",
      renderCell: renderSimpleCell,
      readonly: true,
      width: -14,
      sortProps: { ...this.numericSortProps }
    },
    {
      id: "failed",
      name: "Failed",
      renderCell: renderSimpleCell,
      readonly: true,
      width: -12,
      sortProps: { ...this.numericSortProps }
    },
    {
      id: "skipped",
      name: "Skipped",
      renderCell: renderSimpleCell,
      readonly: true,
      width: -12,
      sortProps: { ...this.numericSortProps }
    },
    {
      id: "avgDuration",
      name: "Avg Duration",
      renderCell: renderSimpleCell,
      readonly: true,
      width: -15
    },
  ];

  private readonly sortFunctions = [
    (item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
      return item1.name.localeCompare(item2.name);
    },
    (item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
      return item1.runs - item2.runs;
    },
    (item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
      return item1.succeeded - item2.succeeded;
    },
    (item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
      return item1.failed - item2.failed;
    },
    (item1: IPipelineTableItem, item2: IPipelineTableItem): number => {
      return item2.skipped - item1.skipped;
    },
    null,
  ];

  render(): JSX.Element {

    if (!this.state) {
      return <div></div>;
    }

    const { pipelines } = this.state;
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

    const sortingBehavior = new ColumnSorting<IPipelineTableItem>(
      (columnIndex: number, proposedSortOrder: SortOrder) => {
        itemProvider.value = new ArrayItemProvider(
          sortItems(
            columnIndex,
            proposedSortOrder,
            this.sortFunctions,
            this.columns,
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
              columns={this.columns}
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
      const pipelines = await getPipelines();

      this.setState({
        title: widgetSettings.name,
        pipelines
      });
    } catch (e) {
      console.log("Error: ", e);
    }
  }
}
showRootComponent(<PipelinesWidget />);