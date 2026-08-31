import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

import api, {
  getApiUrl,
  isSecureWebAuthnContext,
} from "./api";


/* =========================================================
   TA-HOSS LOG
   WEB AUTHN / DEVICE BIOMETRIC SERVICE
========================================================= */

/*
Supported platform authenticators include:

- Android fingerprint
- Android face authentication
- iPhone Touch ID
- iPhone Face ID
- Windows Hello
- macOS Touch ID
- Hardware security keys

IMPORTANT:

The browser/device performs the actual biometric verification.

TA-HOSS LOG does NOT receive:

- fingerprint image
- face image
- raw biometric template

The server stores the WebAuthn credential/public key data.
*/


/* =========================================================
   CONSTANTS
========================================================= */

const BIOMETRIC_BASE =
  "/biometric";

const TOKEN_KEY =
  "ta_hoss_token";


/* =========================================================
   ERROR HELPER
========================================================= */

const getErrorMessage = (
  error,
  fallback = "Biometric operation failed."
) => {
  if (
    error?.response?.data?.message
  ) {
    return error.response.data.message;
  }

  if (
    error?.response?.data?.error
  ) {
    return error.response.data.error;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};


/* =========================================================
   WEB AUTHN SUPPORT
========================================================= */

export const isWebAuthnSupported = () => {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !==
      "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.credentials &&
    typeof navigator.credentials.create ===
      "function" &&
    typeof navigator.credentials.get ===
      "function"
  );
};


/* =========================================================
   SECURE CONTEXT CHECK
========================================================= */

export const isBiometricSecureContext = () => {
  return isSecureWebAuthnContext();
};


/* =========================================================
   PLATFORM AUTHENTICATOR CHECK
========================================================= */

export const isPlatformAuthenticatorAvailable =
  async () => {
    if (!isWebAuthnSupported()) {
      return false;
    }

    try {
      if (
        typeof window
          .PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable !==
        "function"
      ) {
        return false;
      }

      return await window
        .PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.error(
        "PLATFORM AUTHENTICATOR CHECK ERROR:",
        error
      );

      return false;
    }
  };


/* =========================================================
   BIOMETRIC AVAILABILITY
========================================================= */

export const checkBiometricAvailability =
  async () => {
    if (!isWebAuthnSupported()) {
      return {
        supported: false,
        platformAvailable: false,
        secureContext: false,
        message:
          "This browser does not support WebAuthn.",
      };
    }

    const secureContext =
      isBiometricSecureContext();

    if (!secureContext) {
      return {
        supported: true,
        platformAvailable: false,
        secureContext: false,
        message:
          "Biometric login requires HTTPS. Open TA-HOSS LOG through a secure HTTPS address.",
      };
    }

    const platformAvailable =
      await isPlatformAuthenticatorAvailable();

    return {
      supported: true,
      platformAvailable,
      secureContext: true,
      message: platformAvailable
        ? "Device biometric authentication is available."
        : "No built-in biometric authenticator was detected.",
    };
  };


/* =========================================================
   GET REGISTRATION OPTIONS
========================================================= */

export const getRegistrationOptions =
  async () => {
    try {
      const response = await api.post(
        `${BIOMETRIC_BASE}/registration/options`
      );

      return response.data;
    } catch (error) {
      console.error(
        "GET BIOMETRIC REGISTRATION OPTIONS ERROR:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "Unable to start biometric registration."
        )
      );
    }
  };


/* =========================================================
   REGISTER USER BIOMETRIC
========================================================= */

export const registerBiometric =
  async (deviceName = "") => {
    try {
      /* ---------------------------------------------
         STEP 1 — Browser support
      --------------------------------------------- */

      if (!isWebAuthnSupported()) {
        throw new Error(
          "Biometric authentication is not supported by this browser."
        );
      }


      /* ---------------------------------------------
         STEP 2 — HTTPS
      --------------------------------------------- */

      if (!isBiometricSecureContext()) {
        throw new Error(
          "Biometric authentication requires a secure HTTPS connection. The current TA-HOSS LOG address is not secure."
        );
      }


      /* ---------------------------------------------
         STEP 3 — Platform authenticator
      --------------------------------------------- */

      const platformAvailable =
        await isPlatformAuthenticatorAvailable();

      if (!platformAvailable) {
        throw new Error(
          "No supported fingerprint, Face ID, Windows Hello, or other built-in biometric authenticator was detected on this device."
        );
      }


      /* ---------------------------------------------
         STEP 4 — Server options
      --------------------------------------------- */

      const optionsResponse =
        await getRegistrationOptions();

      const options =
        optionsResponse?.options ||
        optionsResponse?.data?.options ||
        optionsResponse?.data ||
        optionsResponse;

      if (!options?.challenge) {
        throw new Error(
          "The server did not return a valid biometric registration challenge."
        );
      }


      /* ---------------------------------------------
         STEP 5 — Browser biometric prompt
      --------------------------------------------- */

      const registrationResponse =
        await startRegistration({
          optionsJSON: options,
        });


      /* ---------------------------------------------
         STEP 6 — Send response to server
      --------------------------------------------- */

      const response =
        await api.post(
          `${BIOMETRIC_BASE}/registration/verify`,
          {
            ...registrationResponse,
            deviceName:
              deviceName ||
              `${getDeviceName()}`
          }
        );


      const result = response.data;


      return {
        success: true,
        message:
          result?.message ||
          "Biometric authentication enrolled successfully.",
        data:
          result?.data ||
          result?.biometric ||
          null,
        response: result,
      };

    } catch (error) {
      console.error(
        "BIOMETRIC REGISTRATION ERROR:",
        error
      );

      if (
        error?.name ===
        "NotAllowedError"
      ) {
        throw new Error(
          "Biometric registration was cancelled, timed out, or the device did not complete verification."
        );
      }

      if (
        error?.name ===
        "InvalidStateError"
      ) {
        throw new Error(
          "A biometric credential from this device may already be registered."
        );
      }

      if (
        error?.name ===
        "NotSupportedError"
      ) {
        throw new Error(
          "This browser or device does not support the requested biometric authentication."
        );
      }

      if (
        error?.name ===
        "SecurityError"
      ) {
        throw new Error(
          "The browser blocked biometric authentication. Make sure TA-HOSS LOG is being accessed through HTTPS and that the WebAuthn domain is correctly configured."
        );
      }

      throw new Error(
        getErrorMessage(
          error,
          "Unable to register biometric authentication."
        )
      );
    }
  };


/* =========================================================
   GET LOGIN OPTIONS
========================================================= */

export const getAuthenticationOptions =
  async (identifier = "") => {
    try {
      const body = {};

      if (
        typeof identifier === "string" &&
        identifier.trim()
      ) {
        body.identifier =
          identifier.trim();
      }

      const response =
        await api.post(
          `${BIOMETRIC_BASE}/login/options`,
          body
        );

      return response.data;

    } catch (error) {
      console.error(
        "GET BIOMETRIC LOGIN OPTIONS ERROR:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "Unable to start biometric login."
        )
      );
    }
  };


/* =========================================================
   BIOMETRIC LOGIN
========================================================= */

export const biometricLogin =
  async (identifier = "") => {

    try {

      /* ---------------------------------------------
         STEP 1 — Browser support
      --------------------------------------------- */

      if (!isWebAuthnSupported()) {
        throw new Error(
          "Biometric authentication is not supported by this browser."
        );
      }


      /* ---------------------------------------------
         STEP 2 — Secure context
      --------------------------------------------- */

      if (!isBiometricSecureContext()) {
        throw new Error(
          "Biometric login requires HTTPS. Please open TA-HOSS LOG using a secure HTTPS address."
        );
      }


      /* ---------------------------------------------
         STEP 3 — Platform authenticator
      --------------------------------------------- */

      const platformAvailable =
        await isPlatformAuthenticatorAvailable();

      if (!platformAvailable) {
        throw new Error(
          "No fingerprint, Face ID, Windows Hello, or other supported device authenticator is available."
        );
      }


      /* ---------------------------------------------
         STEP 4 — Request login challenge
      --------------------------------------------- */

      const optionsResponse =
        await getAuthenticationOptions(
          identifier
        );

      const options =
        optionsResponse?.options ||
        optionsResponse?.data?.options ||
        optionsResponse?.data ||
        optionsResponse;

      if (!options?.challenge) {
        throw new Error(
          "The server did not return a valid biometric login challenge."
        );
      }


      /* ---------------------------------------------
         STEP 5 — Browser biometric prompt
      --------------------------------------------- */

      const authenticationResponse =
        await startAuthentication({
          optionsJSON: options,

          /*
           * Require the browser/device to perform
           * user verification.
           */
          useBrowserAutofill: false,
        });


      /* ---------------------------------------------
         STEP 6 — Verify assertion
      --------------------------------------------- */

      const response =
        await api.post(
          `${BIOMETRIC_BASE}/login/verify`,
          {
            ...authenticationResponse,

            ...(identifier?.trim()
              ? {
                  identifier:
                    identifier.trim(),
                }
              : {}),
          }
        );


      const result =
        response.data;


      /* ---------------------------------------------
         STEP 7 — Extract JWT/user
      --------------------------------------------- */

      const token =
        result?.token ||
        result?.data?.token ||
        null;

      const user =
        result?.user ||
        result?.data?.user ||
        null;


      if (!token) {
        throw new Error(
          "Biometric authentication succeeded, but the server did not return a login token."
        );
      }


      return {
        success: true,
        token,
        user,
        message:
          result?.message ||
          "Biometric login successful.",
        data:
          result?.data ||
          null,
        response:
          result,
      };

    } catch (error) {

      console.error(
        "BIOMETRIC LOGIN ERROR:",
        error
      );


      if (
        error?.name ===
        "NotAllowedError"
      ) {
        throw new Error(
          "Biometric login was cancelled, timed out, or the device could not verify you."
        );
      }


      if (
        error?.name ===
        "InvalidStateError"
      ) {
        throw new Error(
          "No usable biometric credential was found on this device."
        );
      }


      if (
        error?.name ===
        "NotSupportedError"
      ) {
        throw new Error(
          "This browser or device does not support biometric authentication."
        );
      }


      if (
        error?.name ===
        "SecurityError"
      ) {
        throw new Error(
          "The browser blocked biometric authentication. TA-HOSS LOG must be accessed through HTTPS and the WebAuthn domain must match the server configuration."
        );
      }


      throw new Error(
        getErrorMessage(
          error,
          "Biometric login failed."
        )
      );
    }
  };


/* =========================================================
   CURRENT USER CREDENTIALS
========================================================= */

export const getBiometricCredentials =
  async () => {

    try {

      const response =
        await api.get(
          `${BIOMETRIC_BASE}/credentials`
        );

      const result =
        response.data;

      return {
        success: true,
        data:
          result?.credentials ||
          result?.data ||
          [],
        biometricEnabled:
          Boolean(
            result?.biometricEnabled
          ),
        message:
          result?.message ||
          "Biometric credentials retrieved successfully.",
        response:
          result,
      };

    } catch (error) {

      console.error(
        "GET BIOMETRIC CREDENTIALS ERROR:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "Unable to retrieve biometric credentials."
        )
      );
    }
  };


/* =========================================================
   CURRENT USER BIOMETRIC STATUS
========================================================= */

export const getBiometricStatus =
  async () => {

    try {

      const response =
        await api.get(
          `${BIOMETRIC_BASE}/status`
        );

      const result =
        response.data;

      return {
        success: true,
        data: result,
        biometricEnabled:
          Boolean(
            result?.biometricEnabled
          ),
        credentials:
          result?.credentials || 0,
        lastUsedAt:
          result?.lastUsedAt || null,
        message:
          result?.message ||
          "Biometric status retrieved successfully.",
        response:
          result,
      };

    } catch (error) {

      console.error(
        "GET BIOMETRIC STATUS ERROR:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "Unable to retrieve biometric status."
        )
      );
    }
  };


/* =========================================================
   REMOVE USER BIOMETRIC CREDENTIAL
========================================================= */

export const removeBiometricCredential =
  async (credentialId) => {

    if (!credentialId) {
      throw new Error(
        "A biometric credential ID is required."
      );
    }

    try {

      const response =
        await api.delete(
          `${BIOMETRIC_BASE}/credentials/${encodeURIComponent(
            credentialId
          )}`
        );

      const result =
        response.data;

      return {
        success: true,
        message:
          result?.message ||
          "Biometric credential removed successfully.",
        data:
          result?.data ||
          null,
        biometricEnabled:
          Boolean(
            result?.biometricEnabled
          ),
        response:
          result,
      };

    } catch (error) {

      console.error(
        "REMOVE BIOMETRIC CREDENTIAL ERROR:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "Unable to remove biometric credential."
        )
      );
    }
  };


/* =========================================================
   RESIDENT BIOMETRIC REGISTRATION OPTIONS
========================================================= */

export const getResidentRegistrationOptions =
  async (residentId) => {

    if (!residentId) {
      throw new Error(
        "Resident ID is required."
      );
    }

    try {

      const response =
        await api.post(
          `${BIOMETRIC_BASE}/residents/${encodeURIComponent(
            residentId
          )}/enroll`
        );

      return response.data;

    } catch (error) {

      console.error(
        "GET RESIDENT BIOMETRIC OPTIONS ERROR:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "Unable to start resident biometric enrollment."
        )
      );
    }
  };


/* =========================================================
   RESIDENT BIOMETRIC ENROLLMENT
========================================================= */

export const enrollResidentBiometric =
  async (
    residentId,
    deviceName = ""
  ) => {

    try {

      if (!isWebAuthnSupported()) {
        throw new Error(
          "This browser does not support biometric authentication."
        );
      }

      if (!isBiometricSecureContext()) {
        throw new Error(
          "Resident biometric enrollment requires HTTPS."
        );
      }

      const platformAvailable =
        await isPlatformAuthenticatorAvailable();

      if (!platformAvailable) {
        throw new Error(
          "No supported device biometric authenticator was found."
        );
      }

      const optionsResponse =
        await getResidentRegistrationOptions(
          residentId
        );

      const options =
        optionsResponse?.options ||
        optionsResponse?.data?.options ||
        optionsResponse?.data ||
        optionsResponse;

      if (!options?.challenge) {
        throw new Error(
          "The server did not return a valid resident biometric challenge."
        );
      }

      const registrationResponse =
        await startRegistration({
          optionsJSON: options,
        });

      const response =
        await api.post(
          `${BIOMETRIC_BASE}/residents/${encodeURIComponent(
            residentId
          )}/enroll/verify`,
          {
            ...registrationResponse,
            deviceName:
              deviceName ||
              getDeviceName(),
          }
        );

      return {
        success: true,
        message:
          response.data?.message ||
          "Resident biometric enrollment completed successfully.",
        data:
          response.data,
      };

    } catch (error) {

      console.error(
        "RESIDENT BIOMETRIC ENROLLMENT ERROR:",
        error
      );

      if (
        error?.name ===
        "NotAllowedError"
      ) {
        throw new Error(
          "Resident biometric enrollment was cancelled or timed out."
        );
      }

      if (
        error?.name ===
        "SecurityError"
      ) {
        throw new Error(
          "Biometric enrollment requires a secure HTTPS connection."
        );
      }

      throw new Error(
        getErrorMessage(
          error,
          "Unable to enroll resident biometric authentication."
        )
      );
    }
  };


/* =========================================================
   RESIDENT BIOMETRIC STATUS
========================================================= */

export const getResidentBiometricStatus =
  async (residentId) => {

    if (!residentId) {
      throw new Error(
        "Resident ID is required."
      );
    }

    try {

      const response =
        await api.get(
          `${BIOMETRIC_BASE}/residents/${encodeURIComponent(
            residentId
          )}/status`
        );

      return response.data;

    } catch (error) {

      throw new Error(
        getErrorMessage(
          error,
          "Unable to retrieve resident biometric status."
        )
      );
    }
  };


/* =========================================================
   RESIDENT CREDENTIALS
========================================================= */

export const getResidentBiometricCredentials =
  async (residentId) => {

    if (!residentId) {
      throw new Error(
        "Resident ID is required."
      );
    }

    try {

      const response =
        await api.get(
          `${BIOMETRIC_BASE}/residents/${encodeURIComponent(
            residentId
          )}`
        );

      return response.data;

    } catch (error) {

      throw new Error(
        getErrorMessage(
          error,
          "Unable to retrieve resident biometric credentials."
        )
      );
    }
  };


/* =========================================================
   REMOVE RESIDENT CREDENTIAL
========================================================= */

export const removeResidentBiometricCredential =
  async (
    residentId,
    credentialId
  ) => {

    if (!residentId || !credentialId) {
      throw new Error(
        "Resident ID and credential ID are required."
      );
    }

    try {

      const response =
        await api.delete(
          `${BIOMETRIC_BASE}/residents/${encodeURIComponent(
            residentId
          )}/credentials/${encodeURIComponent(
            credentialId
          )}`
        );

      return response.data;

    } catch (error) {

      throw new Error(
        getErrorMessage(
          error,
          "Unable to remove resident biometric credential."
        )
      );
    }
  };


/* =========================================================
   DEVICE NAME
========================================================= */

const getDeviceName = () => {

  if (
    typeof navigator ===
    "undefined"
  ) {
    return "TA-HOSS LOG Device";
  }

  const userAgent =
    navigator.userAgent || "";

  if (/Android/i.test(userAgent)) {
    return "Android Device";
  }

  if (/iPhone/i.test(userAgent)) {
    return "iPhone";
  }

  if (/iPad/i.test(userAgent)) {
    return "iPad";
  }

  if (/Windows/i.test(userAgent)) {
    return "Windows Device";
  }

  if (/Macintosh/i.test(userAgent)) {
    return "Mac Device";
  }

  return "TA-HOSS LOG Device";
};


/* =========================================================
   DEFAULT EXPORT
========================================================= */

const biometricService = {

  isWebAuthnSupported,

  isBiometricSecureContext,

  isPlatformAuthenticatorAvailable,

  checkBiometricAvailability,

  getRegistrationOptions,

  registerBiometric,

  getAuthenticationOptions,

  biometricLogin,

  getBiometricCredentials,

  getBiometricStatus,

  removeBiometricCredential,

  getResidentRegistrationOptions,

  enrollResidentBiometric,

  getResidentBiometricStatus,

  getResidentBiometricCredentials,

  removeResidentBiometricCredential,
};

export default biometricService;