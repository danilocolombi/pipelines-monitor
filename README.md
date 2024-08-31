# Pipelines Monitor

**Pipelines Monitor**: A Azure DevOps extension designed to deliver insightful analytics on pipeline executions across your organization. Seamlessly integrating as a widget, it enhances your Azure DevOps Dashboard by providing a breakdown of your pipelines.

![](https://github.com/danilocolombi/pipelines-monitor/blob/main/documentation/images/widget-preview.png?raw=true)

## Table of Contents

- [Pipelines Monitor](#pipelines-monitor)
  - [Pipelines Monitor Features](#pipelines-monitor-features)
  - [Install](#install)
  - [Use](#use)
  - [Known Limitations](#known-limitations)

## Pipelines Monitor Features

This extension provides detailed insights into your pipelines, including:

**Total Pipelines**: View the complete list of all pipelines in your projects to get a comprehensive overview of your inventory.

**Run Statistics**: Track the total number of runs for each pipeline to find out which pipelines are executed most frequently.

**Outcome Breakdown**: See the number of successful, failed, and canceled runs in order to identify potential issues.

**Average Duration**: Monitor the average time taken for pipeline runs, and identify potential points of improvement.

## Install

The extension can be installed from [Azure DevOps Marketplace](https://marketplace.visualstudio.com/items?itemName=danilocolombi.pipelines-monitor).

## Use

### 1. Go to Dashboards

Navigate to the Azure 'Boards' tab in your account on the left hand navigation. Select the 'Dashboards' tab under 'Overview'.

![](https://github.com/danilocolombi/pipelines-monitor/blob/main/documentation/images/azdo-side-bar.png?raw=true)

### 2. Add the Widget

You are now on the Dashboards page. Use the 'Add a widget' button to add the widget to your dashboard.

![](https://github.com/danilocolombi/pipelines-monitor/blob/main/documentation/images/add-wiget-button.png?raw=true)

### 3. Search for Pipelines Monitor

Use the search box to find the Pipelines Monitor widget, and use the 'Add' button to add it to your dashboard.

![](https://github.com/danilocolombi/pipelines-monitor/blob/main/documentation/images/pipelines-monitor-search.png?raw=true)

### 4. Configure the Widget

You can choose the configure option to customize the widget settings.

![](https://github.com/danilocolombi/pipelines-monitor/blob/main/documentation/images/configure-option.png?raw=true)

### 5. Choose your Settings

Select the settings you want to use.

![](https://github.com/danilocolombi/pipelines-monitor/blob/main/documentation/images/widget-settings.png?raw=true)


## Known Limitations

You can only select pipelines from 10 projects at a time due to performance reasons.
It only works with YAML pipelines.