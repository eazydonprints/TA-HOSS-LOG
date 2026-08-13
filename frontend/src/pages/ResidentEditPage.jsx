import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../services/api";
import "./ResidentEditPage.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const EMPTY_FORM = {
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
};

const ResidentEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const fileInputRef = useRef(null);

  const [resident, setResident] = useState(null);

  const [households, setHouseholds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingHouseholds, setLoadingHouseholds] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

  /*
   * =========================================================
   * PHOTO STATE
   * =========================================================
   */

  const [photoPreview, setPhotoPreview] =
    useState("");

  const [photoUrl, setPhotoUrl] =
    useState("");

  const [photoPublicId, setPhotoPublicId] =
    useState("");

  const [originalPhotoUrl, setOriginalPhotoUrl] =
    useState("");

  const [originalPhotoPublicId, setOriginalPhotoPublicId] =
    useState("");

  const [photoChanged, setPhotoChanged] =
    useState(false);

  const [removePhoto, setRemovePhoto] =
    useState(false);

  const [photoMessage, setPhotoMessage] =
    useState("");

  /*
   * =========================================================
   * LOAD RESIDENT
   * =========================================================
   */

  const loadResident = useCallback(async () => {
    if (!id) {
      setError("Resident ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/residents/${id}`
      );

      console.log(
        "RESIDENT FOR EDIT:",
        response.data
      );

      if (!response.data?.success) {
        setError(
          response.data?.message ||
            "Unable to load resident."
        );

        return;
      }

      const data = response.data.data;

      if (!data) {
        setError(
          "Resident record was not found."
        );

        return;
      }

      setResident(data);

      /*
       * Convert the stored date into
       * YYYY-MM-DD for the date input.
       */
      let dateOfBirth = "";

      if (data.dateOfBirth) {
        const parsedDate = new Date(
          data.dateOfBirth
        );

        if (
          !Number.isNaN(
            parsedDate.getTime()
          )
        ) {
          dateOfBirth = parsedDate
            .toISOString()
            .slice(0, 10);
        }
      }

      setForm({
        household:
          data.household?._id ||
          data.household ||
          "",

        firstName:
          data.firstName || "",

        middleName:
          data.middleName || "",

        lastName:
          data.lastName || "",

        gender:
          data.gender || "",

        dateOfBirth,

        phoneNumber:
          data.phoneNumber || "",

        maritalStatus:
          data.maritalStatus ||
          "unknown",

        occupation:
          data.occupation || "",

        educationLevel:
          data.educationLevel || "",

        relationshipToHead:
          data.relationshipToHead || "",

        latitude:
          data.gps?.latitude ??
          "",

        longitude:
          data.gps?.longitude ??
          "",

        accuracy:
          data.gps?.accuracy ??
          "",
      });

      /*
       * Existing photo.
       */
      const existingPhoto =
        typeof data.photo === "string"
          ? data.photo
          : data.photo?.url || "";

      const existingPublicId =
        data.photoPublicId || "";

      setPhotoUrl(existingPhoto);
      setPhotoPreview(existingPhoto);

      setOriginalPhotoUrl(
        existingPhoto
      );

      setPhotoPublicId(
        existingPublicId
      );

      setOriginalPhotoPublicId(
        existingPublicId
      );

      setPhotoChanged(false);
      setRemovePhoto(false);
    } catch (err) {
      console.error(
        "LOAD RESIDENT ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load resident record."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  /*
   * =========================================================
   * LOAD HOUSEHOLDS
   * =========================================================
   */

  const loadHouseholds = useCallback(
    async () => {
      try {
        setLoadingHouseholds(true);

        const response = await api.get(
          "/households"
        );

        console.log(
          "HOUSEHOLDS FOR EDIT:",
          response.data
        );

        if (response.data?.success) {
          setHouseholds(
            response.data.data || []
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
    },
    []
  );

  useEffect(() => {
    loadResident();
    loadHouseholds();
  }, [
    loadResident,
    loadHouseholds,
  ]);

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

    setError("");
    setSuccess("");
  };

  /*
   * =========================================================
   * PHOTO VALIDATION
   * =========================================================
   */

  const validatePhoto = (file) => {
    if (!file) {
      return "Please select a photo.";
    }

    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type
      )
    ) {
      return (
        "Invalid photo format. " +
        "Please select a JPG, JPEG, PNG or WEBP image."
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return (
        "Photo is too large. " +
        "Maximum allowed size is 5 MB."
      );
    }

    return "";
  };

  /*
   * =========================================================
   * UPLOAD PHOTO
   * =========================================================
   */

  const uploadPhoto = async (file) => {
    const validationError =
      validatePhoto(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setUploadingPhoto(true);
      setError("");
      setPhotoMessage(
        "Uploading resident photo..."
      );

      /*
       * Local preview while upload is
       * taking place.
       */
      const localPreview =
        URL.createObjectURL(file);

      setPhotoPreview(localPreview);

      const formData =
        new FormData();

      /*
       * The upload backend is expected
       * to use the "photo" field.
       */
      formData.append(
        "photo",
        file
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
          }
        );

      console.log(
        "RESIDENT PHOTO UPLOAD RESPONSE:",
        response.data
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Photo upload failed."
        );
      }

      const uploaded =
        response.data.data;

      const uploadedUrl =
        uploaded?.url ||
        uploaded?.secure_url ||
        uploaded?.photo ||
        "";

      const uploadedPublicId =
        uploaded?.publicId ||
        uploaded?.public_id ||
        uploaded?.photoPublicId ||
        "";

      if (!uploadedUrl) {
        throw new Error(
          "Photo uploaded but no photo URL was returned by the server."
        );
      }

      setPhotoUrl(
        uploadedUrl
      );

      setPhotoPublicId(
        uploadedPublicId
      );

      setPhotoPreview(
        uploadedUrl
      );

      setPhotoChanged(true);
      setRemovePhoto(false);

      setPhotoMessage(
        "Photo uploaded successfully."
      );

      /*
       * Clean up the temporary object URL.
       */
      URL.revokeObjectURL(
        localPreview
      );
    } catch (err) {
      console.error(
        "PHOTO UPLOAD ERROR:",
        err
      );

      setPhotoPreview(
        photoUrl ||
          originalPhotoUrl ||
          ""
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to upload resident photo."
      );

      setPhotoMessage("");
    } finally {
      setUploadingPhoto(false);
    }
  };

  /*
   * =========================================================
   * PHOTO SELECT
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

    await uploadPhoto(file);

    /*
     * Allow the same file to be selected
     * again later.
     */
    event.target.value = "";
  };

  /*
   * =========================================================
   * OPEN PHOTO SELECTOR
   * =========================================================
   */

  const choosePhoto = () => {
    if (
      submitting ||
      uploadingPhoto
    ) {
      return;
    }

    fileInputRef.current?.click();
  };

  /*
   * =========================================================
   * REMOVE PHOTO
   * =========================================================
   */

  const handleRemovePhoto = () => {
    setPhotoPreview("");
    setPhotoUrl("");
    setPhotoPublicId("");

    setPhotoChanged(true);
    setRemovePhoto(true);

    setPhotoMessage(
      originalPhotoUrl
        ? "Photo will be removed when you save the record."
        : "Photo removed."
    );

    setError("");
  };

  /*
   * =========================================================
   * RESTORE CURRENT PHOTO
   * =========================================================
   */

  const restorePhoto = () => {
    setPhotoPreview(
      originalPhotoUrl
    );

    setPhotoUrl(
      originalPhotoUrl
    );

    setPhotoPublicId(
      originalPhotoPublicId
    );

    setPhotoChanged(false);
    setRemovePhoto(false);

    setPhotoMessage(
      originalPhotoUrl
        ? "Original photo restored."
        : ""
    );

    setError("");
  };

  /*
   * =========================================================
   * GPS
   * =========================================================
   */

  const captureGPS = () => {
    setError("");
    setSuccess("");

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

        setSuccess(
          "GPS coordinates captured successfully."
        );
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

    /*
     * Validate date.
     */
    const birthDate =
      new Date(
        form.dateOfBirth
      );

    if (
      Number.isNaN(
        birthDate.getTime()
      )
    ) {
      return "Please provide a valid date of birth.";
    }

    /*
     * DOB cannot be in the future.
     */
    if (
      birthDate >
      new Date()
    ) {
      return "Date of birth cannot be in the future.";
    }

    /*
     * Validate GPS when supplied.
     */
    if (
      form.latitude !== "" ||
      form.longitude !== ""
    ) {
      const latitude =
        Number(form.latitude);

      const longitude =
        Number(form.longitude);

      if (
        Number.isNaN(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        return "Please provide a valid latitude.";
      }

      if (
        Number.isNaN(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        return "Please provide a valid longitude.";
      }
    }

    return "";
  };

  /*
   * =========================================================
   * SUBMIT UPDATE
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
      return;
    }

    if (uploadingPhoto) {
      setError(
        "Please wait for the photo upload to finish."
      );

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
      };

      /*
       * -------------------------------------------------------
       * PHOTO
       * -------------------------------------------------------
       *
       * Only send photo fields when the photo
       * has actually changed.
       *
       * This is important because it prevents
       * an edit from accidentally removing the
       * resident's existing photo.
       */

      if (photoChanged) {
        if (removePhoto) {
          payload.photo = null;
          payload.photoPublicId = null;
        } else {
          payload.photo =
            photoUrl || null;

          payload.photoPublicId =
            photoPublicId || null;
        }
      }

      /*
       * -------------------------------------------------------
       * GPS
       * -------------------------------------------------------
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
        "UPDATE RESIDENT PAYLOAD:",
        payload
      );

      /*
       * IMPORTANT:
       *
       * PATCH is used so this updates the
       * existing resident instead of creating
       * a duplicate record.
       */
      const response =
        await api.patch(
          `/residents/${id}`,
          payload
        );

      console.log(
        "UPDATE RESIDENT RESPONSE:",
        response.data
      );

      if (!response.data?.success) {
        setError(
          response.data?.message ||
            "Resident update failed."
        );

        return;
      }

      setSuccess(
        response.data.message ||
          "Resident record updated successfully."
      );

      /*
       * Refresh local resident state.
       */
      if (response.data.data) {
        setResident(
          response.data.data
        );
      }

      /*
       * Navigate to the resident's
       * profile after a short delay.
       */
      setTimeout(() => {
        navigate(
          `/resident/${id}`
        );
      }, 1000);
    } catch (err) {
      console.error(
        "UPDATE RESIDENT ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to update resident record."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * =========================================================
   * FORMAT HELPERS
   * =========================================================
   */

  const formatLabel = (value) => {
    if (!value) {
      return "N/A";
    }

    return String(value)
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  const getResidentName = () => {
    if (!resident) {
      return "Resident";
    }

    return [
      resident.firstName,
      resident.middleName,
      resident.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  };

  /*
   * =========================================================
   * LOADING STATE
   * =========================================================
   */

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />

          <p>
            Loading resident record...
          </p>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * RESIDENT NOT FOUND
   * =========================================================
   */

  if (!resident) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <strong>
            Unable to load resident
          </strong>

          <p>
            {error ||
              "The requested resident record could not be found."}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate("/residents")
            }
          >
            ← Back to Residents
          </button>
        </div>
      </div>
    );
  }

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
            Edit Resident
          </div>

          <h1>
            Edit Resident Record
          </h1>

          <p>
            Correct or update the existing
            record for{" "}
            <strong>
              {getResidentName()}
            </strong>
            .
          </p>

        </div>

        <button
          type="button"
          className="back-button"
          onClick={() =>
            navigate(
              `/resident/${id}`
            )
          }
          disabled={submitting}
        >
          ← Back to Resident
        </button>

      </div>

      {/* =====================================================
          RECORD INFORMATION
      ====================================================== */}

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>
            <h2>
              Record Information
            </h2>

            <p>
              The resident ID remains unchanged
              when correcting this record.
            </p>
          </div>

        </div>

        <div className="edit-record-summary">

          <div className="edit-record-item">

            <span>
              Resident ID
            </span>

            <strong>
              {resident.residentId ||
                "N/A"}
            </strong>

          </div>

          <div className="edit-record-item">

            <span>
              Verification
            </span>

            <strong>
              {formatLabel(
                resident.verificationStatus ||
                  "pending"
              )}
            </strong>

          </div>

          <div className="edit-record-item">

            <span>
              Identity
            </span>

            <strong>
              {formatLabel(
                resident.identityStatus ||
                  "pending"
              )}
            </strong>

          </div>

          <div className="edit-record-item">

            <span>
              Record Status
            </span>

            <strong>
              {formatLabel(
                resident.status ||
                  "active"
              )}
            </strong>

          </div>

        </div>

      </section>

      {/* =====================================================
          ALERTS
      ====================================================== */}

      {error && (
        <div className="dashboard-error">
          <strong>
            Update Error
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {success && (
        <div className="dashboard-success">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
      >

        {/* ===================================================
            PHOTO
        ==================================================== */}

        <section className="dashboard-panel">

          <div className="panel-header">

            <div>

              <h2>
                Resident Photo
              </h2>

              <p>
                Update the resident's profile
                photograph. The current photo
                will remain unchanged unless you
                replace or remove it.
              </p>

            </div>

          </div>

          <div className="resident-photo-editor">

            <div className="resident-photo-preview">

              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={getResidentName()}
                />
              ) : (
                <div className="resident-photo-placeholder">
                  <span>
                    {resident.firstName
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "?"}
                  </span>

                  <small>
                    No Photo
                  </small>
                </div>
              )}

            </div>

            <div className="resident-photo-controls">

              <div>

                <strong>
                  {photoPreview
                    ? "Resident photograph"
                    : "No resident photograph"}
                </strong>

                <p>
                  JPG, JPEG, PNG or WEBP.
                  Maximum size: 5 MB.
                </p>

              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={
                  handlePhotoChange
                }
                hidden
              />

              <div className="photo-action-buttons">

                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    choosePhoto
                  }
                  disabled={
                    submitting ||
                    uploadingPhoto
                  }
                >
                  {uploadingPhoto
                    ? "Uploading..."
                    : photoPreview
                    ? "Change Photo"
                    : "Select Photo"}
                </button>

                {photoPreview && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      handleRemovePhoto
                    }
                    disabled={
                      submitting ||
                      uploadingPhoto
                    }
                  >
                    Remove Photo
                  </button>
                )}

                {photoChanged &&
                  originalPhotoUrl && (
                    <button
                      type="button"
                      className="back-button"
                      onClick={
                        restorePhoto
                      }
                      disabled={
                        submitting ||
                        uploadingPhoto
                      }
                    >
                      Restore Current
                    </button>
                  )}

              </div>

              {uploadingPhoto && (
                <div className="photo-upload-status">
                  <div className="photo-upload-spinner" />

                  <span>
                    Uploading photo to
                    secure cloud storage...
                  </span>
                </div>
              )}

              {!uploadingPhoto &&
                photoMessage && (
                  <div className="photo-upload-success">
                    ✓{" "}
                    {photoMessage}
                  </div>
                )}

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
                Correct the household associated
                with this resident if necessary.
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
                    No active households
                    are currently
                    available.
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
                Correct the resident's
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                Correct resident contact
                information.
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
                disabled={submitting}
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
                Correct the resident's
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
                disabled={submitting}
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
                Correct education and
                occupation information.
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
                disabled={submitting}
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
                disabled={submitting}
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
                Update the resident's current
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
                submitting
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
              />

            </div>

          </div>

          {form.latitude &&
            form.longitude && (
              <div className="gps-success">
                ✓ GPS coordinates available.
              </div>
            )}

        </section>

        {/* ===================================================
            ACTIONS
        ==================================================== */}

        <section className="dashboard-panel">

          <div className="registration-actions">

            <button
              type="button"
              className="back-button"
              onClick={() =>
                navigate(
                  `/resident/${id}`
                )
              }
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={
                loadResident
              }
              disabled={
                submitting ||
                uploadingPhoto
              }
            >
              Reset Changes
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={
                submitting ||
                uploadingPhoto
              }
            >
              {submitting
                ? "Saving Changes..."
                : "✓ Save Changes"}
            </button>

          </div>

        </section>

      </form>

    </div>
  );
};

export default ResidentEditPage;