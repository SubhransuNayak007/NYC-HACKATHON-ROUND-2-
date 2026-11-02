/**
 * QuickReply — Facebook / Meta JavaScript SDK Helper
 * src/lib/facebookSdk.ts
 *
 * Provides safe dynamic loading of the official Meta SDK (https://connect.facebook.net/en_US/sdk.js)
 * and typed 1-click login and connection helpers using Meta App ID.
 */

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      AppEvents?: {
        logPageView: () => void;
      };
      getLoginStatus: (
        callback: (response: FacebookLoginStatusResponse) => void
      ) => void;
      login: (
        callback: (response: FacebookLoginStatusResponse) => void,
        options?: { scope?: string; return_scopes?: boolean }
      ) => void;
      logout: (callback: (response: unknown) => void) => void;
    };
  }
}

export interface FacebookAuthResponse {
  accessToken: string;
  expiresIn: number;
  signedRequest: string;
  userID: string;
  grantedScopes?: string;
}

export interface FacebookLoginStatusResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse: FacebookAuthResponse | null;
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || "1617767409877904";
const META_API_VERSION = "v19.0";

let sdkPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads and initializes the Facebook JavaScript SDK.
 * Idempotent: Subsequent calls return the same initialized Promise.
 */
export function initFacebookSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.FB) return Promise.resolve(true);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve) => {
    window.fbAsyncInit = function () {
      try {
        window.FB?.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: true,
          version: META_API_VERSION,
        });
        window.FB?.AppEvents?.logPageView();
        resolve(true);
      } catch (err) {
        console.warn("[Facebook SDK] Initialization error:", err);
        resolve(false);
      }
    };

    // Load SDK script tag
    const id = "facebook-jssdk";
    if (document.getElementById(id)) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.warn("[Facebook SDK] Failed to load sdk.js");
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return sdkPromise;
}

/**
 * Triggers Meta 1-Click Login dialog.
 * @param scope Comma-separated list of Meta permissions
 */
export async function loginWithFacebook(
  scope = "public_profile,email"
): Promise<FacebookLoginStatusResponse> {
  await initFacebookSdk();

  return new Promise((resolve) => {
    if (!window.FB) {
      resolve({
        status: "unknown",
        authResponse: null,
      });
      return;
    }

    window.FB.login(
      (response) => {
        resolve(response);
      },
      { scope, return_scopes: true }
    );
  });
}

/**
 * Checks current Facebook login status for the user.
 */
export async function getFacebookLoginStatus(): Promise<FacebookLoginStatusResponse> {
  await initFacebookSdk();

  return new Promise((resolve) => {
    if (!window.FB) {
      resolve({
        status: "unknown",
        authResponse: null,
      });
      return;
    }

    window.FB.getLoginStatus((response) => {
      resolve(response);
    });
  });
}
