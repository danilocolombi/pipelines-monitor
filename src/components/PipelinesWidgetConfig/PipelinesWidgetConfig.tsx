import "./PipelinesWidgetConfig.scss";
import * as Dashboard from "azure-devops-extension-api/Dashboard";
import React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { showRootComponent } from "../../Common";
import { IPipelineWidgetSettings } from "./IPipelineWidgetSettings";
import FormToggle from "../FormToggle/FormToggle";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";

interface IPipelinesWidgetConfigState {
  showProjectName: boolean;
  showAsPercentage: boolean;
  showRuns: boolean;
  showSucceeded: boolean;
  showFailed: boolean;
  showCanceled: boolean;
  showAverage: boolean;
  renderAllProjects: boolean;
}

class PipelinesWidgetConfig
  extends React.Component<{}, IPipelinesWidgetConfigState>
  implements Dashboard.IWidgetConfiguration {

  private settings: IPipelineWidgetSettings = {} as IPipelineWidgetSettings;
  private widgetConfigurationContext?: Dashboard.IWidgetConfigurationContext;
  private selection = new DropdownSelection();

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

    const { showProjectName, showAsPercentage, showRuns, showSucceeded, showFailed, showCanceled, showAverage, renderAllProjects } = this.state;

    if (renderAllProjects) {
      this.selection.select(1);
    }
    else {
      this.selection.select(0);
    }

    return (
      <div className="content">
        <div className="flex-column">
          <label className="select-label">Render Data From:</label>
          <div className="flex-column">
            <Dropdown
              ariaLabel="Basic"
              items={[
                { id: "current", text: "Current project" },
                { id: "all", text: "All Projects" }
              ]}
              onSelect={this.onSelect}
              selection={this.selection}
            />
          </div>
        </div>
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
    const value = item.id === "all";
    this.onChange("renderAllProjects", value);
  };

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
      renderAllProjects: false,
    };

    this.settings = deserialized;

    this.setState({ ...deserialized });
  }

  async onSave(): Promise<Dashboard.SaveStatus> {

    return Dashboard.WidgetConfigurationSave.Valid(
      this.serializeWidgetSettings(this.settings)
    );
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