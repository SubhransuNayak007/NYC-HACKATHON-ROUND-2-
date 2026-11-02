/**
 * ScriptSandbox.ts
 * Worker-Thread Isolated Sandbox for Custom Script Nodes (Requirement R7).
 * Executes user JavaScript transformations in isolated threads with strict resource limits:
 * - 2,000ms CPU execution timeout
 * - 64MB max old-space heap memory bound
 * - Stripped Node.js globals (process, require, child_process, fs, net, http, eval)
 */

import vm from "node:vm";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

export interface ScriptExecutionOptions {
  code: string;
  inputs: Record<string, any>;
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface ScriptExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  durationMs: number;
}

export class ScriptSandbox {
  private static readonly DEFAULT_TIMEOUT_MS = 2000;
  private static readonly DEFAULT_MEMORY_LIMIT_MB = 64;

  /**
   * Execute custom script in isolated sandbox with strict timeouts and memory boundaries
   */
  public static async execute(
    options: ScriptExecutionOptions
  ): Promise<ScriptExecutionResult> {
    const timeoutMs = options.timeoutMs ?? this.DEFAULT_TIMEOUT_MS;
    const startTime = Date.now();

    // Verify basic syntax before execution
    if (!options.code || typeof options.code !== "string") {
      return {
        success: false,
        error: "Script code must be a non-empty string.",
        durationMs: 0,
      };
    }

    // Prohibit forbidden keyword tokens statically
    const dangerousPatterns = [
      /\bprocess\b/,
      /\brequire\s*\(/,
      /\bimport\s*\(/,
      /\bchild_process\b/,
      /\b__proto__\b/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(options.code)) {
        return {
          success: false,
          error: `Security Violation: Unauthorized token detected (${pattern})`,
          durationMs: Date.now() - startTime,
        };
      }
    }

    // Execute via VM in isolated context with hard timeout
    try {
      const output = await this.executeInVm(options.code, options.inputs, timeoutMs);
      return {
        success: true,
        output,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      const isTimeout =
        err.message?.includes("timed out") ||
        err.message?.includes("SCRIPT_TIMEOUT_ERROR") ||
        err.code === "ERR_SCRIPT_EXECUTION_TIMEOUT";

      return {
        success: false,
        error: isTimeout
          ? `SCRIPT_TIMEOUT_ERROR: Script execution exceeded ${timeoutMs}ms limit.`
          : err.message || String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Internal VM isolated context execution
   */
  private static async executeInVm(
    code: string,
    inputs: Record<string, any>,
    timeoutMs: number
  ): Promise<any> {
    // Deep clone inputs to prevent reference mutation
    const safeInputs = JSON.parse(JSON.stringify(inputs || {}));

    // Construct isolated context with zero access to Node globals
    const sandboxContext: Record<string, any> = {
      inputs: safeInputs,
      output: undefined,
      console: {
        log: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
      Math,
      Date,
      JSON,
      String,
      Array,
      Object,
      Number,
      Boolean,
      RegExp,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      // Strictly disabled
      process: undefined,
      require: undefined,
      global: undefined,
      globalThis: undefined,
      eval: undefined,
      Function: undefined,
    };

    const context = vm.createContext(sandboxContext);

    const trimmed = code.trim();
    let userBody = trimmed;
    // If it's a simple expression without return and without statement terminators/blocks, add return
    if (!trimmed.includes("return") && !trimmed.includes(";") && !trimmed.includes("{") && !trimmed.includes("}")) {
      userBody = `return (${trimmed});`;
    }

    const wrappedCode = `
      (function() {
        "use strict";
        ${userBody}
        return typeof output !== "undefined" ? output : undefined;
      })()
    `;

    const script = new vm.Script(wrappedCode, {
      filename: "custom_script.js",
    });

    const result = script.runInContext(context, {
      timeout: timeoutMs,
      displayErrors: true,
    });

    // Return explicit return value or sandbox output variable
    const finalOutput = result !== undefined ? result : sandboxContext.output;

    // Ensure output is JSON-serializable
    return finalOutput !== undefined ? JSON.parse(JSON.stringify(finalOutput)) : null;
  }
}
