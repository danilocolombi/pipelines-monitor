import "./PipelinesWidgetConfig.scss";
import * as Dashboard from "azure-devops-extension-api/Dashboard";
import React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { Toggle } from "azure-devops-ui/Toggle";
import { showRootComponent } from "../../Common";
import { IPipelineWidgetSettings } from "./IPipelineWidgetSettings";

interface IPipelinesWidgetConfigState {
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

    return (
      <div className="content">
        <div className="form-row">
          <div className="body-m width-75">
            Show Runs Column
          </div>
          <Toggle
            checked={this.state.showRuns}
            onChange={(_, value) => this.onChange("showRuns", value)}
            id="showRuns"
          />
        </div>
        <div className="form-row">
          <div className="body-m width-75">
            Show Succeded Column
          </div>
          <Toggle
            checked={this.state.showSucceeded}
            onChange={(_, value) => this.onChange("showSucceeded", value)}
            id="showSucceeded"
          />
        </div>
        <div className="form-row">
          <div className="body-m width-75">
            Show Failed Column
          </div>
          <Toggle
            checked={this.state.showFailed}
            onChange={(_, value) => this.onChange("showFailed", value)}
            id="showFailed"
          />
        </div>
        <div className="form-row">
          <div className="body-m width-75">
            Show Skipped Column
          </div>
          <Toggle
            checked={this.state.showSkipped}
            onChange={(_, value) => this.onChange("showSkipped", value)}
            id="showSkipped"
          />
        </div>
        <div className="form-row">
          <div className="body-m width-75">
            Show Average Duration Column
          </div>
          <Toggle
            checked={this.state.showAverage}
            onChange={(_, value) => this.onChange("showAverage", value)}
            id="showSkipped"
          />
        </div>
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
      return;
    }

    this.settings = deserialized;

    this.setState({
      showRuns: deserialized.showRuns,
      showSucceeded: deserialized.showSucceeded,
      showFailed: deserialized.showFailed,
      showAverage: deserialized.showAverage,
      showSkipped: deserialized.showSkipped,
    });
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