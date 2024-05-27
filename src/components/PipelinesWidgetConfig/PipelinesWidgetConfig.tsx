import * as Dashboard from "azure-devops-extension-api/Dashboard";
import React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { TextField } from "azure-devops-ui/TextField";
import { showRootComponent } from "../../Common";

interface IPipelinesWidgetConfigState {

} 

interface IPipelineWidgetSettings {
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
    return (
      <div className="content">
        <div className="config-field">
          <label className="config-field-title">Target Value</label>
          <TextField
          />
        </div>
      </div>
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

    console.log(deserialized);
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