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
import { Link } from "azure-devops-ui/Link";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { Filter, FILTER_CHANGE_EVENT, IFilterState } from "azure-devops-ui/Utilities/Filter";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";


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
  renderMultipleProjects: boolean;
  selectedProjects: string[];
}

export interface IPipelineTableItem extends ISimpleTableCell {
  name: string;
  url: string;
  projectName: string;
  runs: number;
  succeeded: number;
  failed: number;
  canceled: number;
  avgDuration: number;
}

interface FilterValue extends IFilterState {
  searchTerm: {
    value: string;
  };
}

class PipelinesWidget
  extends React.Component<{}, IPipelinesWidgetState>
  implements Dashboard.IConfigurableWidget {
  private filter: Filter;
  private allTableItems: IPipelineTableItem[] = [];
  private filteredTableItems: IPipelineTableItem[] = [];
  private itemProvider = new ObservableValue<ArrayItemProvider<IPipelineTableItem>>(
    new ArrayItemProvider([])
  );
  private columns: ITableColumn<IPipelineTableItem>[] = [];
  private sortFunctions: ((item1: IPipelineTableItem, item2: IPipelineTableItem) => number)[] = [];
  private sortingBehavior = this.updateSortingBehavior();

  constructor(props: {}) {
    super(props);

    this.filter = new Filter();
    this.filter.subscribe(() => {
      this.applyFilter();
    }, FILTER_CHANGE_EVENT);
  }

  componentDidMount(): void {
    SDK.init().then(() => {
      SDK.register("pipelines-widget", this);
    });
  }

  applyFilter() {
    const filterValue = this.filter.getState() as FilterValue;
    if (filterValue?.searchTerm === undefined) {
      this.filteredTableItems = this.allTableItems;
    }
    else {
      this.filteredTableItems = this.allTableItems.filter(item => item.name.toLowerCase().includes(filterValue.searchTerm.value.toLowerCase()));
    }

    this.itemProvider.value = new ArrayItemProvider(this.filteredTableItems);
    this.sortingBehavior = this.updateSortingBehavior();
  }

  updateSortingBehavior(): ColumnSorting<IPipelineTableItem> {
    return new ColumnSorting<IPipelineTableItem>(
      (columnIndex: number, proposedSortOrder: SortOrder) => {
        this.itemProvider.value = new ArrayItemProvider(
          sortItems(
            columnIndex,
            proposedSortOrder,
            this.sortFunctions,
            this.columns,
            this.filteredTableItems
          )
        );
      }
    );
  }

  render(): JSX.Element {


    if (!this.state) {
      return <div></div>;
    }

    if (this.state.error) {
      return <div className="flex-column flex-center justify-center font-size-ll full-width">{this.state.errorMessage}</div>;
    }

    const { title, showProjectName, showAsPercentage, pipelines, showRuns, showSucceeded, showFailed, showAverage, showCanceled } = this.state;

    this.allTableItems = pipelines.map(({ pipeline: { name, url }, projectName, stats: { runs, succeeded, failed, canceled, avgDuration } }) => {
      return {
        name,
        url,
        projectName,
        runs,
        succeeded,
        failed,
        canceled,
        avgDuration,
      }
    });

    this.filteredTableItems = this.allTableItems;

    this.itemProvider = new ObservableValue<ArrayItemProvider<IPipelineTableItem>>(
      new ArrayItemProvider(this.filteredTableItems)
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

    function renderPipelineNameCell(
      rowIndex: number,
      columnIndex: number,
      tableColumn: ITableColumn<IPipelineTableItem>,
      tableItem: IPipelineTableItem
    ): JSX.Element {
      const item = tableItem;
      return (
        <SimpleTableCell
          columnIndex={columnIndex}
          tableColumn={tableColumn}
          key={"col-" + columnIndex}
        >
          <span className="flex-row wrap-text">
            <Link
              className="bolt-table-link bolt-link no-underline-link text-ellipsis small-margin bolt-link"
              href={item.url}
              target="_blank"
            >
              {item.name}
            </Link>
          </span>
        </SimpleTableCell>
      );
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

    this.columns = [];
    this.sortFunctions = [];

    this.columns.push(addPipelineTableColumn("name", "Name", -35, renderPipelineNameCell, { ariaLabelAscending: "Sorted A to Z", ariaLabelDescending: "Sorted Z to A", }));
    this.sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.name.localeCompare(item2.name));

    if (showProjectName) {
      this.columns.push(addPipelineTableColumn("projectName", "Project", -25, renderSimpleCell, { ariaLabelAscending: "Sorted A to Z", ariaLabelDescending: "Sorted Z to A", }));
      this.sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.projectName.localeCompare(item2.projectName));
    }

    if (showRuns) {
      this.columns.push(addPipelineTableColumn("runs", "Runs", -10, renderSimpleCell));
      this.sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.runs - item2.runs);
    }

    if (showSucceeded) {
      this.columns.push(addPipelineTableColumn("succeeded", "Succeeded", -14));
      this.sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.succeeded - item2.succeeded);
    }

    if (showFailed) {
      this.columns.push(addPipelineTableColumn("failed", "Failed"));
      this.sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.failed - item2.failed);
    }

    if (showCanceled) {
      this.columns.push(addPipelineTableColumn("canceled", "Canceled"));
      this.sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.canceled - item2.canceled);
    }

    if (showAverage) {
      this.columns.push(addPipelineTableColumn("avgDuration", "Avg Duration", -15, renderAverageColumn));
      this.sortFunctions.push((item1: IPipelineTableItem, item2: IPipelineTableItem): number => item1.avgDuration - item2.avgDuration);
    }

    const renderedTitle = `${title} (${pipelines.length ?? 0})`;

    return (
      <Card className="flex-grow bolt-table-card" titleProps={{ text: renderedTitle, ariaLevel: 3 }}>
        <div className="flex-grow">
          <div className="flex-grow">
            <FilterBar filter={this.filter}>
              <KeywordFilterBarItem filterItemKey="searchTerm" placeholder="Filter by pipeline name" />
            </FilterBar>
          </div>
          <div className="flex-grow">

            <Observer itemProvider={this.itemProvider}>
              {(observableProps: { itemProvider: ArrayItemProvider<IPipelineTableItem> }) => (
                <Table<IPipelineTableItem>
                  ariaLabel="Pipelines Table"
                  columns={this.columns}
                  behaviors={[this.sortingBehavior]}
                  itemProvider={observableProps.itemProvider}
                  scrollable={true}
                  role="table"
                  pageSize={100}
                  containerClassName="h-scroll-auto"
                />
              )}
            </Observer>
          </div>
        </div>
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
      const deserialized: IPipelineWidgetSettings = JSON.parse(
        widgetSettings.customSettings.data
      ) ?? this.getDefaultSettings();

      const pipelines = await getPipelineOverview(deserialized.selectedProjects, deserialized.showAsPercentage, deserialized.renderMultipleProjects);

      this.setState({ ...deserialized, title: widgetSettings.name, pipelines });

    } catch (e) {
      this.setErrorState("Error loading pipelines");
    }
  }

  private setErrorState(errorMessage: string) {
    this.setState({
      title: "Pipelines Monitor",
      error: true,
      errorMessage: errorMessage
    })
  }

  private getDefaultSettings(): IPipelineWidgetSettings {
    return {
      showProjectName: false,
      showAsPercentage: false,
      showRuns: true,
      showSucceeded: true,
      showFailed: true,
      showCanceled: true,
      showAverage: true,
      renderMultipleProjects: false,
      selectedProjects: [],
    };
  }

}
showRootComponent(<PipelinesWidget />);