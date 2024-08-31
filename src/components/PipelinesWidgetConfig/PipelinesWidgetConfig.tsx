import "./PipelinesWidgetConfig.scss";
import * as Dashboard from "azure-devops-extension-api/Dashboard";
import React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { showRootComponent } from "../../Common";
import { IPipelineWidgetSettings } from "./IPipelineWidgetSettings";
import FormToggle from "../FormToggle/FormToggle";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { DropdownMultiSelection, DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { getAllProjects } from "../../services/projects";
import { Observer } from "azure-devops-ui/Observer";
import { Icon } from "azure-devops-ui/Icon";

interface IPipelinesWidgetConfigState {
  showProjectName: boolean;
  showAsPercentage: boolean;
  showRuns: boolean;
  showSucceeded: boolean;
  showFailed: boolean;
  showCanceled: boolean;
  showAverage: boolean;
  projects: string[];
  selectedProjects: string[];
  allProjects: string[];
  projectErrorMessage: string;
  renderMultipleProjects: boolean;
}

const MinProjects = 1;
const MaxProjects = 10;

class PipelinesWidgetConfig
  extends React.Component<{}, IPipelinesWidgetConfigState>
  implements Dashboard.IWidgetConfiguration {

  private settings: IPipelineWidgetSettings = {} as IPipelineWidgetSettings;
  private widgetConfigurationContext?: Dashboard.IWidgetConfigurationContext;
  private scopeSelection = new DropdownSelection();
  private multiprojectsSelection = new DropdownMultiSelection();

  componentDidMount() {
    SDK.init().then(() => {
      SDK.register("pipelines-widget.config", this);
      SDK.resize(400, 500);
    });
  }

  render(): JSX.Element {

    if (!this.state) {
      return <div></div>;
    }

    const { showProjectName, showAsPercentage, showRuns, showSucceeded, showFailed, showCanceled, showAverage, allProjects, selectedProjects, renderMultipleProjects } = this.state;

    let projectItems: IListBoxItem<{}>[] = [];

    if (renderMultipleProjects) {
      this.scopeSelection.select(1);
      projectItems = allProjects.map((project, index) => {
        if (selectedProjects?.some((selectedProject) => selectedProject === project)) {
          this.multiprojectsSelection.select(index);
        }
        return {
          id: project,
          text: project,
        };
      });
    }
    else {
      this.scopeSelection.select(0);
    }

    return (
      <div className="content">
        <div className="flex-column">
          <label className="select-label">Scope</label>
          <div className="flex-column">
            <Dropdown
              ariaLabel="Basic"
              items={[
                { id: "current", text: "Current project" },
                { id: "multiple", text: "Multiple projects" },
              ]}
              onSelect={this.onSelect}
              selection={this.scopeSelection}
            />
          </div>
        </div>
        {this.state.renderMultipleProjects && (
          <div className="flex-column">
            <label className="select-label">Projects</label>
            <div className="flex-column">
              <Observer selection={this.onSelectMultiple}>
                {() => {
                  return (
                    <Dropdown
                      ariaLabel="Multiselect"
                      actions={[
                        {
                          className: "bolt-dropdown-action-right-button",
                          disabled: this.multiprojectsSelection.selectedCount === 0,
                          iconProps: { iconName: "Clear" },
                          text: "Clear",
                          onClick: () => {
                            this.clearProjectsSelection();
                          }
                        },
                      ]}
                      items={projectItems}
                      selection={this.multiprojectsSelection}
                      placeholder="Select projects"
                      showFilterBox={true}
                      onSelect={this.onSelectMultiple}
                    />
                  );
                }}
              </Observer>
            </div>
            <div className="flex-column">
              {this.state.projectErrorMessage && (
                <div className="error-message">
                  <Icon className="error-icon" iconName="Error" />
                  {this.state.projectErrorMessage}
                </div>
              )}
            </div>
          </div>
        )}

        <FormToggle
          label="Show Project Name"
          checked={showProjectName}
          onChange={(value) => this.onChange("showProjectName", value)}
          id="showProjectName"
        />
        <FormToggle
          label="Show Numbers as Percentage"
          checked={showAsPercentage}
          onChange={(value) => this.onChange("showAsPercentage", value)}
          id="showAsPercentage"
        />
        <FormToggle
          label="Show Runs Column"
          checked={showRuns}
          onChange={(value) => this.onChange("showRuns", value)}
          id="showRuns"
        />
        <FormToggle
          label="Show Succeded Column"
          checked={showSucceeded}
          onChange={(value) => this.onChange("showSucceeded", value)}
          id="showSucceeded"
        />
        <FormToggle
          label="Show Failed Column"
          checked={showFailed}
          onChange={(value) => this.onChange("showFailed", value)}
          id="showFailed"
        />
        <FormToggle
          label="Show Canceled Column"
          checked={showCanceled}
          onChange={(value) => this.onChange("showCanceled", value)}
          id="showCanceled"
        />
        <FormToggle
          label="Show Average Duration Column"
          checked={showAverage}
          onChange={(value) => this.onChange("showAverage", value)}
          id="showAverage" />
      </div>
    );
  }

  private onSelect = (event: React.SyntheticEvent<HTMLElement>, item: IListBoxItem<{}>) => {
    const value = item.id === "multiple";

    if (!value) {
      this.multiprojectsSelection.clear();
      const partialState = { renderMultipleProjects: false, selectedProjects: [] };
      this.updateSettingsAndNotify(partialState);
      this.setState({ ...this.state, ...partialState });
    }
    else {
      const partialState = { renderMultipleProjects: true };
      this.updateSettingsAndNotify(partialState);
      this.setState({ ...this.state, ...partialState });
    }
  };

  private clearProjectsSelection = () => {
    this.multiprojectsSelection.clear();
    const partialState = { selectedProjects: [] };
    this.updateSettingsAndNotify(partialState);
    this.setState({ ...this.state, ...partialState });
  };

  private onSelectMultiple = (event: React.SyntheticEvent<HTMLElement>, item: IListBoxItem<{}>) => {
    const { selectedProjects } = this.state;

    if (selectedProjects === undefined) {
      this.updateSelectedProjects([item.id]);
      return;
    }

    if (selectedProjects.some((project => project === item.id))) {
      this.updateSelectedProjects(selectedProjects.filter((project) => project !== item.id));
    }
    else {
      this.updateSelectedProjects([...selectedProjects, item.id]);
    }
  };

  private updateSelectedProjects(selectedProjects: string[]) {
    this.updateSettingsAndNotify({ selectedProjects });
    this.setState({ ...this.state, selectedProjects });
  }

  private onChange(key: keyof IPipelineWidgetSettings, value: boolean) {
    this.updateSettingsAndNotify({ [key]: value });
    this.setState({ ...this.state, [key]: value });
  }

  private async updateSettingsAndNotify(
    partialSettings: Partial<IPipelineWidgetSettings>
  ) {
    this.settings = { ...this.settings, ...partialSettings };
    const customSettings = this.serializeWidgetSettings(this.settings);
    await this.widgetConfigurationContext?.notify(
      Dashboard.ConfigurationEvent.ConfigurationChange,
      Dashboard.ConfigurationEvent.Args(customSettings)
    );
  }

  async load(
    widgetSettings: Dashboard.WidgetSettings,
    widgetConfigurationContext: Dashboard.IWidgetConfigurationContext
  ): Promise<Dashboard.WidgetStatus> {
    this.widgetConfigurationContext = widgetConfigurationContext;

    await this.setStateFromWidgetSettings(widgetSettings);
    return Dashboard.WidgetStatusHelper.Success();
  }

  private async setStateFromWidgetSettings(
    widgetSettings: Dashboard.WidgetSettings
  ) {

    const deserialized: IPipelineWidgetSettings = JSON.parse(widgetSettings.customSettings.data) ??
    {
      showProjectName: false,
      showAsPercentage: false,
      showRuns: true,
      showSucceeded: true,
      showFailed: true,
      showAverage: true,
      showCanceled: true,
      renderMultipleProjects: false,
    };

    const allProjects = await getAllProjects();

    this.settings = deserialized;

    this.setState({ ...deserialized, allProjects: allProjects.sort((a, b) => a.localeCompare(b)) });
  }

  async onSave(): Promise<Dashboard.SaveStatus> {
    if (!(await this.validateSettings())) {
      return Dashboard.WidgetConfigurationSave.Invalid();
    }
    return Dashboard.WidgetConfigurationSave.Valid(
      this.serializeWidgetSettings(this.settings)
    );
  }

  private async validateSettings(): Promise<boolean> {
    const { renderMultipleProjects, selectedProjects } = this.settings;

    if (!renderMultipleProjects) {
      return true;
    }

    if (selectedProjects.length > MaxProjects || selectedProjects.length < MinProjects) {
      this.setState({
        projectErrorMessage: `You can only select between ${MinProjects} and ${MaxProjects} projects`,
      });
      return false;
    }

    return true;
  }

  private serializeWidgetSettings(
    settings: IPipelineWidgetSettings
  ): Dashboard.CustomSettings {
    return {
      data: JSON.stringify(settings),
      version: { major: 1, minor: 0, patch: 0 },
    };
  }

}
showRootComponent(<PipelinesWidgetConfig />);