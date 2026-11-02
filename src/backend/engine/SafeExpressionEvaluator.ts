/**
 * SafeExpressionEvaluator.ts
 * Sandboxed Abstract Syntax Tree (AST) Expression Parser & Evaluator (Requirement R4).
 * Evaluates variables ($json, $node, $env, $loop), arithmetic, logical comparisons,
 * and safe built-in functions with ZERO arbitrary eval() or Function() execution.
 */

export class SecurityViolationError extends Error {
  constructor(message: string) {
    super(`Security Violation: ${message}`);
    this.name = "SecurityViolationError";
  }
}

type TokenType =
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "NULL"
  | "IDENTIFIER"
  | "OPERATOR"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "DOT"
  | "LBRACKET"
  | "RBRACKET"
  | "EOF";

interface Token {
  type: TokenType;
  value: any;
  position: number;
}

// AST Node Types
type ASTNode =
  | { type: "Literal"; value: any }
  | { type: "Identifier"; name: string }
  | { type: "PathAccess"; base: ASTNode; property: string | ASTNode; computed: boolean }
  | { type: "UnaryOp"; operator: string; argument: ASTNode }
  | { type: "BinaryOp"; operator: string; left: ASTNode; right: ASTNode }
  | { type: "CallExpr"; callee: string; args: ASTNode[] };

export class SafeExpressionEvaluator {
  private static readonly FORBIDDEN_IDENTIFIERS = new Set([
    "eval",
    "Function",
    "process",
    "require",
    "import",
    "global",
    "globalThis",
    "window",
    "document",
    "__proto__",
    "constructor",
    "prototype",
  ]);

  /**
   * Main entry point for evaluating expression strings.
   * Handles both full expressions "{{ $json.value >= 10 }}" and embedded templates
   * "Invoice {{ $json.id }} for {{ $json.customer }}".
   */
  public static evaluate(expression: any, contextData: Record<string, any> = {}): any {
    if (typeof expression !== "string") {
      return expression;
    }

    const trimmed = expression.trim();

    // Check if entire string is a single expression wrapped in {{ ... }}
    const fullMatch = trimmed.match(/^\{\{\s*([\s\S]+?)\s*\}\}$/);
    if (fullMatch) {
      return this.evaluateCode(fullMatch[1], contextData);
    }

    // Check if string contains embedded {{ ... }} interpolations
    if (trimmed.includes("{{")) {
      return trimmed.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, inner) => {
        try {
          const val = this.evaluateCode(inner.trim(), contextData);
          return val !== undefined && val !== null ? String(val) : "";
        } catch {
          return "";
        }
      });
    }

    // Plain string without template expressions
    return expression;
  }

  /**
   * Parse and evaluate raw expression code string within the provided context
   */
  public static evaluateCode(code: string, contextData: Record<string, any>): any {
    this.assertSecurity(code);
    const tokens = this.tokenize(code);
    const ast = new Parser(tokens).parse();
    return this.evaluateAST(ast, contextData);
  }

  /**
   * Validate that code does not contain any forbidden system tokens
   */
  private static assertSecurity(code: string): void {
    for (const forbidden of this.FORBIDDEN_IDENTIFIERS) {
      const regex = new RegExp(`\\b${forbidden}\\b`, "i");
      if (regex.test(code)) {
        throw new SecurityViolationError(`Access to '${forbidden}' is strictly prohibited in safe expressions.`);
      }
    }
  }

  /**
   * Lexical Tokenizer
   */
  private static tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < code.length) {
      const char = code[i];

      // Whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Strings (single or double quoted)
      if (char === '"' || char === "'") {
        const quote = char;
        let str = "";
        const startPos = i;
        i++; // skip opening quote
        while (i < code.length && code[i] !== quote) {
          if (code[i] === "\\" && i + 1 < code.length) {
            i++;
            str += code[i];
          } else {
            str += code[i];
          }
          i++;
        }
        if (i >= code.length) {
          throw new Error(`Unterminated string literal at position ${startPos}`);
        }
        i++; // skip closing quote
        tokens.push({ type: "STRING", value: str, position: startPos });
        continue;
      }

      // Numbers
      if (/\d/.test(char) || (char === "." && /\d/.test(code[i + 1] || ""))) {
        const startPos = i;
        let numStr = "";
        while (i < code.length && (/[\d\.]/.test(code[i]))) {
          numStr += code[i];
          i++;
        }
        tokens.push({ type: "NUMBER", value: Number(numStr), position: startPos });
        continue;
      }

      // Two/Three-character operators
      const two = code.slice(i, i + 2);
      const three = code.slice(i, i + 3);

      if (three === "===" || three === "!==") {
        tokens.push({ type: "OPERATOR", value: three, position: i });
        i += 3;
        continue;
      }

      if (
        two === "==" ||
        two === "!=" ||
        two === ">=" ||
        two === "<=" ||
        two === "&&" ||
        two === "||"
      ) {
        tokens.push({ type: "OPERATOR", value: two, position: i });
        i += 2;
        continue;
      }

      // Single character operators & delimiters
      if (["+", "-", "*", "/", "%", ">", "<", "!"].includes(char)) {
        tokens.push({ type: "OPERATOR", value: char, position: i });
        i++;
        continue;
      }

      if (char === "(") {
        tokens.push({ type: "LPAREN", value: "(", position: i });
        i++;
        continue;
      }
      if (char === ")") {
        tokens.push({ type: "RPAREN", value: ")", position: i });
        i++;
        continue;
      }
      if (char === "[") {
        tokens.push({ type: "LBRACKET", value: "[", position: i });
        i++;
        continue;
      }
      if (char === "]") {
        tokens.push({ type: "RBRACKET", value: "]", position: i });
        i++;
        continue;
      }
      if (char === ",") {
        tokens.push({ type: "COMMA", value: ",", position: i });
        i++;
        continue;
      }
      if (char === ".") {
        tokens.push({ type: "DOT", value: ".", position: i });
        i++;
        continue;
      }

      // Identifiers / Keywords ($json, $node, true, false, null, functions)
      if (/[a-zA-Z_\$]/.test(char)) {
        const startPos = i;
        let ident = "";
        while (i < code.length && /[a-zA-Z0-9_\$]/.test(code[i])) {
          ident += code[i];
          i++;
        }

        if (ident === "true") {
          tokens.push({ type: "BOOLEAN", value: true, position: startPos });
        } else if (ident === "false") {
          tokens.push({ type: "BOOLEAN", value: false, position: startPos });
        } else if (ident === "null") {
          tokens.push({ type: "NULL", value: null, position: startPos });
        } else {
          tokens.push({ type: "IDENTIFIER", value: ident, position: startPos });
        }
        continue;
      }

      throw new Error(`Unexpected character '${char}' at position ${i}`);
    }

    tokens.push({ type: "EOF", value: null, position: i });
    return tokens;
  }

  /**
   * Evaluate parsed AST Node recursively against safe context
   */
  private static evaluateAST(node: ASTNode, context: Record<string, any>): any {
    switch (node.type) {
      case "Literal":
        return node.value;

      case "Identifier": {
        if (node.name === "$json") return context.$json ?? {};
        if (node.name === "$node") return context.$node ?? {};
        if (node.name === "$env") return context.$env ?? {};
        if (node.name === "$loop") return context.$loop ?? {};
        return context[node.name];
      }

      case "PathAccess": {
        const baseVal = this.evaluateAST(node.base, context);
        if (baseVal === undefined || baseVal === null) {
          return undefined;
        }

        let propName: any;
        if (node.computed) {
          propName = typeof node.property === "string" ? node.property : this.evaluateAST(node.property, context);
        } else {
          propName = typeof node.property === "string" ? node.property : (node.property as any).name;
        }

        if (this.FORBIDDEN_IDENTIFIERS.has(String(propName))) {
          throw new SecurityViolationError(`Access to property '${String(propName)}' is forbidden.`);
        }

        return baseVal[propName];
      }

      case "UnaryOp": {
        const val = this.evaluateAST(node.argument, context);
        if (node.operator === "!") return !val;
        if (node.operator === "-") return -Number(val);
        if (node.operator === "+") return +Number(val);
        throw new Error(`Unsupported unary operator '${node.operator}'`);
      }

      case "BinaryOp": {
        // Short-circuit logical operators
        if (node.operator === "&&") {
          const leftVal = this.evaluateAST(node.left, context);
          return leftVal ? this.evaluateAST(node.right, context) : leftVal;
        }
        if (node.operator === "||") {
          const leftVal = this.evaluateAST(node.left, context);
          return leftVal ? leftVal : this.evaluateAST(node.right, context);
        }

        const left = this.evaluateAST(node.left, context);
        const right = this.evaluateAST(node.right, context);

        switch (node.operator) {
          case "==":
            return left == right;
          case "===":
            return left === right;
          case "!=":
            return left != right;
          case "!==":
            return left !== right;
          case ">":
            return Number(left) > Number(right);
          case "<":
            return Number(left) < Number(right);
          case ">=":
            return Number(left) >= Number(right);
          case "<=":
            return Number(left) <= Number(right);
          case "+":
            return typeof left === "string" || typeof right === "string"
              ? String(left) + String(right)
              : Number(left) + Number(right);
          case "-":
            return Number(left) - Number(right);
          case "*":
            return Number(left) * Number(right);
          case "/":
            return Number(right) === 0 ? 0 : Number(left) / Number(right);
          case "%":
            return Number(left) % Number(right);
          default:
            throw new Error(`Unsupported binary operator '${node.operator}'`);
        }
      }

      case "CallExpr": {
        const evaluatedArgs = node.args.map((a) => this.evaluateAST(a, context));
        return this.callSafeFunction(node.callee, evaluatedArgs);
      }
    }
  }

  /**
   * Safe built-in functions registry
   */
  private static callSafeFunction(name: string, args: any[]): any {
    switch (name) {
      case "length": {
        const arg = args[0];
        if (Array.isArray(arg) || typeof arg === "string") return arg.length;
        if (arg && typeof arg === "object") return Object.keys(arg).length;
        return 0;
      }
      case "toUpper":
        return String(args[0] ?? "").toUpperCase();
      case "toLower":
        return String(args[0] ?? "").toLowerCase();
      case "trim":
        return String(args[0] ?? "").trim();
      case "coalesce":
        return args.find((a) => a !== undefined && a !== null) ?? null;
      case "formatDate": {
        const date = new Date(args[0]);
        if (isNaN(date.getTime())) return String(args[0]);
        return date.toISOString();
      }
      case "parseNumber":
        return Number(args[0]) || 0;
      case "contains": {
        const [haystack, needle] = args;
        if (Array.isArray(haystack)) return haystack.includes(needle);
        if (typeof haystack === "string") return haystack.includes(String(needle));
        return false;
      }
      case "round": {
        const num = Number(args[0]) || 0;
        const decimals = Number(args[1]) || 0;
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
      }
      default:
        throw new Error(`Unknown or unauthorized function '${name}' in safe expressions.`);
    }
  }
}

/**
 * Recursive Descent Parser
 * Handles operator precedence:
 * Logical OR (||) -> Logical AND (&&) -> Equality (==, !=) -> Relational (<, >, <=, >=)
 * -> Additive (+, -) -> Multiplicative (*, /, %) -> Unary (!, -) -> Member/Call -> Primary
 */
class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  public parse(): ASTNode {
    const node = this.parseExpression();
    if (this.peek().type !== "EOF") {
      throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().position}`);
    }
    return node;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: "EOF", value: null, position: -1 };
  }

  private advance(): Token {
    const t = this.peek();
    this.pos++;
    return t;
  }

  private match(type: TokenType, value?: any): boolean {
    const t = this.peek();
    if (t.type === type && (value === undefined || t.value === value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();
    while (this.peek().type === "OPERATOR" && this.peek().value === "||") {
      const op = this.advance().value;
      const right = this.parseLogicalAnd();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.peek().type === "OPERATOR" && this.peek().value === "&&") {
      const op = this.advance().value;
      const right = this.parseEquality();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseRelational();
    while (
      this.peek().type === "OPERATOR" &&
      ["==", "===", "!=", "!=="].includes(this.peek().value)
    ) {
      const op = this.advance().value;
      const right = this.parseRelational();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parseRelational(): ASTNode {
    let left = this.parseAdditive();
    while (
      this.peek().type === "OPERATOR" &&
      [">", "<", ">=", "<="].includes(this.peek().value)
    ) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (
      this.peek().type === "OPERATOR" &&
      ["+", "-"].includes(this.peek().value)
    ) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    while (
      this.peek().type === "OPERATOR" &&
      ["*", "/", "%"].includes(this.peek().value)
    ) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.peek().type === "OPERATOR" && ["!", "-", "+"].includes(this.peek().value)) {
      const op = this.advance().value;
      const arg = this.parseUnary();
      return { type: "UnaryOp", operator: op, argument: arg };
    }
    return this.parseMemberOrCall();
  }

  private parseMemberOrCall(): ASTNode {
    let base = this.parsePrimary();

    while (true) {
      if (this.match("DOT")) {
        const propToken = this.peek();
        if (propToken.type !== "IDENTIFIER") {
          throw new Error(`Expected identifier after '.' at position ${propToken.position}`);
        }
        this.advance();
        base = { type: "PathAccess", base, property: propToken.value, computed: false };
      } else if (this.match("LBRACKET")) {
        const indexExpr = this.parseExpression();
        if (!this.match("RBRACKET")) {
          throw new Error(`Expected ']' at position ${this.peek().position}`);
        }
        base = { type: "PathAccess", base, property: indexExpr, computed: true };
      } else if (this.match("LPAREN")) {
        if (base.type !== "Identifier") {
          throw new Error("Only direct identifiers can be called as functions");
        }
        const args: ASTNode[] = [];
        if (!this.match("RPAREN")) {
          do {
            args.push(this.parseExpression());
          } while (this.match("COMMA"));
          if (!this.match("RPAREN")) {
            throw new Error(`Expected ')' after function arguments at position ${this.peek().position}`);
          }
        }
        base = { type: "CallExpr", callee: base.name, args };
      } else {
        break;
      }
    }

    return base;
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (token.type === "NUMBER" || token.type === "STRING" || token.type === "BOOLEAN" || token.type === "NULL") {
      this.advance();
      return { type: "Literal", value: token.value };
    }

    if (token.type === "IDENTIFIER") {
      this.advance();
      return { type: "Identifier", name: token.value };
    }

    if (this.match("LPAREN")) {
      const expr = this.parseExpression();
      if (!this.match("RPAREN")) {
        throw new Error(`Expected ')' at position ${this.peek().position}`);
      }
      return expr;
    }

    throw new Error(`Unexpected token '${token.value}' at position ${token.position}`);
  }
}
