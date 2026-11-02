/**
 * ============================================================
 *  QuickReply — The Message Machine State Machine
 *  src/frontend/components/auth/message-machine/stateMachine.ts
 * ============================================================
 */

export type ExperienceState =
  | "INTRO"
  | "IDLE"
  | "EXPLORING"
  | "CHANNEL_SELECTED"
  | "ENTERING"
  | "AUTH_PANEL"
  | "AUTHENTICATING"
  | "SUCCESS"
  | "ERROR";

export type AuthMode = "login" | "signup" | "verify" | "forgot";

export interface ExperienceContext {
  state: ExperienceState;
  authMode: AuthMode;
  selectedChannel: string | null;
  introProgress: number; // 0.0 -> 1.0
  hoveredElement: string | null;
  errorMessage: string | null;
}

export type ExperienceAction =
  | { type: "SKIP_INTRO" }
  | { type: "INTRO_TICK"; progress: number }
  | { type: "INTRO_COMPLETE" }
  | { type: "HOVER_CHANNEL"; channelId: string }
  | { type: "UNHOVER_CHANNEL" }
  | { type: "SELECT_CHANNEL"; channelId: string }
  | { type: "TRIGGER_ENTER" }
  | { type: "CLOSE_AUTH_PANEL" }
  | { type: "SWITCH_AUTH_MODE"; mode: AuthMode }
  | { type: "START_AUTH" }
  | { type: "AUTH_SUCCESS" }
  | { type: "AUTH_ERROR"; message: string }
  | { type: "RESET_ERROR" };

export function experienceReducer(
  state: ExperienceContext,
  action: ExperienceAction
): ExperienceContext {
  switch (action.type) {
    case "SKIP_INTRO":
      return {
        ...state,
        state: state.state === "INTRO" ? "IDLE" : state.state,
        introProgress: 1.0,
      };

    case "INTRO_TICK":
      return {
        ...state,
        introProgress: Math.min(1.0, action.progress),
      };

    case "INTRO_COMPLETE":
      return {
        ...state,
        state: "IDLE",
        introProgress: 1.0,
      };

    case "HOVER_CHANNEL":
      if (state.state === "AUTH_PANEL" || state.state === "ENTERING") return state;
      return {
        ...state,
        state: "CHANNEL_SELECTED",
        selectedChannel: action.channelId,
        hoveredElement: action.channelId,
      };

    case "UNHOVER_CHANNEL":
      if (state.state === "AUTH_PANEL" || state.state === "ENTERING") return state;
      return {
        ...state,
        state: "IDLE",
        selectedChannel: null,
        hoveredElement: null,
      };

    case "SELECT_CHANNEL":
      return {
        ...state,
        selectedChannel: action.channelId,
      };

    case "TRIGGER_ENTER":
      return {
        ...state,
        state: "AUTH_PANEL",
        selectedChannel: null,
      };

    case "CLOSE_AUTH_PANEL":
      return {
        ...state,
        state: "IDLE",
      };

    case "SWITCH_AUTH_MODE":
      return {
        ...state,
        authMode: action.mode,
        errorMessage: null,
      };

    case "START_AUTH":
      return {
        ...state,
        state: "AUTHENTICATING",
        errorMessage: null,
      };

    case "AUTH_SUCCESS":
      return {
        ...state,
        state: "SUCCESS",
      };

    case "AUTH_ERROR":
      return {
        ...state,
        state: "AUTH_PANEL",
        errorMessage: action.message,
      };

    case "RESET_ERROR":
      return {
        ...state,
        errorMessage: null,
      };

    default:
      return state;
  }
}
