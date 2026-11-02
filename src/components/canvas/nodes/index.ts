import { TriggerNode } from "./TriggerNode";
import { ActionNode } from "./ActionNode";
import { ConditionNode } from "./ConditionNode";
import { LoopNode } from "./LoopNode";
import { AINode } from "./AINode";
import { CustomScriptNode } from "./CustomScriptNode";

export {
  TriggerNode,
  ActionNode,
  ConditionNode,
  LoopNode,
  AINode,
  CustomScriptNode,
};

export const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
  conditionNode: ConditionNode,
  loopNode: LoopNode,
  aiNode: AINode,
  customScriptNode: CustomScriptNode,
};
