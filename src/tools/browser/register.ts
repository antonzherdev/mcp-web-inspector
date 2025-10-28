import type { ToolClass } from '../common/types.js';

// Navigation
import { NavigateTool } from './navigation/navigate.js';
import { GoBackTool } from './navigation/go_back.js';
import { GoForwardTool } from './navigation/go_forward.js';
import { ScrollToElementTool } from './navigation/scroll_to_element.js';
import { ScrollByTool } from './navigation/scroll_by.js';

// Lifecycle
import { CloseTool } from './lifecycle/close.js';

// Interaction
import { ClickTool } from './interaction/click.js';
import { FillTool } from './interaction/fill.js';
import { SelectTool } from './interaction/select.js';
import { HoverTool } from './interaction/hover.js';
import { UploadFileTool } from './interaction/upload_file.js';
import { DragTool } from './interaction/drag.js';
import { PressKeyTool } from './interaction/press_key.js';

// Content
import { ScreenshotTool } from './content/screenshot.js';
import { GetTextTool } from './content/get_text.js';
import { GetHtmlTool } from './content/get_html.js';

// Inspection
import { InspectDomTool } from './inspection/inspect_dom.js';
import { GetTestIdsTool } from './inspection/get_test_ids.js';
import { QuerySelectorTool } from './inspection/query_selector.js';
import { FindByTextTool } from './inspection/find_by_text.js';
import { CheckVisibilityTool } from './inspection/check_visibility.js';
import { CompareElementAlignmentTool } from './inspection/compare_element_alignment.js';
import { InspectAncestorsTool } from './inspection/inspect_ancestors.js';
import { ElementExistsTool } from './inspection/element_exists.js';
import { MeasureElementTool } from './inspection/measure_element.js';
import { GetComputedStylesTool } from './inspection/get_computed_styles.js';

// Evaluation
import { EvaluateTool } from './evaluation/evaluate.js';

// Console
import { GetConsoleLogsTool } from './console/get_console_logs.js';

// Network
import { ListNetworkRequestsTool } from './network/list_network_requests.js';
import { GetRequestDetailsTool } from './network/get_request_details.js';

// Waiting
import { WaitForElementTool } from './waiting/wait_for_element.js';
import { WaitForNetworkIdleTool } from './waiting/wait_for_network_idle.js';

export const BROWSER_TOOL_CLASSES: ToolClass[] = [
  // Navigation (6)
  NavigateTool,
  GoBackTool,
  GoForwardTool,
  ScrollToElementTool,
  ScrollByTool,
  CloseTool,

  // Interaction (7)
  ClickTool,
  FillTool,
  SelectTool,
  HoverTool,
  UploadFileTool,
  DragTool,
  PressKeyTool,

  // Content (3)
  ScreenshotTool,
  GetTextTool,
  GetHtmlTool,

  // Inspection (10)
  InspectDomTool,
  GetTestIdsTool,
  QuerySelectorTool,
  FindByTextTool,
  CheckVisibilityTool,
  CompareElementAlignmentTool,
  InspectAncestorsTool,
  ElementExistsTool,
  MeasureElementTool,
  GetComputedStylesTool,

  // Evaluation (1)
  EvaluateTool,

  // Console (1)
  GetConsoleLogsTool,

  // Network (2)
  ListNetworkRequestsTool,
  GetRequestDetailsTool,

  // Waiting (2)
  WaitForElementTool,
  WaitForNetworkIdleTool,
];
