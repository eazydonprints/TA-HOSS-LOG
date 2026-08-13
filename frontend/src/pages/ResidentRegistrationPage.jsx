import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../services/api";
import "./ResidentRegistrationPage.css";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const INITIAL_FORM = {
  household: "",
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  phoneNumber: "",
  maritalStatus: "unknown",
  occupation: "",
  educationLevel: "",
  relationshipToHead: "",
  latitude: "",
  longitude: "",
  accuracy: "",
  photo: "",
  photoPublicId: "",
};

const ResidentRegistrationPage = () => {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [households, setHouseholds] = useState([]);

  const [loadingHouseholds, setLoadingHouseholds] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [deletingPhoto, setDeletingPhoto] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [photoPreview, setPhotoPreview] =
    useState("");

  const [selectedPhotoName, setSelectedPhotoName] =
    useState("");

  const [photoError, setPhotoError] =
    useState("");

  const [form, setForm] = useState(INITIAL_FORM);

  /*
   * =========================================================
   * LOAD HOUSEHOLDS
   * =========================================================
   */

  useEffect(() => {
    const loadHouseholds = async () => {
      try {
        setLoadingHouseholds(true);
        setError("");

        const response = await api.get(
          "/households"
        );

        console.log(
          "HOUSEHOLDS FOR REGISTRATION:",
          response.data
        );

        if (response.data?.success) {
          setHouseholds(
            response.data.data || []
          );
        } else {
          setError(
            response.data?.message ||
              "Unable to load households."
          );
        }
      } catch (err) {
        console.error(
          "HOUSEHOLD LOAD ERROR:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Unable to load households."
        );
      } finally {
        setLoadingHouseholds(false);
      }
    };

    loadHouseholds();
  }, []);

  /*
   * =========================================================
   * FORM HANDLER
   * =========================================================
   */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  /*
   * =========================================================
   * PHOTO VALIDATION
   * =========================================================
   */

  const validatePhoto = (file) => {
    if (!file) {
      return "Please select an image.";
    }

    if (
      !ALLOWED_PHOTO_TYPES.includes(
        file.type
      )
    ) {
      return (
        "Invalid photo format. " +
        "Please select a JPG, JPEG, PNG or WEBP image."
      );
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return (
        "Photo is too large. " +
        "The maximum allowed size is 5MB."
      );
    }

    return "";
  };

  /*
   * =========================================================
   * CREATE LOCAL PREVIEW
   * =========================================================
   */

  const createPhotoPreview = (file) => {
    if (!file) {
      return;
    }

    const objectUrl =
      URL.createObjectURL(file);

    setPhotoPreview(objectUrl);

    return objectUrl;
  };

  /*
   * =========================================================
   * UPLOAD PHOTO TO CLOUDINARY
   * =========================================================
   */

  const uploadResidentPhoto = async (file) => {
    const validationError =
      validatePhoto(file);

    if (validationError) {
      setPhotoError(validationError);
      return null;
    }

    setPhotoError("");
    setError("");

    const previewUrl =
      createPhotoPreview(file);

    setSelectedPhotoName(
      file.name
    );

    try {
      setUploadingPhoto(true);

      const formData =
        new FormData();

      formData.append(
        "photo",
        file
      );

      console.log(
        "UPLOADING RESIDENT PHOTO..."
      );

      const response =
        await api.post(
          "/uploads/resident-photo",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },

            onUploadProgress:
              (progressEvent) => {
                if (
                  progressEvent.total
                ) {
                  const percent =
                    Math.round(
                      (progressEvent.loaded /
                        progressEvent.total) *
                        100
                    );

                  console.log(
                    `PHOTO UPLOAD: ${percent}%`
                  );
                }
              },
          }
        );

      console.log(
        "PHOTO UPLOAD RESPONSE:",
        response.data
      );

      if (
        !response.data?.success ||
        !response.data?.data?.url
      ) {
        throw new Error(
          response.data?.message ||
            "Photo upload failed."
        );
      }

      const uploadedPhoto =
        response.data.data;

      setForm((previous) => ({
        ...previous,
        photo:
          uploadedPhoto.url,
        photoPublicId:
          uploadedPhoto.publicId ||
          "",
      }));

      return uploadedPhoto;
    } catch (err) {
      console.error(
        "PHOTO UPLOAD ERROR:",
        err
      );

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      setPhotoPreview("");
      setSelectedPhotoName("");

      setPhotoError(
        err.response?.data?.message ||
          err.message ||
          "Unable to upload resident photo."
      );

      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  /*
   * =========================================================
   * SELECT PHOTO
   * =========================================================
   */

  const handlePhotoChange = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    /*
     * Reset input so selecting the
     * same image again will trigger
     * the change event.
     */
    event.target.value = "";

    /*
     * If an old photo exists, remove
     * the old Cloudinary file before
     * uploading the replacement.
     */

    const oldPublicId =
      form.photoPublicId;

    if (oldPublicId) {
      try {
        await deleteCloudinaryPhoto(
          oldPublicId
        );
      } catch (deleteError) {
        console.error(
          "OLD PHOTO DELETE ERROR:",
          deleteError
        );
      }
    }

    /*
     * Clean old local preview.
     */

    if (
      photoPreview &&
      photoPreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    setForm((previous) => ({
      ...previous,
      photo: "",
      photoPublicId: "",
    }));

    setPhotoPreview("");
    setSelectedPhotoName("");

    await uploadResidentPhoto(file);
  };

  /*
   * =========================================================
   * DELETE CLOUDINARY PHOTO
   * =========================================================
   */

  const deleteCloudinaryPhoto = async (
    publicId
  ) => {
    if (!publicId) {
      return;
    }

    try {
      setDeletingPhoto(true);

      await api.delete(
        "/uploads/resident-photo",
        {
          data: {
            publicId,
          },
        }
      );
    } catch (err) {
      console.error(
        "CLOUDINARY PHOTO DELETE ERROR:",
        err
      );

      throw err;
    } finally {
      setDeletingPhoto(false);
    }
  };

  /*
   * =========================================================
   * REMOVE PHOTO
   * =========================================================
   */

  const handleRemovePhoto = async () => {
    if (
      uploadingPhoto ||
      deletingPhoto ||
      submitting
    ) {
      return;
    }

    const publicId =
      form.photoPublicId;

    try {
      setPhotoError("");

      if (publicId) {
        await deleteCloudinaryPhoto(
          publicId
        );
      }

      if (
        photoPreview &&
        photoPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          photoPreview
        );
      }

      setPhotoPreview("");
      setSelectedPhotoName("");

      setForm((previous) => ({
        ...previous,
        photo: "",
        photoPublicId: "",
      }));
    } catch (err) {
      setPhotoError(
        "Unable to remove the uploaded photo. Please try again."
      );
    }
  };

  /*
   * =========================================================
   * OPEN FILE SELECTOR
   * =========================================================
   */

  const openPhotoSelector = () => {
    if (
      uploadingPhoto ||
      deletingPhoto ||
      submitting
    ) {
      return;
    }

    fileInputRef.current?.click();
  };

  /*
   * =========================================================
   * GPS
   * =========================================================
   */

  const captureGPS = () => {
    setError("");

    if (!navigator.geolocation) {
      setError(
        "GPS is not supported by this browser."
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((previous) => ({
          ...previous,

          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude,

          accuracy:
            position.coords.accuracy,
        }));

        setError("");
      },
      (gpsError) => {
        console.error(
          "GPS ERROR:",
          gpsError
        );

        setError(
          "Unable to capture GPS location. Please allow location access and try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  /*
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  const validateForm = () => {
    if (!form.household) {
      return "Please select a household.";
    }

    if (!form.firstName.trim()) {
      return "First name is required.";
    }

    if (!form.lastName.trim()) {
      return "Last name is required.";
    }

    if (!form.gender) {
      return "Please select gender.";
    }

    if (!form.dateOfBirth) {
      return "Date of birth is required.";
    }

    if (!form.relationshipToHead) {
      return (
        "Please select relationship to household head."
      );
    }

    if (uploadingPhoto) {
      return (
        "Please wait for the resident photo to finish uploading."
      );
    }

    if (
      form.photo &&
      !form.photoPublicId
    ) {
      return (
        "The resident photo was uploaded without a valid photo reference. Please upload the photo again."
      );
    }

    return "";
  };

  /*
   * =========================================================
   * SUBMIT
   * =========================================================
   */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        household:
          form.household,

        firstName:
          form.firstName.trim(),

        middleName:
          form.middleName.trim(),

        lastName:
          form.lastName.trim(),

        gender:
          form.gender,

        dateOfBirth:
          form.dateOfBirth,

        phoneNumber:
          form.phoneNumber.trim(),

        maritalStatus:
          form.maritalStatus,

        occupation:
          form.occupation.trim(),

        educationLevel:
          form.educationLevel.trim(),

        relationshipToHead:
          form.relationshipToHead,

        photo:
          form.photo || null,

        photoPublicId:
          form.photoPublicId || null,
      };

      /*
       * GPS is only included when
       * coordinates have been captured.
       */

      if (
        form.latitude !== "" &&
        form.longitude !== ""
      ) {
        payload.latitude =
          Number(form.latitude);

        payload.longitude =
          Number(form.longitude);

        if (
          form.accuracy !== ""
        ) {
          payload.accuracy =
            Number(form.accuracy);
        }
      }

      console.log(
        "REGISTER RESIDENT PAYLOAD:",
        payload
      );

      const response =
        await api.post(
          "/residents",
          payload
        );

      console.log(
        "REGISTER RESIDENT RESPONSE:",
        response.data
      );

      if (
        response.data?.success
      ) {
        const createdResident =
          response.data.data;

        setSuccess(
          response.data.message ||
            "Resident registered successfully."
        );

        /*
         * Give the success message
         * a moment before navigating.
         */

        setTimeout(() => {
          if (
            createdResident?._id
          ) {
            navigate(
              `/resident/${createdResident._id}`
            );
          } else {
            navigate(
              "/residents"
            );
          }
        }, 1000);
      } else {
        /*
         * Registration failed after
         * the photo was already uploaded.
         *
         * We clean the Cloudinary image
         * so it doesn't become an orphan.
         */

        if (
          form.photoPublicId
        ) {
          try {
            await deleteCloudinaryPhoto(
              form.photoPublicId
            );
          } catch (
            cleanupError
          ) {
            console.error(
              "PHOTO CLEANUP ERROR:",
              cleanupError
            );
          }
        }

        setError(
          response.data?.message ||
            "Resident registration failed."
        );
      }
    } catch (err) {
      console.error(
        "REGISTER RESIDENT ERROR:",
        err
      );

      /*
       * If registration fails after
       * Cloudinary upload, clean up
       * the uploaded image.
       */

      if (
        form.photoPublicId
      ) {
        try {
          await deleteCloudinaryPhoto(
            form.photoPublicId
          );
        } catch (
          cleanupError
        ) {
          console.error(
            "PHOTO CLEANUP ERROR:",
            cleanupError
          );
        }
      }

      setError(
        err.response?.data?.message ||
          "Unable to register resident."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * =========================================================
   * RESET FORM
   * =========================================================
   */

  const resetForm = async () => {
    if (
      submitting ||
      uploadingPhoto ||
      deletingPhoto
    ) {
      return;
    }

    /*
     * Remove uploaded Cloudinary
     * photo before clearing form.
     */

    if (form.photoPublicId) {
      try {
        await deleteCloudinaryPhoto(
          form.photoPublicId
        );
      } catch (err) {
        console.error(
          "RESET PHOTO DELETE ERROR:",
          err
        );
      }
    }

    if (
      photoPreview &&
      photoPreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    setForm({
      ...INITIAL_FORM,
    });

    setPhotoPreview("");
    setSelectedPhotoName("");
    setPhotoError("");
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  };

  /*
   * =========================================================
   * CLEANUP OBJECT URL
   * =========================================================
   */

  useEffect(() => {
    return () => {
      if (
        photoPreview &&
        photoPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          photoPreview
        );
      }
    };
  }, [photoPreview]);

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="dashboard-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header">

        <div>

          <div className="breadcrumb">
            TA-HOSS LOG / Residents /
            Register Resident
          </div>

          <h1>
            Register Resident
          </h1>

          <p>
            Add a new member to the Ta-hoss
            Community resident registry.
          </p>

        </div>

        <button
          type="button"
          className="back-button"
          onClick={() =>
            navigate("/residents")
          }
          disabled={
            submitting ||
            uploadingPhoto
          }
        >
          ← Back to Residents
        </button>

      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="dashboard-error">
          <span>
            {error}
          </span>
        </div>
      )}

      {/* =====================================================
          SUCCESS
      ====================================================== */}

      {success && (
        <div className="dashboard-success">
          <span>
            ✓ {success}
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
      >

        {/* ===================================================
            RESIDENT PHOTO
        ==================================================== */}

        <section className="dashboard-panel resident-photo-panel">

          <div className="panel-header">

            <div>

              <h2>
                Resident Photograph
              </h2>

              <p>
                Upload a clear identification
                photograph for the resident's
                official community record.
              </p>

            </div>

            <span className="photo-status-label">
              {form.photo
                ? "Photo uploaded"
                : "Optional"}
            </span>

          </div>

          <div className="resident-photo-upload">

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={
                handlePhotoChange
              }
              disabled={
                submitting ||
                uploadingPhoto ||
                deletingPhoto
              }
              className="resident-photo-file-input"
            />

            <div className="resident-photo-preview">

              {photoPreview ? (

                <img
                  src={photoPreview}
                  alt="Resident preview"
                  className="resident-photo-image"
                />

              ) : (

                <div className="resident-photo-placeholder">

                  <div className="resident-photo-placeholder-icon">
                    👤
                  </div>

                  <strong>
                    No Photo
                  </strong>

                  <span>
                    Upload resident photo
                  </span>

                </div>

              )}

            </div>

            <div className="resident-photo-details">

              <div className="resident-photo-title">

                <strong>
                  Official Resident Photo
                </strong>

                <span>
                  Recommended: clear front-facing
                  passport-style photograph
                </span>

              </div>

              <div className="resident-photo-requirements">

                <span>
                  JPG / PNG / WEBP
                </span>

                <span>
                  Maximum 5MB
                </span>

              </div>

              {selectedPhotoName && (
                <div className="resident-photo-file-name">
                  <span>
                    Selected:
                  </span>

                  <strong>
                    {selectedPhotoName}
                  </strong>
                </div>
              )}

              {uploadingPhoto && (
                <div className="resident-photo-upload-status">

                  <div className="resident-photo-spinner" />

                  <div>
                    <strong>
                      Uploading photo...
                    </strong>

                    <span>
                      Please wait while the
                      photograph is securely
                      uploaded.
                    </span>
                  </div>

                </div>
              )}

              {form.photo &&
                !uploadingPhoto && (
                  <div className="resident-photo-uploaded">

                    <span className="photo-check-icon">
                      ✓
                    </span>

                    <div>
                      <strong>
                        Photo uploaded successfully
                      </strong>

                      <span>
                        The photograph is ready
                        to be saved with this
                        resident record.
                      </span>
                    </div>

                  </div>
                )}

              {photoError && (
                <div className="resident-photo-error">
                  {photoError}
                </div>
              )}

              <div className="resident-photo-actions">

                <button
                  type="button"
                  className="primary-button photo-action-button"
                  onClick={
                    openPhotoSelector
                  }
                  disabled={
                    submitting ||
                    uploadingPhoto ||
                    deletingPhoto
                  }
                >
                  {uploadingPhoto
                    ? "Uploading..."
                    : form.photo
                    ? "Change Photo"
                    : "Select Photo"}
                </button>

                {form.photo && (
                  <button
                    type="button"
                    className="secondary-button photo-action-button"
                    onClick={
                      handleRemovePhoto
                    }
                    disabled={
                      submitting ||
                      uploadingPhoto ||
                      deletingPhoto
                    }
                  >
                    {deletingPhoto
                      ? "Removing..."
                      : "Remove Photo"}
                  </button>
                )}

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            HOUSEHOLD
        ==================================================== */}

        <section className="dashboard-panel">

          <div className="panel-header">

            <div>

              <h2>
                Household Assignment
              </h2>

              <p>
                Select the household where
                this resident is registered.
              </p>

            </div>

          </div>

          <div className="form-grid">

            <div className="form-group form-group-full">

              <label htmlFor="household">
                Household
                <span className="required">
                  *
                </span>
              </label>

              <select
                id="household"
                name="household"
                value={
                  form.household
                }
                onChange={
                  handleChange
                }
                disabled={
                  loadingHouseholds ||
                  submitting
                }
                required
              >

                <option value="">
                  {loadingHouseholds
                    ? "Loading households..."
                    : "Select household"}
                </option>

                {households.map(
                  (household) => (

                    <option
                      key={
                        household._id
                      }
                      value={
                        household._id
                      }
                    >
                      {household.householdId ||
                        "Household"}{" "}
                      —{" "}
                      {household.compound ||
                        "No compound"}{" "}
                      /{" "}
                      {household.houseNumber ||
                        "No house number"}
                    </option>

                  )
                )}

              </select>

              {!loadingHouseholds &&
                households.length === 0 && (
                  <small className="form-help">
                    No active households are
                    currently available.
                  </small>
                )}

            </div>

          </div>

        </section>

        {/* ===================================================
            PERSONAL INFORMATION
        ==================================================== */}

        <section className="dashboard-panel">

          <div className="panel-header">

            <div>

              <h2>
                Personal Information
              </h2>

              <p>
                Enter the resident's basic
                demographic information.
              </p>

            </div>

          </div>

          <div className="form-grid">

            <div className="form-group">

              <label htmlFor="firstName">
                First Name
                <span className="required">
                  *
                </span>
              </label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                value={
                  form.firstName
                }
                onChange={
                  handleChange
                }
                placeholder="Enter first name"
                required
              />

            </div>

            <div className="form-group">

              <label htmlFor="middleName">
                Middle Name
              </label>

              <input
                id="middleName"
                name="middleName"
                type="text"
                value={
                  form.middleName
                }
                onChange={
                  handleChange
                }
                placeholder="Enter middle name"
              />

            </div>

            <div className="form-group">

              <label htmlFor="lastName">
                Last Name
                <span className="required">
                  *
                </span>
              </label>

              <input
                id="lastName"
                name="lastName"
                type="text"
                value={
                  form.lastName
                }
                onChange={
                  handleChange
                }
                placeholder="Enter last name"
                required
              />

            </div>

            <div className="form-group">

              <label htmlFor="gender">
                Gender
                <span className="required">
                  *
                </span>
              </label>

              <select
                id="gender"
                name="gender"
                value={
                  form.gender
                }
                onChange={
                  handleChange
                }
                required
              >

                <option value="">
                  Select gender
                </option>

                <option value="male">
                  Male
                </option>

                <option value="female">
                  Female
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </div>

            <div className="form-group">

              <label htmlFor="dateOfBirth">
                Date of Birth
                <span className="required">
                  *
                </span>
              </label>

              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={
                  form.dateOfBirth
                }
                onChange={
                  handleChange
                }
                required
              />

            </div>

            <div className="form-group">

              <label htmlFor="maritalStatus">
                Marital Status
              </label>

              <select
                id="maritalStatus"
                name="maritalStatus"
                value={
                  form.maritalStatus
                }
                onChange={
                  handleChange
                }
              >

                <option value="unknown">
                  Unknown
                </option>

                <option value="single">
                  Single
                </option>

                <option value="married">
                  Married
                </option>

                <option value="divorced">
                  Divorced
                </option>

                <option value="widowed">
                  Widowed
                </option>

                <option value="separated">
                  Separated
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* ===================================================
            CONTACT
        ==================================================== */}

        <section className="dashboard-panel">

          <div className="panel-header">

            <div>

              <h2>
                Contact Information
              </h2>

              <p>
                Resident contact details.
              </p>

            </div>

          </div>

          <div className="form-grid">

            <div className="form-group">

              <label htmlFor="phoneNumber">
                Phone Number
              </label>

              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={
                  form.phoneNumber
                }
                onChange={
                  handleChange
                }
                placeholder="Enter phone number"
              />

            </div>

          </div>

        </section>

        {/* ===================================================
            RELATIONSHIP
        ==================================================== */}

        <section className="dashboard-panel">

          <div className="panel-header">

            <div>

              <h2>
                Household Relationship
              </h2>

              <p>
                Define the resident's
                relationship to the household
                head.
              </p>

            </div>

          </div>

          <div className="form-grid">

            <div className="form-group">

              <label htmlFor="relationshipToHead">
                Relationship to Head
                <span className="required">
                  *
                </span>
              </label>

              <select
                id="relationshipToHead"
                name="relationshipToHead"
                value={
                  form.relationshipToHead
                }
                onChange={
                  handleChange
                }
                required
              >

                <option value="">
                  Select relationship
                </option>

                <option value="head">
                  Head
                </option>

                <option value="spouse">
                  Spouse
                </option>

                <option value="child">
                  Child
                </option>

                <option value="parent">
                  Parent
                </option>

                <option value="sibling">
                  Sibling
                </option>

                <option value="grandparent">
                  Grandparent
                </option>

                <option value="grandchild">
                  Grandchild
                </option>

                <option value="relative">
                  Relative
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* ===================================================
            SOCIO-ECONOMIC
        ==================================================== */}

        <section className="dashboard-panel">

          <div className="panel-header">

            <div>

              <h2>
                Socio-Economic Information
              </h2>

              <p>
                Education and occupation
                information.
              </p>

            </div>

          </div>

          <div className="form-grid">

            <div className="form-group">

              <label htmlFor="occupation">
                Occupation
              </label>

              <input
                id="occupation"
                name="occupation"
                type="text"
                value={
                  form.occupation
                }
                onChange={
                  handleChange
                }
                placeholder="e.g. Farmer, Teacher, Trader"
              />

            </div>

            <div className="form-group">

              <label htmlFor="educationLevel">
                Education Level
              </label>

              <select
                id="educationLevel"
                name="educationLevel"
                value={
                  form.educationLevel
                }
                onChange={
                  handleChange
                }
              >

                <option value="">
                  Select education level
                </option>

                <option value="none">
                  No Formal Education
                </option>

                <option value="primary">
                  Primary
                </option>

                <option value="secondary">
                  Secondary
                </option>

                <option value="tertiary">
                  Tertiary
                </option>

                <option value="postgraduate">
                  Postgraduate
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* ===================================================
            GPS
        ==================================================== */}

        <section className="dashboard-panel">

          <div className="panel-header">

            <div>

              <h2>
                GPS Location
              </h2>

              <p>
                Capture the resident's current
                location for community mapping.
              </p>

            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={
                captureGPS
              }
              disabled={
                submitting ||
                uploadingPhoto
              }
            >
              📍 Capture GPS
            </button>

          </div>

          <div className="form-grid">

            <div className="form-group">

              <label>
                Latitude
              </label>

              <input
                type="number"
                name="latitude"
                value={
                  form.latitude
                }
                onChange={
                  handleChange
                }
                step="any"
                placeholder="Not captured"
              />

            </div>

            <div className="form-group">

              <label>
                Longitude
              </label>

              <input
                type="number"
                name="longitude"
                value={
                  form.longitude
                }
                onChange={
                  handleChange
                }
                step="any"
                placeholder="Not captured"
              />

            </div>

            <div className="form-group">

              <label>
                Accuracy (metres)
              </label>

              <input
                type="number"
                name="accuracy"
                value={
                  form.accuracy
                }
                onChange={
                  handleChange
                }
                step="any"
                placeholder="Not available"
              />

            </div>

          </div>

          {form.latitude &&
            form.longitude && (
              <div className="gps-success">
                ✓ GPS coordinates captured
                successfully.
              </div>
            )}

        </section>

        {/* ===================================================
            SUBMIT ACTIONS
        ==================================================== */}

        <section className="dashboard-panel">

          <div className="registration-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={
                resetForm
              }
              disabled={
                submitting ||
                uploadingPhoto ||
                deletingPhoto
              }
            >
              Clear Form
            </button>

            <button
              type="button"
              className="back-button"
              onClick={() =>
                navigate(
                  "/residents"
                )
              }
              disabled={
                submitting ||
                uploadingPhoto
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={
                submitting ||
                uploadingPhoto ||
                deletingPhoto
              }
            >
              {submitting
                ? "Registering Resident..."
                : uploadingPhoto
                ? "Uploading Photo..."
                : "✓ Register Resident"}
            </button>

          </div>

        </section>

      </form>

    </div>
  );
};

export default ResidentRegistrationPage;