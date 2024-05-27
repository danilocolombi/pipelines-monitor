import "./BusinessValueWidget.scss";
import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import * as Dashboard from "azure-devops-extension-api/Dashboard";
import { showRootComponent } from "../../Common";
import { getTotalBusinessValue } from "../../services/workitems";

interface IBusinessValueWidgetState {
  title: string;
  totalBusinessValue: number;
  targetValue?: number;
  currency: string;
}

class BusinessValueWidget
  extends React.Component<{}, IBusinessValueWidgetState>
  implements Dashboard.IConfigurableWidget {
  componentDidMount() {
    SDK.init().then(() => {
      SDK.register("total-business-value-widget", this);
    });
  }

  render(): JSX.Element {

    if (!this.state) {
      return <div></div>;
    }

    const { totalBusinessValue, targetValue, currency } = this.state;
    const colorClass = targetValue === undefined || totalBusinessValue > targetValue ? "bg-green" : "bg-red";

    const targetValueContent = targetValue !== undefined && targetValue > 0 ?
      <div className="status">Target: {this.formatCurrency(targetValue, currency)}</div> : "";

    return (
      <div className={`content ${colorClass}`}>
        <div className="title">{this.state.title}</div>
        <div className="main-content">
          <div className="status">
            Current: {this.formatCurrency(totalBusinessValue, currency)}
          </div>
          {targetValueContent}
        </div>
      </div>
    );
  }

  private formatCurrency(value: number, currency: string): string {
    return value.toLocaleString(navigator.language, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0
    });
  }

  async preload(_widgetSettings: Dashboard.WidgetSettings) {
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
      const deserialized: IBusinessValueWidgetSettings | null = JSON.parse(
        widgetSettings.customSettings.data
      );

      if (!deserialized) {
        return;
      }

      const totalBusinessValue = (await getTotalBusinessValue(deserialized.workItemType, deserialized.period));
      this.setState({
        title: widgetSettings.name,
        totalBusinessValue,
        targetValue: deserialized.targetValue,
        currency: deserialized.currency
      });
    } catch (e) {
      console.log("Error: ", e);
      this.setState({
        totalBusinessValue: 0,
        targetValue: undefined,
        currency: "USD",
      });
    }
  }
}

showRootComponent(<BusinessValueWidget />);
