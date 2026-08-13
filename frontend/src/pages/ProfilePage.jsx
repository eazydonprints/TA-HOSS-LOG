import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./ProfilePage.css";

/*
|--------------------------------------------------------------------------
| Environment Variables & Config
|--------------------------------------------------------------------------
*/

const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
  import.meta.env.REACT_APP_CLOUDINARY_CLOUD_NAME ||
  "dvz9ootjn";

const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
  import.meta.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET ||
  "u9vv7mji"; // Replace "unsigned_preset" with your actual Cloudinary Unsigned Upload Preset name if created

const CLOUDINARY_UPLOAD_URL = CLOUDINARY_CLOUD_NAME
  ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
  : null;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getInitials = (fullname = "") => {
  const names = fullname.trim().split(/\s+/).filter(Boolean);

  if (!names.length) return "U";

  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }

  return (
    names[0].charAt(0) +
    names[names.length - 1].charAt(0)
  ).toUpperCase();
};

const formatRole = (role) => {
  if (!role) return "—";

  return role
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

const getPasswordStrength = (password) => {
  if (!password) {
    return {
      score: 0,
      label: "",
      percentage: 0,
      checks: {
        length: false,
        lowercase: false,
        uppercase: false,
        number: false,
        special: false,
      },
    };
  }

  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  const labels = {
    0: "Very Weak",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
    5: "Very Strong",
  };

  return {
    score,
    label: labels[score],
    percentage: score * 20,
    checks,
  };
};

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

const ProfilePage = () => {
  const {
    user,
    loading: authLoading,
    updateProfile,
    removeProfilePhoto,
    changePassword,
    refreshProfile,
  } = useAuth();

  const fileInputRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Profile State
  |--------------------------------------------------------------------------
  */

  const [fullname, setFullname] = useState("");

  const [profileLoading, setProfileLoading] =
    useState(false);

  const [photoLoading, setPhotoLoading] =
    useState(false);

  const [removingPhoto, setRemovingPhoto] =
    useState(false);

  const [savingName, setSavingName] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Photo Preview State
  |--------------------------------------------------------------------------
  */

  const [previewUrl, setPreviewUrl] =
    useState(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Password State
  |--------------------------------------------------------------------------
  */

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Feedback State
  |--------------------------------------------------------------------------
  */

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Confirmation State
  |--------------------------------------------------------------------------
  */

  const [showRemoveConfirmation, setShowRemoveConfirmation] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Password Strength
  |--------------------------------------------------------------------------
  */

  const passwordStrength =
    getPasswordStrength(newPassword);

  /*
  |--------------------------------------------------------------------------
  | Load User Into Form
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (user) {
      setFullname(user.fullname || "");
    }
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | Cleanup Preview URL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /*
  |--------------------------------------------------------------------------
  | Clear Feedback
  |--------------------------------------------------------------------------
  */

  const clearFeedback = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Select Image
  |--------------------------------------------------------------------------
  */

  const handlePhotoSelect = (event) => {
    clearFeedback();

    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please select a valid image file."
      );

      event.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setErrorMessage(
        "Profile photo must not exceed 5MB."
      );

      event.target.value = "";
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const localPreview =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(localPreview);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const cancelPhotoSelection = () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Upload To Cloudinary
  |--------------------------------------------------------------------------
  */

  const uploadToCloudinary = async (file) => {
    if (!CLOUDINARY_CLOUD_NAME) {
      throw new Error(
        "Cloudinary cloud name is not configured. Check your .env file."
      );
    }

    if (!CLOUDINARY_UPLOAD_PRESET) {
      throw new Error(
        "Cloudinary upload preset is not configured. Check your .env file."
      );
    }

    if (!CLOUDINARY_UPLOAD_URL) {
      throw new Error(
        "Cloudinary upload URL could not be created."
      );
    }

    const formData = new FormData();

    formData.append("file", file);

    formData.append(
      "upload_preset",
      CLOUDINARY_UPLOAD_PRESET
    );

    formData.append(
      "folder",
      "ta-hoss/profile-photos"
    );

    const response = await fetch(
      CLOUDINARY_UPLOAD_URL,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error?.message ||
          "Cloudinary upload failed."
      );
    }

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Save Profile Photo
  |--------------------------------------------------------------------------
  */

  const handleUploadPhoto = async () => {
    if (!selectedFile) {
      return;
    }

    clearFeedback();

    setPhotoLoading(true);

    try {
      const cloudinaryResult =
        await uploadToCloudinary(selectedFile);

      await updateProfile({
        photo: cloudinaryResult.secureUrl,
        photoPublicId: cloudinaryResult.publicId,
      });

      setSuccessMessage(
        "Profile photo updated successfully."
      );

      cancelPhotoSelection();
    } catch (error) {
      console.error(
        "PROFILE PHOTO UPLOAD ERROR:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to update profile photo."
      );
    } finally {
      setPhotoLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Remove Profile Photo
  |--------------------------------------------------------------------------
  */

  const handleRemovePhoto = async () => {
    clearFeedback();

    setRemovingPhoto(true);

    try {
      await removeProfilePhoto();

      setSuccessMessage(
        "Profile photo removed successfully."
      );

      setShowRemoveConfirmation(false);
    } catch (error) {
      console.error(
        "REMOVE PROFILE PHOTO ERROR:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to remove profile photo."
      );
    } finally {
      setRemovingPhoto(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Update Full Name
  |--------------------------------------------------------------------------
  */

  const handleSaveName = async (event) => {
    event.preventDefault();

    clearFeedback();

    const trimmedName = fullname.trim();

    if (trimmedName.length < 2) {
      setErrorMessage(
        "Full name must contain at least 2 characters."
      );

      return;
    }

    if (
      trimmedName ===
      (user?.fullname || "").trim()
    ) {
      setSuccessMessage(
        "No changes were made to your name."
      );

      return;
    }

    setSavingName(true);

    try {
      await updateProfile({
        fullname: trimmedName,
      });

      setSuccessMessage(
        "Your full name has been updated successfully."
      );
    } catch (error) {
      console.error(
        "UPDATE FULL NAME ERROR:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to update your full name."
      );
    } finally {
      setSavingName(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Change Password
  |--------------------------------------------------------------------------
  */

  const handleChangePassword = async (event) => {
    event.preventDefault();

    clearFeedback();

    if (!currentPassword) {
      setErrorMessage(
        "Please enter your current password."
      );

      return;
    }

    if (!newPassword) {
      setErrorMessage(
        "Please enter a new password."
      );

      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage(
        "New password must contain at least 8 characters."
      );

      return;
    }

    if (!confirmPassword) {
      setErrorMessage(
        "Please confirm your new password."
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        "New password and confirmation password do not match."
      );

      return;
    }

    if (passwordStrength.score < 3) {
      setErrorMessage(
        "Please choose a stronger password."
      );

      return;
    }

    setChangingPassword(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccessMessage(
        "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "CHANGE PASSWORD ERROR:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Refresh Profile
  |--------------------------------------------------------------------------
  */

  const handleRefreshProfile = async () => {
    clearFeedback();

    setProfileLoading(true);

    try {
      await refreshProfile();

      setSuccessMessage(
        "Profile information refreshed."
      );
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Unable to refresh profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="profile-page-loading">
        <div className="profile-spinner" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-empty-state">
        <h2>Profile unavailable</h2>

        <p>
          We could not load your account information.
        </p>
      </div>
    );
  }

  const displayedPhoto =
    previewUrl || user.photo;

  const accountIsActive =
    user.isActive === true;

  return (
    <div className="profile-page">
      <div className="profile-container">

        <div className="profile-page-header">
          <div>
            <h1>My Profile</h1>

            <p>
              Manage your personal information,
              profile photo and account security.
            </p>
          </div>

          <button
            type="button"
            className="profile-refresh-button"
            onClick={handleRefreshProfile}
            disabled={profileLoading}
          >
            {profileLoading
              ? "Refreshing..."
              : "Refresh Profile"}
          </button>
        </div>

        {successMessage && (
          <div className="profile-alert profile-alert-success">
            <span className="profile-alert-icon">
              ✓
            </span>

            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              aria-label="Close success message"
            >
              ×
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="profile-alert profile-alert-error">
            <span className="profile-alert-icon">
              !
            </span>

            <span>{errorMessage}</span>

            <button
              type="button"
              onClick={() =>
                setErrorMessage("")
              }
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        )}

        <section className="profile-card">

          <div className="profile-card-header">
            <div>
              <h2>Profile Information</h2>

              <p>
                Update your profile photo and
                personal information.
              </p>
            </div>
          </div>

          <div className="profile-card-body">

            <div className="profile-photo-section">

              <div className="profile-photo-wrapper">

                {displayedPhoto ? (
                  <img
                    src={displayedPhoto}
                    alt={`${user.fullname || "User"} profile`}
                    className="profile-photo"
                  />
                ) : (
                  <div className="profile-photo-placeholder">
                    {getInitials(user.fullname)}
                  </div>
                )}

                {photoLoading && (
                  <div className="profile-photo-overlay">
                    <div className="profile-spinner" />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                hidden
              />

              <div className="profile-photo-actions">

                <button
                  type="button"
                  className="profile-button profile-button-primary"
                  onClick={openFilePicker}
                  disabled={photoLoading}
                >
                  {user.photo
                    ? "Replace Photo"
                    : "Upload Photo"}
                </button>

                {user.photo && !selectedFile && (
                  <button
                    type="button"
                    className="profile-button profile-button-danger-outline"
                    onClick={() =>
                      setShowRemoveConfirmation(true)
                    }
                    disabled={removingPhoto}
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {selectedFile && (
                <div className="profile-photo-preview-actions">

                  <p>
                    Previewing:{" "}
                    <strong>
                      {selectedFile.name}
                    </strong>
                  </p>

                  <div>
                    <button
                      type="button"
                      className="profile-button profile-button-primary"
                      onClick={handleUploadPhoto}
                      disabled={photoLoading}
                    >
                      {photoLoading
                        ? "Uploading..."
                        : "Save Photo"}
                    </button>

                    <button
                      type="button"
                      className="profile-button profile-button-secondary"
                      onClick={cancelPhotoSelection}
                      disabled={photoLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <small className="profile-photo-help">
                JPG, PNG or WebP. Maximum size: 5MB.
              </small>
            </div>

            <div className="profile-details-section">

              <form
                onSubmit={handleSaveName}
                className="profile-form"
              >

                <div className="profile-form-group">

                  <label htmlFor="fullname">
                    Full Name
                  </label>

                  <input
                    id="fullname"
                    type="text"
                    value={fullname}
                    onChange={(event) =>
                      setFullname(
                        event.target.value
                      )
                    }
                    placeholder="Enter your full name"
                    disabled={savingName}
                    autoComplete="name"
                  />
                </div>

                <div className="profile-form-group">

                  <label htmlFor="username">
                    Username
                  </label>

                  <input
                    id="username"
                    type="text"
                    value={user.username || ""}
                    disabled
                    readOnly
                  />

                  <small>
                    Username cannot be changed
                    from your profile.
                  </small>
                </div>

                <div className="profile-form-row">

                  <div className="profile-form-group">

                    <label htmlFor="role">
                      Role
                    </label>

                    <input
                      id="role"
                      type="text"
                      value={formatRole(
                        user.role
                      )}
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="profile-form-group">

                    <label>
                      Account Status
                    </label>

                    <div
                      className={`profile-status ${
                        accountIsActive
                          ? "profile-status-active"
                          : "profile-status-inactive"
                      }`}
                    >
                      <span className="profile-status-dot" />

                      {accountIsActive
                        ? "Active"
                        : "Suspended"}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="profile-button profile-button-primary"
                  disabled={savingName}
                >
                  {savingName
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="profile-card profile-security-card">

          <div className="profile-card-header">
            <div>
              <h2>Password & Security</h2>

              <p>
                Change your password to keep your
                TA-HOSS LOG account secure.
              </p>
            </div>
          </div>

          <div className="profile-card-body">

            <form
              onSubmit={handleChangePassword}
              className="profile-password-form"
            >

              <div className="profile-form-group">

                <label htmlFor="currentPassword">
                  Current Password
                </label>

                <div className="profile-password-input">

                  <input
                    id="currentPassword"
                    type={
                      showCurrentPassword
                        ? "text"
                        : "password"
                    }
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    disabled={changingPassword}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showCurrentPassword
                        ? "Hide current password"
                        : "Show current password"
                    }
                  >
                    {showCurrentPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>
              </div>

              <div className="profile-form-group">

                <label htmlFor="newPassword">
                  New Password
                </label>

                <div className="profile-password-input">

                  <input
                    id="newPassword"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                    disabled={changingPassword}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                  >
                    {showNewPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>

                {newPassword && (
                  <div className="password-strength">

                    <div className="password-strength-header">

                      <span>
                        Password strength
                      </span>

                      <strong>
                        {passwordStrength.label}
                      </strong>
                    </div>

                    <div className="password-strength-bar">

                      <div
                        className="password-strength-progress"
                        style={{
                          width: `${passwordStrength.percentage}%`,
                        }}
                      />
                    </div>

                    <div className="password-requirements">

                      <span
                        className={
                          passwordStrength.checks
                            .length
                            ? "requirement-met"
                            : ""
                        }
                      >
                        ✓ At least 8 characters
                      </span>

                      <span
                        className={
                          passwordStrength.checks
                            .uppercase
                            ? "requirement-met"
                            : ""
                        }
                      >
                        ✓ Uppercase letter
                      </span>

                      <span
                        className={
                          passwordStrength.checks
                            .lowercase
                            ? "requirement-met"
                            : ""
                        }
                      >
                        ✓ Lowercase letter
                      </span>

                      <span
                        className={
                          passwordStrength.checks
                            .number
                            ? "requirement-met"
                            : ""
                        }
                      >
                        ✓ Number
                      </span>

                      <span
                        className={
                          passwordStrength.checks
                            .special
                            ? "requirement-met"
                            : ""
                        }
                      >
                        ✓ Special character
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="profile-form-group">

                <label htmlFor="confirmPassword">
                  Confirm New Password
                </label>

                <div className="profile-password-input">

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="Confirm your new password"
                    autoComplete="new-password"
                    disabled={changingPassword}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                  >
                    {showConfirmPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>

                {confirmPassword && (
                  <small
                    className={
                      newPassword ===
                      confirmPassword
                        ? "password-match"
                        : "password-no-match"
                    }
                  >
                    {newPassword ===
                    confirmPassword
                      ? "✓ Passwords match"
                      : "Passwords do not match"}
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="profile-button profile-button-primary"
                disabled={changingPassword}
              >
                {changingPassword
                  ? "Changing Password..."
                  : "Change Password"}
              </button>
            </form>
          </div>
        </section>

        <section className="profile-card">

          <div className="profile-card-header">
            <div>
              <h2>Account Information</h2>

              <p>
                Information about your TA-HOSS LOG
                account.
              </p>
            </div>
          </div>

          <div className="profile-account-info">

            <div className="account-info-item">
              <span>Username</span>
              <strong>
                {user.username || "—"}
              </strong>
            </div>

            <div className="account-info-item">
              <span>Role</span>
              <strong>
                {formatRole(user.role)}
              </strong>
            </div>

            <div className="account-info-item">
              <span>Account Status</span>

              <strong
                className={
                  accountIsActive
                    ? "text-active"
                    : "text-inactive"
                }
              >
                {accountIsActive
                  ? "Active"
                  : "Suspended"}
              </strong>
            </div>

            {user.createdAt && (
              <div className="account-info-item">
                <span>Account Created</span>

                <strong>
                  {new Date(
                    user.createdAt
                  ).toLocaleDateString()}
                </strong>
              </div>
            )}
          </div>
        </section>
      </div>

      {showRemoveConfirmation && (
        <div
          className="profile-modal-backdrop"
          onClick={() =>
            !removingPhoto &&
            setShowRemoveConfirmation(false)
          }
        >
          <div
            className="profile-confirmation-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="confirmation-icon">
              !
            </div>

            <h3>
              Remove Profile Photo?
            </h3>

            <p>
              Are you sure you want to remove your
              profile photo? This action cannot be
              undone.
            </p>

            <div className="confirmation-actions">

              <button
                type="button"
                className="profile-button profile-button-secondary"
                onClick={() =>
                  setShowRemoveConfirmation(false)
                }
                disabled={removingPhoto}
              >
                Cancel
              </button>

              <button
                type="button"
                className="profile-button profile-button-danger"
                onClick={handleRemovePhoto}
                disabled={removingPhoto}
              >
                {removingPhoto
                  ? "Removing..."
                  : "Yes, Remove Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;