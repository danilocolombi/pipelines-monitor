import "./PipelinesWidget.scss";
import * as Dashboard from "azure-devops-extension-api/Dashboard";
import React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { showRootComponent } from "../../Common";
import { Card } from "azure-devops-ui/Card";
import { ColumnSorting, IColumnSortProps, ISimpleTableCell, ITableColumn, SimpleTableCell, SortOrder, Table, renderSimpleCell, sortItems } from "azure-devops-ui/Table";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";
import { Observer } from "azure-devops-ui/Observer";
import { getPipelineOverview } from "../../services/pipelines";
import { IPipelineWidgetSettings } from "../PipelinesWidgetConfig/IPipelineWidgetSettings";
import { PipelineOverview } from "../../models/pipeline-overview";

interface IPipelinesWidgetState {
  title: string;
  pipelines: PipelineOverview[];
  showProjectName: boolean;
  showAsPercentage: boolean;
  showRuns: boolean;
  showSucceeded: boolean;
  showFailed: boolean;
  showAverage: boolean;
  showCanceled: boolean;
  error: boolean;
  errorMessage: string;
  renderAllProjects: boolean;
}

export interface IPipelineTableItem extends ISimpleTableCell {
  name: string;
  projectName: string;
  runs: number;
  succeeded: number;
  failed: number;
  canceled: number;
  avgDuration: number;
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

    if (this.state.error) {
      return <div className="flex-column flex-center justify-center font-size-ll full-width">{this.state.errorMessage}</div>;
    }

    const { title, showProjectName, showAsPercentage, pipelines, showRuns, showSucceeded, showFailed, showAverage, showCanceled } = this.state;
    const tableItems = pipelines.map(({ name, projectName, stats: { runs, succeeded, failed, canceled, avgDuration } }) => {
      return {
        name,
        projectName,
        runs,
        succeeded,
        failed,
        canceled,
        avgDuration,
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
      const value = Number(tableItem[tableColumn.id]);

      if (Number.isNaN(value)) {
        return <div></div>;
      }

      return renderCell(columnIndex, tableColumn, showAsPercentage ? `${value}%` : `${value}`);
    }

    const humanizeDuration = (duration: number): string => {
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
      return renderCell(columnIndex, tableColumn, humanizeDuration(tableItemValue));
    }

    const renderCell = (
      columnIndex: number,
      tableColumn: ITableColumn<IPipelineTableItem>,
      content: string
    ): JSX.Element => {
      return (
        <SimpleTableCell
          columnIndex={columnIndex}
          tableColumn={tableColumn}
          key={"col-" + columnIndex}
        >
          <div>{content}</div>
        </SimpleTableCell>
      );
    }

    const numericSortProps = {
      ariaLabelAscending: "Sorted low to high",
      ariaLabelDescending: "Sorted high to low",
    };

    const addPipelineTableColumn = <T extends keyof IPipelineTableItem>(
      property: T,
      name: string,
      width: number = -12,
      renderCell: (rowIndex: number, columnIndex: number, tableColumn: ITableColumn<IPipelineTableItem>, tableItem: IPipelineTableItem) => JSX.Element = renderNumericColumn,
      sortProps: IColumnSortProps = numericSortProps,
    ): ITableColumn<IPipelineTableItem> => {
      return {
        id: property.toString(),
        name: name,
        width: width,
        renderCell: renderCell,
        sortProps: { ...sortProps }
      };
    }

    let columns: ITableColumn<IPipelineTableItem>[] = [
      addPipelineTableColumn("name", "Name", -35, renderSimpleCell, { ariaLabelAscending: "Sorted A to Z", ariaLabelDescending: "Sorted Z to A", }),
    ];

    let sortFunctions = [
      (item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.name.localeCompare(item2.name),
    ];

    if (showProjectName) {
      columns.push(addPipelineTableColumn("projectName", "Project", -25, renderSimpleCell, { ariaLabelAscending: "Sorted A to Z", ariaLabelDescending: "Sorted Z to A", }));
      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.projectName.localeCompare(item2.projectName));
    }

    if (showRuns) {
      columns.push(addPipelineTableColumn("runs", "Runs", -10, renderSimpleCell));
      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.runs - item2.runs);
    }

    if (showSucceeded) {
      columns.push(addPipelineTableColumn("succeeded", "Succeeded", -14));
      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.succeeded - item2.succeeded);
    }

    if (showFailed) {
      columns.push(addPipelineTableColumn("failed", "Failed"));
      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.failed - item2.failed);
    }

    if (showCanceled) {
      columns.push(addPipelineTableColumn("canceled", "Canceled"));
      sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.canceled - item2.canceled);
    }

    if (showAverage) {
      columns.push(addPipelineTableColumn("avgDuration", "Avg Duration", -15, renderAverageColumn));
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
              scrollable={true}
              role="table"
              pageSize={100}
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

      const pipelines = await getPipelineOverview(deserialized?.renderAllProjects ?? false, deserialized?.showAsPercentage ?? false);

      if (pipelines == null || pipelines.length === 0) {
        this.setState({
          title: "Pipelines Monitor",
          error: true,
          errorMessage: "No pipelines found"
        })
        return;
      }

      if (!deserialized) {
        this.setState({
          title: "Pipelines Monitor",
          pipelines: pipelines,
          showProjectName: false,
          showAsPercentage: false,
          showRuns: true,
          showSucceeded: true,
          showFailed: true,
          showCanceled: true,
          showAverage: true,
          renderAllProjects: false,
        })
        return;
      }

      this.setState({ title: widgetSettings.name, pipelines, ...deserialized });

    } catch (e) {
      this.setState({
        title: "Pipelines Monitor",
        error: true,
        errorMessage: "No pipelines found"
      })
    }
  }

}
showRootComponent(<PipelinesWidget />);