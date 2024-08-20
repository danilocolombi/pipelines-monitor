export interface IPipelineWidgetSettings {
  showProjectName: boolean;
  showRuns: boolean;
  showSucceeded: boolean;
  showFailed: boolean;
  showAverage: boolean;
  showCanceled: boolean;
  showAsPercentage: boolean;
  selectedProjects: string[];
  renderMultipleProjects: boolean;
}