import "./PipelinesWidgetConfig.scss";
import * as Dashboard from "azure-devops-extension-api/Dashboard";
import React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { showRootComponent } from "../../Common";
import { IPipelineWidgetSettings } from "./IPipelineWidgetSettings";
import FormToggle from "../FormToggle/FormToggle";

interface IPipelinesWidgetConfigState {
  showAsPercentage: boolean;
  showRuns: boolean;
  showSucceeded: boolean;
  showFailed: boolean;
  showSkipped: boolean;
  showAverage: boolean;
}

class PipelinesWidgetConfig
  extends React.Component<{}, IPipelinesWidgetConfigState>
  implements Dashboard.IWidgetConfiguration {

  private settings: IPipelineWidgetSettings = {} as IPipelineWidgetSettings;
  private widgetConfigurationContext?: Dashboard.IWidgetConfigurationContext;

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

    const { showAsPercentage, showRuns, showSucceeded, showFailed, showSkipped, showAverage } = this.state;

    return (
      <div className="content">
        <FormToggle
          label="Show as Percentage"
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
          label="Show Skipped Column"
          checked={showSkipped}
          onChange={(value) => this.onChange("showSkipped", value)}
          id="showSkipped"
        />
        <FormToggle
          label="Show Average Duration Column"
          checked={showAverage}
          onChange={(value) => this.onChange("showAverage", value)}
          id="showAverage" />
      </div>
    );
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
    const deserialized: IPipelineWidgetSettings | null = JSON.parse(
      widgetSettings.customSettings.data
    );

    if (!deserialized) {
      this.setState({
        showAsPercentage: false,
        showRuns: true,
        showSucceeded: true,
        showFailed: true,
        showAverage: true,
        showSkipped: true,
      });
      return;
    }

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