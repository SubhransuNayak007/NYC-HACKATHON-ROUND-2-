/**
 * ============================================================================
 * QuickReply — Safe Typed Expression AST & Variable Interpolator
 * src/backend/rules/ExpressionEvaluator.ts
 *
 * Provides deterministic, non-eval, bounded condition evaluation and
 * typed variable interpolation across customer, content, and comment contexts.
 * ============================================================================
 */

import { ConditionNode, ConditionLeaf, ConditionBranch, AssembledContext } from "./types";

export class ExpressionEvaluator {
  /**
   * Resolves a variable dictionary from the assembled context
   */
  static buildVariableMap(ctx: AssembledContext, executionId?: string): Record<string, string> {
    const cust = ctx.customer;
    const evt = ctx.event;
    const content = ctx.contentMetadata;
    const now = new Date();

    const fullName = cust?.name || evt.actor.name || evt.actor.username || "Friend";
    const firstName = fullName.split(" ")[0] || fullName;
    const username = cust?.identities?.find((i) => i.platform === evt.platform)?.username || evt.actor.username || evt.actor.id;

    return {
      "customer.name": fullName,
      "customer.first_name": firstName,
      "customer.username": username,
      "customer.phone": cust?.phone || "",
      "customer.email": cust?.email || "",
      "customer.lead_score": cust?.leadScore ? String(cust.leadScore) : "50",
      "customer.lead_stage": cust?.leadStage || "prospect",
      "customer.tags": cust?.tags ? cust.tags.join(", ") : "",

      "comment.text": evt.content || "",
      "comment.id": evt.id || "",
      "comment.timestamp": evt.timestamp || now.toISOString(),

      "content.title": content?.title || "our latest update",
      "content.id": content?.id || "",
      "content.url": content?.id ? `https://${evt.platform}.com/${content.id}` : "",
      "video.title": content?.title || "our video",
      "video.id": content?.id || "",
      "post.title": content?.title || "our post",
      "post.id": content?.id || "",

      "platform.name": evt.platform.toUpperCase(),
      "current_time": now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      "current_date": now.toLocaleDateString(),
      "execution.id": executionId || `exec_${Date.now()}`,
    };
  }

  /**
   * Safely interpolate template variables into text (e.g. "Hey {{customer.first_name}} 👋")
   */
  static interpolate(template: string, ctx: AssembledContext, executionId?: string): string {
    if (!template) return "";
    const vars = this.buildVariableMap(ctx, executionId);

    return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, varName) => {
      const key = varName.trim().toLowerCase();
      if (vars[key] !== undefined) {
        return vars[key];
      }
      return match; // Retain unrecognized variable token cleanly
    });
  }

  /**
   * Evaluate a Condition Tree against Assembled Context
   */
  static evaluateCondition(node: ConditionNode, ctx: AssembledContext): boolean {
    if (node.type === "branch") {
      const branch = node as ConditionBranch;
      if (!branch.children || branch.children.length === 0) return true;

      if (branch.logicalOperator === "AND") {
        return branch.children.every((child) => this.evaluateCondition(child, ctx));
      } else {
        return branch.children.some((child) => this.evaluateCondition(child, ctx));
      }
    }

    if (node.type === "leaf") {
      const leaf = node as ConditionLeaf;
      return this.evaluateLeaf(leaf, ctx);
    }

    return true;
  }

  /**
   * Evaluate a single condition leaf node
   */
  private static evaluateLeaf(leaf: ConditionLeaf, ctx: AssembledContext): boolean {
    if (leaf.operator === "always_pass") return true;

    // Resolve target value from context
    let targetValue: any = null;
    const field = leaf.field.toLowerCase();

    if (field === "comment.text") {
      targetValue = ctx.event.content || "";
    } else if (field === "customer.tag") {
      targetValue = ctx.customer?.tags || [];
    } else if (field === "customer.lead_score") {
      targetValue = ctx.customer?.leadScore ?? 50;
    } else if (field === "content.tag") {
      targetValue = ctx.contentMetadata.tags || [];
    } else if (field === "sentiment") {
      targetValue = ctx.customer?.sentiment || "neutral";
    }

    const val = leaf.value;
    const caseSensitive = leaf.caseSensitive ?? false;

    // String operations
    if (typeof targetValue === "string") {
      const strTarget = caseSensitive ? targetValue : targetValue.toLowerCase();
      const strVal = caseSensitive ? String(val) : String(val).toLowerCase();

      switch (leaf.operator) {
        case "contains":
          return strTarget.includes(strVal);
        case "equals":
          return strTarget === strVal;
        case "starts_with":
          return strTarget.startsWith(strVal);
        case "ends_with":
          return strTarget.endsWith(strVal);
        case "contains_any": {
          const list = Array.isArray(val)
            ? val
            : String(val).split(",").map((s) => s.trim().toLowerCase());
          return list.some((item) => strTarget.includes(item));
        }
        case "contains_all": {
          const list = Array.isArray(val)
            ? val
            : String(val).split(",").map((s) => s.trim().toLowerCase());
          return list.every((item) => strTarget.includes(item));
        }
        case "contains_none": {
          const list = Array.isArray(val)
            ? val
            : String(val).split(",").map((s) => s.trim().toLowerCase());
          return !list.some((item) => strTarget.includes(item));
        }
        case "regex": {
          try {
            // Bound regex length to protect against ReDoS
            if (String(val).length > 200) return false;
            const reg = new RegExp(String(val), caseSensitive ? "" : "i");
            return reg.test(targetValue);
          } catch {
            return false;
          }
        }
      }
    }

    // Array / Tag operations
    if (Array.isArray(targetValue)) {
      const tagList = targetValue.map((t) => String(t).toLowerCase());
      if (leaf.operator === "tag_match" || leaf.operator === "contains") {
        return tagList.includes(String(val).toLowerCase());
      }
      if (leaf.operator === "contains_any") {
        const list = Array.isArray(val)
          ? val
          : String(val).split(",").map((s) => s.trim().toLowerCase());
        return list.some((item) => tagList.includes(item));
      }
    }

    // Numeric operations
    if (typeof targetValue === "number") {
      const numVal = Number(val);
      if (isNaN(numVal)) return false;

      switch (leaf.operator) {
        case "numeric_gt":
          return targetValue > numVal;
        case "numeric_lt":
          return targetValue < numVal;
        case "numeric_eq":
          return targetValue === numVal;
      }
    }

    return false;
  }
}
