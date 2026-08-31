const jwt = require("jsonwebtoken");

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const User =
  require("../models/User");

const Resident =
  require("../models/Resident");

const Biometric =
  require("../models/Biometric");


const {
  getRpName,
  getRpID,
  getOrigin,

  createWebAuthnUserID,

  createChallengeRecord,
  verifyChallenge,

  normalizeVerifiedCredential,
  serializeCredentialForStorage,
  deserializeCredentialFromStorage,

  sanitizeCredential,

  resolveProvider,

  buildExcludeCredentials,
  buildAllowCredentials,
} =
  require("../services/biometricService");


/* =========================================================
   GENERAL HELPERS
========================================================= */

const generateToken = (
  user
) => {

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      accountType:
        user.accountType,
    },

    process.env.JWT_SECRET,

    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        "7d",
    }
  );
};


const isValidObjectId = (
  id
) => {

  return Boolean(
    id &&
      typeof id === "string" &&
      /^[a-fA-F0-9]{24}$/.test(id)
  );
};


const getOwnerName = ({
  owner,
  ownerType,
}) => {

  if (
    ownerType === "user"
  ) {

    return (
      owner.fullname ||
      owner.username ||
      "TA-HOSS LOG User"
    );
  }


  return (
    owner.fullName ||
    [
      owner.firstName,
      owner.middleName,
      owner.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    "TA-HOSS Resident"
  );
};


const getOwnerUsername = ({
  owner,
  ownerType,
}) => {

  if (
    ownerType === "user"
  ) {

    return (
      owner.username ||
      String(owner._id)
    );
  }


  return (
    owner.residentId ||
    String(owner._id)
  );
};


const getOwnerCredentials =
  async ({
    ownerType,
    ownerId,
    activeOnly = true,
  }) => {

    const query = {
      ownerType,

      $or: [
        {
          owner: ownerId,
        },
        {
          user: ownerId,
        },
        {
          resident: ownerId,
        },
      ],
    };


    if (activeOnly) {
      query.status = "active";
    }


    return Biometric
      .find(query)
      .sort({
        createdAt: -1,
      });
  };


/* =========================================================
   CREDENTIAL EXTRACTION
========================================================= */

const extractCredential =
  (reqBody) => {

    if (!reqBody) {
      return null;
    }


    return (
      reqBody.credential ||
      reqBody.authenticationResponse ||
      reqBody.registrationResponse ||
      reqBody
    );
  };


/* =========================================================
   USER REGISTRATION OPTIONS
========================================================= */

const getUserRegistrationOptions =
  async (req, res) => {

    try {

      const user =
        req.user;


      if (!user) {

        return res.status(401).json({
          success: false,
          message:
            "Authentication is required.",
        });
      }


      const existingCredentials =
        await getOwnerCredentials({
          ownerType: "user",
          ownerId: user._id,
        });


      await Biometric.deleteMany({
        ownerType: "user",

        $or: [
          {
            owner: user._id,
          },
          {
            user: user._id,
          },
        ],

        status: "pending",
      });


      const challengeRecord =
        createChallengeRecord();


      const options =
        await generateRegistrationOptions({

          rpName:
            getRpName(),

          rpID:
            getRpID(),

          userName:
            getOwnerUsername({
              owner: user,
              ownerType: "user",
            }),

          userDisplayName:
            getOwnerName({
              owner: user,
              ownerType: "user",
            }),

          userID:
            createWebAuthnUserID(
              user._id
            ),

          challenge:
            challengeRecord.challenge,

          timeout: 60000,

          attestationType:
            "none",

          excludeCredentials:
            buildExcludeCredentials(
              existingCredentials
            ),

          authenticatorSelection: {

            residentKey:
              "preferred",

            /*
             * IMPORTANT:
             * We require actual user verification.
             */

            userVerification:
              "required",

            authenticatorAttachment:
              "platform",
          },

          supportedAlgorithmIDs: [
            -7,
            -257,
          ],
        });


      await Biometric.create({

        ownerType: "user",

        owner: user._id,

        user: user._id,

        provider: "webauthn",

        status: "pending",

        registrationChallenge: {

          hash:
            challengeRecord.challengeHash,

          expiresAt:
            challengeRecord.expiresAt,

          rawChallenge:
            challengeRecord.challenge,
        },
      });


      return res.status(200).json({

        success: true,

        message:
          "Biometric registration options generated successfully.",

        options,
      });

    } catch (error) {

      console.error(
        "User biometric registration options error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to generate biometric registration options.",
      });
    }
  };


/* =========================================================
   USER REGISTRATION VERIFICATION
========================================================= */

const verifyUserRegistration =
  async (req, res) => {

    try {

      const user =
        req.user;


      if (!user) {

        return res.status(401).json({
          success: false,
          message:
            "Authentication is required.",
        });
      }


      const credential =
        extractCredential(
          req.body
        );


      const deviceName =
        req.body?.deviceName;


      if (
        !credential ||
        (
          !credential.id &&
          !credential.rawId
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Biometric registration response payload is required.",
        });
      }


      const pendingBiometric =
        await Biometric.findOne({

          ownerType: "user",

          $or: [
            {
              owner: user._id,
            },
            {
              user: user._id,
            },
          ],

          status: "pending",

          "registrationChallenge.hash":
            {
              $exists: true,
            },

        }).sort({
          createdAt: -1,
        });


      if (!pendingBiometric) {

        return res.status(400).json({

          success: false,

          message:
            "No active biometric registration request was found.",
        });
      }


      const expectedChallenge =
        pendingBiometric
          .registrationChallenge
          ?.rawChallenge;


      const challengeValid =
        Boolean(
          expectedChallenge &&
          pendingBiometric
            .registrationChallenge
            ?.expiresAt &&
          new Date(
            pendingBiometric
              .registrationChallenge
              .expiresAt
          ).getTime() >
            Date.now()
        );


      if (!challengeValid) {

        await pendingBiometric.deleteOne();


        return res.status(400).json({

          success: false,

          message:
            "The biometric registration challenge is invalid or has expired.",
        });
      }


      let verification;


      try {

        verification =
          await verifyRegistrationResponse({

            response:
              credential,

            expectedChallenge,

            expectedOrigin:
              getOrigin(),

            expectedRPID:
              getRpID(),

            /*
             * Require actual device verification.
             */

            requireUserVerification:
              true,
          });

      } catch (error) {

        console.error(
          "SimpleWebAuthn user registration verification error:",
          error
        );


        await pendingBiometric.deleteOne();


        return res.status(400).json({

          success: false,

          message:
            "The biometric registration response could not be verified.",

          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
      }


      if (
        !verification.verified ||
        !verification.registrationInfo
      ) {

        await pendingBiometric.deleteOne();


        return res.status(400).json({

          success: false,

          message:
            "Biometric registration could not be verified.",
        });
      }


      const {
        credential:
          registeredCredential,

        credentialDeviceType,

        credentialBackedUp,
      } =
        verification.registrationInfo;


      const verifiedCredential =
        normalizeVerifiedCredential(

          {
            ...registeredCredential,

            deviceType:
              credentialDeviceType,

            backedUp:
              credentialBackedUp,
          },

          verification.registrationInfo
        );


      const serializedCredential =
        serializeCredentialForStorage(
          verifiedCredential
        );


      const duplicateCredential =
        await Biometric.findOne({
          credentialId:
            serializedCredential.credentialId,
        });


      if (duplicateCredential) {

        await pendingBiometric.deleteOne();


        return res.status(409).json({

          success: false,

          message:
            "This biometric authenticator is already registered.",
        });
      }


      pendingBiometric.credentialId =
        serializedCredential.credentialId;

      pendingBiometric.publicKey =
        serializedCredential.publicKey;

      pendingBiometric.counter =
        serializedCredential.counter;

      pendingBiometric.transports =
        registeredCredential.transports ||
        credential.transports ||
        [];

      pendingBiometric.deviceType =
        verifiedCredential.deviceType;

      pendingBiometric.backedUp =
        verifiedCredential.backedUp;

      pendingBiometric.provider =
        resolveProvider({
          authenticatorAttachment:
            credential.authenticatorAttachment,

          transports:
            pendingBiometric.transports,
        });

      pendingBiometric.deviceName =
        deviceName ||
        "TA-HOSS LOG Passkey";

      pendingBiometric.status =
        "active";

      pendingBiometric.enrolledAt =
        new Date();

      pendingBiometric.registrationChallenge =
        undefined;


      await pendingBiometric.save();


      user.biometricEnabled =
        true;

      user.biometricEnabledAt =
        new Date();


      await user.save();


      return res.status(201).json({

        success: true,

        message:
          "Biometric login enabled successfully.",

        biometric:
          sanitizeCredential(
            pendingBiometric
          ),
      });

    } catch (error) {

      console.error(
        "User biometric registration verification error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to verify biometric registration.",
      });
    }
  };


/* =========================================================
   RESIDENT REGISTRATION OPTIONS
========================================================= */

const getResidentRegistrationOptions =
  async (req, res) => {

    try {

      const id =
        req.params.residentId ||
        req.params.id;


      if (!isValidObjectId(id)) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid resident ID.",
        });
      }


      const resident =
        await Resident.findOne({

          _id: id,

          deletedAt: null,

          status: {
            $ne: "deleted",
          },
        });


      if (!resident) {

        return res.status(404).json({

          success: false,

          message:
            "Resident not found.",
        });
      }


      const existingCredentials =
        await getOwnerCredentials({

          ownerType:
            "resident",

          ownerId:
            resident._id,
        });


      await Biometric.deleteMany({

        ownerType:
          "resident",

        $or: [
          {
            owner:
              resident._id,
          },
          {
            resident:
              resident._id,
          },
        ],

        status:
          "pending",
      });


      const challengeRecord =
        createChallengeRecord();


      const options =
        await generateRegistrationOptions({

          rpName:
            getRpName(),

          rpID:
            getRpID(),

          userName:
            getOwnerUsername({
              owner:
                resident,

              ownerType:
                "resident",
            }),

          userDisplayName:
            getOwnerName({
              owner:
                resident,

              ownerType:
                "resident",
            }),

          userID:
            createWebAuthnUserID(
              resident._id
            ),

          challenge:
            challengeRecord.challenge,

          timeout:
            60000,

          attestationType:
            "none",

          excludeCredentials:
            buildExcludeCredentials(
              existingCredentials
            ),

          authenticatorSelection: {

            residentKey:
              "preferred",

            userVerification:
              "required",

            authenticatorAttachment:
              "platform",
          },

          supportedAlgorithmIDs: [
            -7,
            -257,
          ],
        });


      await Biometric.create({

        ownerType:
          "resident",

        owner:
          resident._id,

        resident:
          resident._id,

        provider:
          "webauthn",

        status:
          "pending",

        registrationChallenge: {

          hash:
            challengeRecord.challengeHash,

          expiresAt:
            challengeRecord.expiresAt,

          rawChallenge:
            challengeRecord.challenge,
        },
      });


      return res.status(200).json({

        success: true,

        message:
          "Resident biometric registration options generated successfully.",

        resident: {

          id:
            resident._id,

          residentId:
            resident.residentId,

          fullName:
            resident.fullName,
        },

        options,
      });

    } catch (error) {

      console.error(
        "Resident biometric registration options error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to generate resident biometric registration options.",
      });
    }
  };


/* =========================================================
   RESIDENT REGISTRATION VERIFICATION
========================================================= */

const verifyResidentRegistration =
  async (req, res) => {

    try {

      const id =
        req.params.residentId ||
        req.params.id;


      if (!isValidObjectId(id)) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid resident ID.",
        });
      }


      const credential =
        extractCredential(
          req.body
        );


      const deviceName =
        req.body?.deviceName;


      if (
        !credential ||
        (
          !credential.id &&
          !credential.rawId
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Biometric registration response payload is required.",
        });
      }


      const resident =
        await Resident.findOne({

          _id: id,

          deletedAt: null,

          status: {
            $ne: "deleted",
          },
        });


      if (!resident) {

        return res.status(404).json({

          success: false,

          message:
            "Resident not found.",
        });
      }


      const pendingBiometric =
        await Biometric.findOne({

          ownerType:
            "resident",

          $or: [
            {
              owner:
                resident._id,
            },
            {
              resident:
                resident._id,
            },
          ],

          status:
            "pending",

          "registrationChallenge.hash":
            {
              $exists: true,
            },

        }).sort({
          createdAt:
            -1,
        });


      if (!pendingBiometric) {

        return res.status(400).json({

          success: false,

          message:
            "No active resident biometric registration was found.",
        });
      }


      const expectedChallenge =
        pendingBiometric
          .registrationChallenge
          ?.rawChallenge;


      const challengeValid =
        Boolean(
          expectedChallenge &&
          pendingBiometric
            .registrationChallenge
            ?.expiresAt &&
          new Date(
            pendingBiometric
              .registrationChallenge
              .expiresAt
          ).getTime() >
            Date.now()
        );


      if (!challengeValid) {

        await pendingBiometric.deleteOne();


        return res.status(400).json({

          success: false,

          message:
            "The biometric registration challenge is invalid or has expired.",
        });
      }


      let verification;


      try {

        verification =
          await verifyRegistrationResponse({

            response:
              credential,

            expectedChallenge,

            expectedOrigin:
              getOrigin(),

            expectedRPID:
              getRpID(),

            requireUserVerification:
              true,
          });

      } catch (error) {

        console.error(
          "SimpleWebAuthn resident registration verification error:",
          error
        );


        await pendingBiometric.deleteOne();


        return res.status(400).json({

          success: false,

          message:
            "The resident biometric registration response could not be verified.",

          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
      }


      if (
        !verification.verified ||
        !verification.registrationInfo
      ) {

        await pendingBiometric.deleteOne();


        return res.status(400).json({

          success: false,

          message:
            "Resident biometric registration could not be verified.",
        });
      }


      const {
        credential:
          registeredCredential,

        credentialDeviceType,

        credentialBackedUp,
      } =
        verification.registrationInfo;


      const verifiedCredential =
        normalizeVerifiedCredential(

          {
            ...registeredCredential,

            deviceType:
              credentialDeviceType,

            backedUp:
              credentialBackedUp,
          },

          verification.registrationInfo
        );


      const serializedCredential =
        serializeCredentialForStorage(
          verifiedCredential
        );


      const duplicateCredential =
        await Biometric.findOne({

          credentialId:
            serializedCredential.credentialId,
        });


      if (duplicateCredential) {

        await pendingBiometric.deleteOne();


        return res.status(409).json({

          success: false,

          message:
            "This biometric authenticator is already registered.",
        });
      }


      pendingBiometric.credentialId =
        serializedCredential.credentialId;

      pendingBiometric.publicKey =
        serializedCredential.publicKey;

      pendingBiometric.counter =
        serializedCredential.counter;

      pendingBiometric.transports =
        registeredCredential.transports ||
        credential.transports ||
        [];

      pendingBiometric.deviceType =
        verifiedCredential.deviceType;

      pendingBiometric.backedUp =
        verifiedCredential.backedUp;

      pendingBiometric.provider =
        resolveProvider({

          authenticatorAttachment:
            credential.authenticatorAttachment,

          transports:
            pendingBiometric.transports,
        });

      pendingBiometric.deviceName =
        deviceName ||
        "Resident Biometric";

      pendingBiometric.status =
        "active";

      pendingBiometric.enrolledAt =
        new Date();

      pendingBiometric.registrationChallenge =
        undefined;


      await pendingBiometric.save();


      if (!resident.biometric) {
        resident.biometric = {};
      }


      resident.biometric.enrolled =
        true;

      resident.biometric.provider =
        pendingBiometric.provider;

      resident.biometric.templateReference =
        String(
          pendingBiometric._id
        );

      resident.biometric.enrolledAt =
        pendingBiometric.enrolledAt;


      await resident.save();


      return res.status(201).json({

        success: true,

        message:
          "Resident biometric enrollment completed successfully.",

        resident: {

          id:
            resident._id,

          residentId:
            resident.residentId,

          fullName:
            resident.fullName,

          biometric:
            resident.biometric,
        },

        biometric:
          sanitizeCredential(
            pendingBiometric
          ),
      });

    } catch (error) {

      console.error(
        "Resident biometric registration verification error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to complete resident biometric enrollment.",
      });
    }
  };


/* =========================================================
   BIOMETRIC LOGIN OPTIONS
========================================================= */

const getLoginOptions =
  async (req, res) => {

    try {

      const identifier =
        typeof req.body?.identifier ===
        "string"
          ? req.body.identifier.trim()
          : "";


      let user = null;

      let credentials = [];


      /* =====================================================
         IDENTIFIED LOGIN
      ===================================================== */

      if (identifier) {

        const normalized =
          identifier.toLowerCase();


        user =
          await User.findOne({

            deletedAt:
              null,

            isActive:
              true,

            $or: [

              {
                username:
                  normalized,
              },

              {
                email:
                  normalized,
              },

              {
                phone:
                  identifier,
              },
            ],
          });


        if (!user) {

          return res.status(404).json({

            success: false,

            message:
              "No active user account was found.",
          });
        }


        if (
          !user.biometricEnabled
        ) {

          return res.status(400).json({

            success: false,

            message:
              "Biometric login is not enabled for this account.",
          });
        }


        credentials =
          await getOwnerCredentials({

            ownerType:
              "user",

            ownerId:
              user._id,

            activeOnly:
              true,
          });

      }


      /* =====================================================
         DISCOVERABLE LOGIN
      ===================================================== */

      else {

        /*
         * This permits passkey discovery when supported.
         */

        credentials =
          await Biometric.find({

            ownerType:
              "user",

            status:
              "active",
          });
      }


      if (!credentials.length) {

        return res.status(400).json({

          success: false,

          message:
            "No biometric credentials are available for this account.",
        });
      }


      const challengeRecord =
        createChallengeRecord();


      await Biometric.updateMany(

        {
          _id: {
            $in:
              credentials.map(
                (credential) =>
                  credential._id
              ),
          },
        },

        {
          $set: {

            authenticationChallenge: {

              hash:
                challengeRecord.challengeHash,

              expiresAt:
                challengeRecord.expiresAt,

              rawChallenge:
                challengeRecord.challenge,
            },
          },
        }
      );


      const options =
        await generateAuthenticationOptions({

          rpID:
            getRpID(),

          challenge:
            challengeRecord.challenge,

          timeout:
            60000,

          /*
           * IMPORTANT:
           *
           * The biometric/PIN/device verification
           * must actually happen.
           */

          userVerification:
            "required",

          allowCredentials:
            buildAllowCredentials(
              credentials
            ),
        });


      return res.status(200).json({

        success: true,

        message:
          "Biometric login options generated successfully.",

        userIdentified:
          Boolean(user),

        options,
      });

    } catch (error) {

      console.error(
        "Biometric login options error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to generate biometric login options.",
      });
    }
  };


/* =========================================================
   BIOMETRIC LOGIN VERIFICATION
========================================================= */

const verifyBiometricLogin =
  async (req, res) => {

    try {

      const credential =
        extractCredential(
          req.body
        );


      if (
        !credential ||
        !credential.id
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Biometric authentication credential is required.",
        });
      }


      const biometric =
        await Biometric.findOne({

          credentialId:
            credential.id,

          ownerType:
            "user",

          status:
            "active",
        });


      if (!biometric) {

        return res.status(401).json({

          success: false,

          message:
            "Biometric credential was not recognized.",
        });
      }


      const expectedChallenge =
        biometric
          .authenticationChallenge
          ?.rawChallenge;


      const challengeValid =
        Boolean(
          expectedChallenge &&

          biometric
            .authenticationChallenge
            ?.expiresAt &&

          new Date(
            biometric
              .authenticationChallenge
              .expiresAt
          ).getTime() >
            Date.now()
        );


      if (!challengeValid) {

        biometric.authenticationChallenge =
          undefined;

        await biometric.save();


        return res.status(400).json({

          success: false,

          message:
            "The biometric authentication challenge is invalid or has expired.",
        });
      }


      const userId =
        biometric.user ||
        biometric.owner;


      const user =
        await User.findOne({

          _id:
            userId,

          deletedAt:
            null,

          isActive:
            true,
        });


      if (!user) {

        return res.status(401).json({

          success: false,

          message:
            "The associated user account is unavailable.",
        });
      }


      /*
       * If an identifier was supplied, make sure it matches
       * the credential's actual account.
       */

      const identifier =
        typeof req.body?.identifier ===
        "string"
          ? req.body.identifier.trim()
          : "";


      if (identifier) {

        const normalized =
          identifier.toLowerCase();


        const matches =
          user.username ===
            normalized ||

          user.email ===
            normalized ||

          user.phone ===
            identifier;


        if (!matches) {

          biometric.authenticationChallenge =
            undefined;

          await biometric.save();


          return res.status(401).json({

            success: false,

            message:
              "The biometric credential does not belong to the supplied account.",
          });
        }
      }


      const storedCredential =
        deserializeCredentialFromStorage(
          biometric
        );


      let verification;


      try {

        verification =
          await verifyAuthenticationResponse({

            response:
              credential,

            expectedChallenge,

            expectedOrigin:
              getOrigin(),

            expectedRPID:
              getRpID(),

            credential:
              storedCredential,

            /*
             * CRITICAL:
             *
             * Require actual user verification.
             */

            requireUserVerification:
              true,
          });

      } catch (error) {

        console.error(
          "SimpleWebAuthn authentication verification error:",
          error
        );


        biometric.authenticationChallenge =
          undefined;

        await biometric.save();


        return res.status(401).json({

          success: false,

          message:
            "Biometric authentication failed.",

          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
      }


      /*
       * Challenge is single-use.
       */

      biometric.authenticationChallenge =
        undefined;


      if (
        !verification.verified
      ) {

        await biometric.save();


        return res.status(401).json({

          success: false,

          message:
            "Biometric authentication failed.",
        });
      }


      /*
       * Make sure user verification was actually performed.
       */

      const userVerified =
        verification
          .authenticationInfo
          ?.userVerified;


      if (
        userVerified !== true
      ) {

        await biometric.save();


        return res.status(401).json({

          success: false,

          message:
            "Device biometric verification was not completed.",
        });
      }


      /*
       * Update authenticator counter.
       */

      biometric.counter =
        verification
          .authenticationInfo
          ?.newCounter ??
        biometric.counter;


      biometric.lastUsedAt =
        new Date();


      await biometric.save();


      /*
       * Update user login information.
       */

      user.lastLoginAt =
        new Date();

      user.lastLoginIP =
        req.ip ||
        req.headers[
          "x-forwarded-for"
        ] ||
        null;


      await user.save();


      /*
       * Generate JWT.
       */

      const token =
        generateToken(user);


      return res.status(200).json({

        success: true,

        message:
          "Biometric login successful.",

        token,

        user: {

          id:
            user._id,

          fullname:
            user.fullname,

          firstName:
            user.firstName,

          middleName:
            user.middleName,

          lastName:
            user.lastName,

          username:
            user.username,

          email:
            user.email,

          phone:
            user.phone,

          role:
            user.role,

          accountType:
            user.accountType,

          accountStatus:
            user.accountStatus,

          photo:
            user.photo,

          biometricEnabled:
            user.biometricEnabled,
        },
      });

    } catch (error) {

      console.error(
        "Biometric login verification error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to complete biometric login.",
      });
    }
  };


/* =========================================================
   USER CREDENTIALS
========================================================= */

const getUserCredentials =
  async (req, res) => {

    try {

      const credentials =
        await getOwnerCredentials({

          ownerType:
            "user",

          ownerId:
            req.user._id,

          activeOnly:
            false,
        });


      return res.status(200).json({

        success: true,

        biometricEnabled:
          Boolean(
            req.user.biometricEnabled
          ),

        credentials:
          credentials.map(
            sanitizeCredential
          ),
      });

    } catch (error) {

      console.error(
        "Get user biometric credentials error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to retrieve biometric credentials.",
      });
    }
  };


/* =========================================================
   RESIDENT CREDENTIALS
========================================================= */

const getResidentCredentials =
  async (req, res) => {

    try {

      const id =
        req.params.residentId ||
        req.params.id;


      if (!isValidObjectId(id)) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid resident ID.",
        });
      }


      const resident =
        await Resident.findOne({

          _id:
            id,

          deletedAt:
            null,

          status: {
            $ne:
              "deleted",
          },
        });


      if (!resident) {

        return res.status(404).json({

          success: false,

          message:
            "Resident not found.",
        });
      }


      const credentials =
        await getOwnerCredentials({

          ownerType:
            "resident",

          ownerId:
            resident._id,

          activeOnly:
            false,
        });


      return res.status(200).json({

        success: true,

        resident: {

          id:
            resident._id,

          residentId:
            resident.residentId,

          fullName:
            resident.fullName,

          biometric:
            resident.biometric,
        },

        credentials:
          credentials.map(
            sanitizeCredential
          ),
      });

    } catch (error) {

      console.error(
        "Get resident biometric credentials error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to retrieve resident biometric credentials.",
      });
    }
  };


/* =========================================================
   REMOVE USER CREDENTIAL
========================================================= */

const removeUserCredential =
  async (req, res) => {

    try {

      const biometric =
        await Biometric.findOne({

          _id:
            req.params.credentialId,

          ownerType:
            "user",

          $or: [

            {
              owner:
                req.user._id,
            },

            {
              user:
                req.user._id,
            },
          ],
        });


      if (!biometric) {

        return res.status(404).json({

          success: false,

          message:
            "Biometric credential not found.",
        });
      }


      await biometric.deleteOne();


      const remainingCredentials =
        await Biometric.countDocuments({

          ownerType:
            "user",

          $or: [

            {
              owner:
                req.user._id,
            },

            {
              user:
                req.user._id,
            },
          ],

          status:
            "active",
        });


      if (
        remainingCredentials === 0
      ) {

        req.user.biometricEnabled =
          false;

        req.user.biometricEnabledAt =
          null;

        await req.user.save();
      }


      return res.status(200).json({

        success: true,

        message:
          "Biometric credential removed successfully.",

        biometricEnabled:
          remainingCredentials > 0,
      });

    } catch (error) {

      console.error(
        "Remove user biometric credential error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to remove biometric credential.",
      });
    }
  };


/* =========================================================
   REMOVE RESIDENT CREDENTIAL
========================================================= */

const removeResidentCredential =
  async (req, res) => {

    try {

      const residentId =
        req.params.residentId ||
        req.params.id;

      const credentialId =
        req.params.credentialId;


      if (
        !isValidObjectId(
          residentId
        ) ||
        !isValidObjectId(
          credentialId
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid resident or credential ID.",
        });
      }


      const resident =
        await Resident.findOne({

          _id:
            residentId,

          deletedAt:
            null,

          status: {
            $ne:
              "deleted",
          },
        });


      if (!resident) {

        return res.status(404).json({

          success: false,

          message:
            "Resident not found.",
        });
      }


      const biometric =
        await Biometric.findOne({

          _id:
            credentialId,

          ownerType:
            "resident",

          $or: [

            {
              owner:
                resident._id,
            },

            {
              resident:
                resident._id,
            },
          ],
        });


      if (!biometric) {

        return res.status(404).json({

          success: false,

          message:
            "Resident biometric credential not found.",
        });
      }


      await biometric.deleteOne();


      const remainingCredentials =
        await Biometric.countDocuments({

          ownerType:
            "resident",

          $or: [

            {
              owner:
                resident._id,
            },

            {
              resident:
                resident._id,
            },
          ],

          status:
            "active",
        });


      if (
        remainingCredentials === 0
      ) {

        if (!resident.biometric) {
          resident.biometric = {};
        }


        resident.biometric.enrolled =
          false;

        resident.biometric.provider =
          null;

        resident.biometric.templateReference =
          null;

        resident.biometric.enrolledAt =
          null;

      } else {

        const remainingBiometric =
          await Biometric.findOne({

            ownerType:
              "resident",

            $or: [

              {
                owner:
                  resident._id,
              },

              {
                resident:
                  resident._id,
              },
            ],

            status:
              "active",

          }).sort({
            enrolledAt:
              -1,
          });


        if (!resident.biometric) {
          resident.biometric = {};
        }


        resident.biometric.enrolled =
          true;

        resident.biometric.provider =
          remainingBiometric.provider;

        resident.biometric.templateReference =
          String(
            remainingBiometric._id
          );

        resident.biometric.enrolledAt =
          remainingBiometric.enrolledAt;
      }


      await resident.save();


      return res.status(200).json({

        success: true,

        message:
          "Resident biometric credential removed successfully.",

        biometricEnrolled:
          remainingCredentials > 0,
      });

    } catch (error) {

      console.error(
        "Remove resident biometric credential error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to remove resident biometric credential.",
      });
    }
  };


/* =========================================================
   USER BIOMETRIC STATUS
========================================================= */

const getBiometricStatus =
  async (req, res) => {

    try {

      const credentials =
        await Biometric.find({

          ownerType:
            "user",

          $or: [

            {
              owner:
                req.user._id,
            },

            {
              user:
                req.user._id,
            },
          ],

          status:
            "active",

        }).sort({
          lastUsedAt:
            -1,
        });


      return res.status(200).json({

        success: true,

        biometricEnabled:
          Boolean(
            req.user.biometricEnabled
          ),

        credentials:
          credentials.length,

        lastUsedAt:
          credentials[0]
            ?.lastUsedAt ||
          null,
      });

    } catch (error) {

      console.error(
        "Get biometric status error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to retrieve biometric status.",
      });
    }
  };


/* =========================================================
   RESIDENT BIOMETRIC STATUS
========================================================= */

const getResidentBiometricStatus =
  async (req, res) => {

    try {

      const id =
        req.params.residentId ||
        req.params.id;


      if (!isValidObjectId(id)) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid resident ID.",
        });
      }


      const resident =
        await Resident.findOne({

          _id:
            id,

          deletedAt:
            null,

          status: {
            $ne:
              "deleted",
          },
        });


      if (!resident) {

        return res.status(404).json({

          success: false,

          message:
            "Resident not found.",
        });
      }


      const credentials =
        await Biometric.find({

          ownerType:
            "resident",

          $or: [

            {
              owner:
                resident._id,
            },

            {
              resident:
                resident._id,
            },
          ],

          status:
            "active",

        }).sort({
          lastUsedAt:
            -1,
        });


      return res.status(200).json({

        success: true,

        biometricEnrolled:
          credentials.length > 0,

        credentials:
          credentials.length,

        lastUsedAt:
          credentials[0]
            ?.lastUsedAt ||
          null,

        resident: {

          id:
            resident._id,

          residentId:
            resident.residentId,

          fullName:
            resident.fullName,

          biometric:
            resident.biometric,
        },
      });

    } catch (error) {

      console.error(
        "Get resident biometric status error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to retrieve resident biometric status.",
      });
    }
  };


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

  getUserRegistrationOptions,
  verifyUserRegistration,

  getUserCredentials,
  removeUserCredential,

  getResidentRegistrationOptions,
  verifyResidentRegistration,

  getResidentCredentials,
  removeResidentCredential,

  getResidentBiometricStatus,

  getLoginOptions,
  verifyBiometricLogin,

  getBiometricStatus,


  /* -----------------------------------------------
     BACKWARD COMPATIBILITY ALIASES
  ----------------------------------------------- */

  enrollResidentBiometric:
    getResidentRegistrationOptions,

  getRegistrationOptions:
    getUserRegistrationOptions,

  verifyRegistration:
    verifyUserRegistration,

  verifyLogin:
    verifyBiometricLogin,

  getResidentBiometrics:
    getResidentCredentials,

  removeResidentBiometric:
    removeResidentCredential,

  listCredentials:
    getUserCredentials,

  removeCredential:
    removeUserCredential,
};