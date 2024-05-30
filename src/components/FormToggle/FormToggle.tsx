import "./FormToggle.scss";
import { Toggle } from "azure-devops-ui/Toggle";
import React from "react";
import { IPipelineWidgetSettings } from "../PipelinesWidgetConfig/IPipelineWidgetSettings";

export interface IFormToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  id: keyof IPipelineWidgetSettings;
}

export default function FormToggle(props: IFormToggleProps) {
  return (
    <div className="form-row">
      <div className="body-m width-75">
        {props.label}
      </div>
      <Toggle
        checked={props.checked}
        onChange={(_, value) => props.onChange(value)}
        id={props.id}
      />
    </div>
  );
}