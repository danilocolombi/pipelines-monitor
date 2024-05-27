import "./BusinessValueWidgetConfig.scss";
import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import * as Dashboard from "azure-devops-extension-api/Dashboard";
import { TextField } from "azure-devops-ui/TextField";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { showRootComponent } from "../../Common";

interface IBusinessValueWidgetConfigState {
  targetValue?: string;
  currency: string;
  workItemType: string;
  period: string;
}

class BusinessValueWidgetConfig
  extends React.Component<{}, IBusinessValueWidgetConfigState>
  implements Dashboard.IWidgetConfiguration {
  private widgetConfigurationContext?: Dashboard.IWidgetConfigurationContext;
  private settings: IBusinessValueWidgetSettings = {} as IBusinessValueWidgetSettings;
  private currencySelection = new DropdownSelection();
  private currencies: IListBoxItem<{}>[] = [
    { id: "USD", text: "USD", },
    { id: "BRL", text: "BRL" },
    { id: "EUR", text: "EUR" },
    { id: "GBP", text: "GBP" },
    { id: "CAD", text: "CAD" },
    { id: "AUD", text: "AUD" },
    { id: "JPY", text: "JPY" },
    { id: "CNY", text: "CNY" },
    { id: "INR", text: "INR" },
    { id: "MXN", text: "MXN" },
    { id: "NZD", text: "NZD" },
    { id: "SGD", text: "SGD" },
    { id: "ZAR", text: "ZAR" },
    { id: "EUR", text: "Euro" },
  ];
  private workItemTypeSelection = new DropdownSelection();
  private workItemTypes: IListBoxItem<{}>[] = [
    { id: "Epic", text: "Epic", },
    { id: "Feature", text: "Feature" },
  ];
  private periodSelection = new DropdownSelection();
  private periods: IListBoxItem<{}>[] = [
    { id: "Year", text: "Year", },
    { id: "Month", text: "Month" },
  ];

  componentDidMount() {
    SDK.init().then(() => {
      SDK.register("business-value-widget.config", this);
      SDK.resize(400, 500);
    });
  }

  render(): JSX.Element {

    if (!this.state) {
      return <div></div>;
    }

    const { currency, workItemType, period } = this.state;

    this.currencySelection.select(this.findIndexById(this.currencies, currency));
    this.workItemTypeSelection.select(this.findIndexById(this.workItemTypes, workItemType));
    this.periodSelection.select(this.findIndexById(this.periods, period));

    return (
      <div className="content">
        <div className="config-field">
          <label className="config-field-title">Work Item Type</label>
          <div style={{ width: "100%" }}>
            <Dropdown
              selection={this.workItemTypeSelection}
              ariaLabel="Work Item Type"
              placeholder="Select work item type"
              items={this.workItemTypes}
              onSelect={this.onSelectWorkItemType}
            />
          </div>
        </div>
        <div className="config-field">
          <label className="config-field-title">Period</label>
          <div style={{ width: "100%" }}>
            <Dropdown
              selection={this.periodSelection}
              ariaLabel="Period"
              placeholder="Select period"
              items={this.periods}
              onSelect={this.onSelectPeriod}
            />
          </div>
        </div>
        <div className="config-field">
          <label className="config-field-title">Currency</label>
          <div style={{ width: "100%" }}>
            <Dropdown
              selection={this.currencySelection}
              ariaLabel="Currency"
              placeholder="Select currency"
              items={this.currencies}
              onSelect={this.onSelectCurrency}
            />
          </div>
        </div>
        <div className="config-field">
          <label className="config-field-title">Target Value</label>
          <TextField
            inputType={"number"}
            value={this.state.targetValue}
            onChange={(_e, newValue) => {
              this.updateSettingsAndNotify({ targetValue: +newValue });
              this.setState({ targetValue: newValue });
            }}
          />
        </div>
      </div>
    );
  }

  private findIndexById(items: IListBoxItem[], id: string): number {
    return items.findIndex(item => item.id === id);
  }

  private onSelectWorkItemType = (event: React.SyntheticEvent<HTMLElement>, item: IListBoxItem<{}>) => {
    this.updateSettingsAndNotify({ workItemType: item.id });
    this.setState({ workItemType: item.id });
  };

  private onSelectCurrency = (event: React.SyntheticEvent<HTMLElement>, item: IListBoxItem<{}>) => {
    this.updateSettingsAndNotify({ currency: item.id });
    this.setState({ currency: item.id });
  };
  private onSelectPeriod = (event: React.SyntheticEvent<HTMLElement>, item: IListBoxItem<{}>) => {
    this.updateSettingsAndNotify({ period: item.id });
    this.setState({ period: item.id });
  };

  // Called in 'onChange' handlers when any field is updated.
  private async updateSettingsAndNotify(
    partialSettings: Partial<IBusinessValueWidgetSettings>
  ) {
    this.settings = { ...this.settings, ...partialSettings };
    const customSettings = this.serializeWidgetSettings(this.settings);
    await this.widgetConfigurationContext?.notify(
      Dashboard.ConfigurationEvent.ConfigurationChange,
      Dashboard.ConfigurationEvent.Args(customSettings)
    );
  }

  private serializeWidgetSettings(
    settings: IBusinessValueWidgetSettings
  ): Dashboard.CustomSettings {
    return {
      data: JSON.stringify(settings),
      version: { major: 1, minor: 0, patch: 0 },
    };
  }

  private async setStateFromWidgetSettings(
    widgetSettings: Dashboard.WidgetSettings
  ) {
    const deserialized: IBusinessValueWidgetSettings | null = JSON.parse(
      widgetSettings.customSettings.data
    );

    if (!deserialized) {
      return;
    }

    this.settings = deserialized;
    this.setState({
      targetValue: deserialized.targetValue?.toString(),
      currency: deserialized.currency,
      workItemType: deserialized.workItemType,
      period: deserialized.period
    });
  }

  async load(
    widgetSettings: Dashboard.WidgetSettings,
    widgetConfigurationContext: Dashboard.IWidgetConfigurationContext
  ): Promise<Dashboard.WidgetStatus> {
    this.widgetConfigurationContext = widgetConfigurationContext;

    await this.setStateFromWidgetSettings(widgetSettings);
    return Dashboard.WidgetStatusHelper.Success();
  }

  async onSave(): Promise<Dashboard.SaveStatus> {

    return Dashboard.WidgetConfigurationSave.Valid(
      this.serializeWidgetSettings(this.settings)
    );
  }
}

showRootComponent(<BusinessValueWidgetConfig />);