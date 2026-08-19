import { frameworkAgent } from "../agents/framework-agent";
import { locatorAgent } from "../agents/locator-agent";
import type { FlowContext, StageResult } from "../types";

export async function generateAutomationStage(context: FlowContext): Promise<StageResult> {
  const locatorPlanPath = locatorAgent.prepareLocatorStrategy(context);
  return frameworkAgent.generateAutomation(context, locatorPlanPath);
}
