import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./UsersPage.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://10.253.205.21:5000/api/v1";

const ROLES = {
  SUPER_ADMIN: "super_admin",
  REGISTRATION_OFFICER: "registration_officer",
  VERIFICATION_OFFICER: "verification_officer",
  VIEWER: "viewer",
};

const ROLE_OPTIONS = [
  {
    value: ROLES.REGISTRATION_OFFICER,
    label: "Registration Officer",
  },
  {
    value: ROLES.VERIFICATION_OFFICER,
    label: "Verification Officer",
  },
  {
    value: ROLES.VIEWER,
    label: "Viewer",
  },
];

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
  },
  {
    value: "suspended",
    label: "Suspended",
  },
];

const EMPTY_FORM = {
  fullname: "",
  username: "",
  password: "",
  role: ROLES.REGISTRATION_OFFICER,
  status: "active",
};

const getUserId = (user) =>
  user?._id ||
  user?.id ||
  user?.userId ||
  "";

const getUserName = (user) =>
  user?.fullname ||
  user?.fullName ||
  user?.name ||
  user?.username ||
  "Unknown User";

const getRoleLabel = (role) => {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return "Super Admin";

    case ROLES.REGISTRATION_OFFICER:
      return "Registration Officer";

    case ROLES.VERIFICATION_OFFICER:
      return "Verification Officer";

    case ROLES.VIEWER:
      return "Viewer";

    default:
      return role
        ? String(role)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase())
        : "Unknown";
  }
};

const getStatus = (user) => {
  if (
    user?.status === "suspended" ||
    user?.status === "inactive" ||
    user?.isActive === false
  ) {
    return "suspended";
  }

  return "active";
};

const getStatusLabel = (user) =>
  getStatus(user) === "active" ? "Active" : "Suspended";

const getInitials = (user) => {
  const name = getUserName(user);

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
};

const getPhoto = (user) =>
  user?.photo ||
  user?.profilePhoto ||
  user?.avatar ||
  null;

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const parseApiResponse = async (response) => {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    success: response.ok,
    message: text,
  };
};

const extractUsers = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.users)) {
    return payload.data.users;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  return [];
};

const extractUser = (payload) => {
  if (!payload) return null;

  if (payload?.data?.user) {
    return payload.data.user;
  }

  if (payload?.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload?.user) {
    return payload.user;
  }

  return payload;
};

function UsersPage() {
  const { user: currentUser, token, authHeaders } = useAuth();

  const currentUserId = getUserId(currentUser);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [photoLoading, setPhotoLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

  const photoInputRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD USERS
  |--------------------------------------------------------------------------
  */

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "GET",
        headers: {
          ...authHeaders(),
          Accept: "application/json",
        },
      });

      const payload = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to load system users."
        );
      }

      setUsers(extractUsers(payload));
    } catch (err) {
      console.error("LOAD USERS ERROR:", err);

      setError(
        err.message || "Unable to load system users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadUsers();
    }
  }, [token]);

  /*
  |--------------------------------------------------------------------------
  | ALERT HELPERS
  |--------------------------------------------------------------------------
  */

  const showSuccess = (message) => {
    setSuccess(message);
    setError("");

    window.setTimeout(() => {
      setSuccess("");
    }, 4000);
  };

  const showError = (message) => {
    setError(message);
    setSuccess("");

    window.setTimeout(() => {
      setError("");
    }, 6000);
  };

  /*
  |--------------------------------------------------------------------------
  | FILTERING
  |--------------------------------------------------------------------------
  */

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !value ||
        getUserName(user).toLowerCase().includes(value) ||
        String(user?.username || "")
          .toLowerCase()
          .includes(value) ||
        getRoleLabel(user?.role)
          .toLowerCase()
          .includes(value);

      const matchesRole =
        roleFilter === "all" ||
        user?.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        getStatus(user) === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  /*
  |--------------------------------------------------------------------------
  | STATISTICS
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
    return {
      total: users.length,

      active: users.filter(
        (user) => getStatus(user) === "active"
      ).length,

      suspended: users.filter(
        (user) => getStatus(user) === "suspended"
      ).length,

      registration: users.filter(
        (user) =>
          user?.role === ROLES.REGISTRATION_OFFICER
      ).length,

      verification: users.filter(
        (user) =>
          user?.role === ROLES.VERIFICATION_OFFICER
      ).length,

      viewers: users.filter(
        (user) => user?.role === ROLES.VIEWER
      ).length,
    };
  }, [users]);

  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  const openCreateForm = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEditForm = (user) => {
    setEditingUser(user);

    setForm({
      fullname:
        user?.fullname ||
        user?.fullName ||
        "",

      username:
        user?.username || "",

      password: "",

      role:
        user?.role ||
        ROLES.REGISTRATION_OFFICER,

      status:
        getStatus(user),
    });

    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE / UPDATE USER
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.fullname.trim()) {
      showError("Please enter the user's full name.");
      return;
    }

    if (!form.username.trim()) {
      showError("Please enter a username.");
      return;
    }

    if (!editingUser && !form.password) {
      showError("Please provide an initial password.");
      return;
    }

    if (form.password && form.password.length < 8) {
      showError("Password must contain at least 8 characters.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const userId = getUserId(editingUser);

      const endpoint = editingUser
        ? `${API_URL}/users/${userId}`
        : `${API_URL}/users`;

      const method = editingUser
        ? "PATCH"
        : "POST";

      const body = editingUser
        ? {
            fullname: form.fullname.trim(),
            role: form.role,
          }
        : {
            fullname: form.fullname.trim(),
            username: form.username.trim(),
            password: form.password,
            role: form.role,
          };

      const response = await fetch(endpoint, {
        method,

        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(body),
      });

      const payload =
        await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            `Unable to ${
              editingUser
                ? "update"
                : "create"
            } user.`
        );
      }

      const returnedUser =
        extractUser(payload);

      if (editingUser) {
        setUsers((previous) =>
          previous.map((user) =>
            getUserId(user) ===
            getUserId(editingUser)
              ? returnedUser ||
                {
                  ...user,
                  ...body,
                }
              : user
          )
        );

        showSuccess(
          "User account updated successfully."
        );
      } else {
        if (returnedUser) {
          setUsers((previous) => [
            returnedUser,
            ...previous,
          ]);
        } else {
          await loadUsers();
        }

        showSuccess(
          "User account created successfully."
        );
      }

      closeForm();
    } catch (err) {
      console.error(
        "SAVE USER ERROR:",
        err
      );

      showError(
        err.message ||
          "Unable to save user account."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DETAILS
  |--------------------------------------------------------------------------
  */

  const openDetails = (user) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedUser(null);
  };

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  const updateStatus = async (
    user,
    nextStatus
  ) => {
    const userId = getUserId(user);

    if (!userId) return;

    if (
      userId === currentUserId &&
      nextStatus === "suspended"
    ) {
      showError(
        "You cannot suspend your own Super Admin account."
      );

      return;
    }

    const actionKey =
      `${userId}-status`;

    setActionLoading(actionKey);

    try {
      const response = await fetch(
        `${API_URL}/users/${userId}/status`,
        {
          method: "PATCH",

          headers: {
            ...authHeaders(),
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const payload =
        await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            "Unable to update user status."
        );
      }

      const returnedUser =
        extractUser(payload);

      setUsers((previous) =>
        previous.map((item) =>
          getUserId(item) === userId
            ? returnedUser || {
                ...item,
                status: nextStatus,
                isActive:
                  nextStatus === "active",
              }
            : item
        )
      );

      if (
        selectedUser &&
        getUserId(selectedUser) === userId
      ) {
        setSelectedUser(
          returnedUser || {
            ...user,
            status: nextStatus,
            isActive:
              nextStatus === "active",
          }
        );
      }

      showSuccess(
        nextStatus === "active"
          ? "User activated successfully."
          : "User suspended successfully."
      );
    } catch (err) {
      console.error(
        "STATUS UPDATE ERROR:",
        err
      );

      showError(
        err.message ||
          "Unable to update user status."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleSuspend = (user) =>
    updateStatus(user, "suspended");

  const handleActivate = (user) =>
    updateStatus(user, "active");

  /*
  |--------------------------------------------------------------------------
  | PASSWORD RESET
  |--------------------------------------------------------------------------
  */

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPassword("");
    setConfirmPassword("");
    setShowPasswordModal(true);
    setError("");
  };

  const closePasswordModal = () => {
    if (saving) return;

    setShowPasswordModal(false);
    setPassword("");
    setConfirmPassword("");
  };

  const handlePasswordChange = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedUser) return;

    if (!password) {
      showError(
        "Please enter a new password."
      );

      return;
    }

    if (password.length < 8) {
      showError(
        "Password must contain at least 8 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      showError(
        "The passwords do not match."
      );

      return;
    }

    const userId =
      getUserId(selectedUser);

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/users/${userId}/password`,
        {
          method: "PATCH",

          headers: {
            ...authHeaders(),
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          body: JSON.stringify({
            newPassword: password,
            confirmPassword,
          }),
        }
      );

      const payload =
        await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            "Unable to change user password."
        );
      }

      showSuccess(
        "User password changed successfully."
      );

      closePasswordModal();
    } catch (err) {
      console.error(
        "CHANGE USER PASSWORD ERROR:",
        err
      );

      showError(
        err.message ||
          "Unable to change user password."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const openDeleteModal = (user) => {
    if (
      getUserId(user) ===
      currentUserId
    ) {
      showError(
        "You cannot delete your own Super Admin account."
      );

      return;
    }

    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (actionLoading) return;

    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    const userId =
      getUserId(selectedUser);

    if (!userId) return;

    setActionLoading(
      `${userId}-delete`
    );

    try {
      const response = await fetch(
        `${API_URL}/users/${userId}`,
        {
          method: "DELETE",

          headers: {
            ...authHeaders(),
            Accept:
              "application/json",
          },
        }
      );

      const payload =
        await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            "Unable to delete user."
        );
      }

      setUsers((previous) =>
        previous.filter(
          (user) =>
            getUserId(user) !== userId
        )
      );

      showSuccess(
        "User account deleted successfully."
      );

      closeDeleteModal();
    } catch (err) {
      console.error(
        "DELETE USER ERROR:",
        err
      );

      showError(
        err.message ||
          "Unable to delete user."
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | PHOTO
  |--------------------------------------------------------------------------
  */

  const openPhotoModal = (user) => {
    setSelectedUser(user);
    setPhotoFile(null);
    setPhotoPreview(
      getPhoto(user) || ""
    );
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    if (photoLoading) return;

    setShowPhotoModal(false);
    setPhotoFile(null);
    setPhotoPreview("");

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const handlePhotoSelect = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      showError(
        "Please select a valid image file."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      showError(
        "Photo must not exceed 5MB."
      );

      event.target.value = "";

      return;
    }

    setPhotoFile(file);

    const reader =
      new FileReader();

    reader.onload = () => {
      setPhotoPreview(
        reader.result
      );
    };

    reader.readAsDataURL(file);
  };

  const uploadPhoto = async () => {
    if (
      !selectedUser ||
      !photoFile
    ) {
      showError(
        "Please select a new photo first."
      );

      return;
    }

    const userId =
      getUserId(selectedUser);

    if (!userId) {
      showError(
        "Unable to identify the selected user."
      );

      return;
    }

    /*
     * IMPORTANT:
     * The field name MUST match:
     *
     * upload.single("photo")
     *
     * Only append the file ONCE.
     */
    const formData =
      new FormData();

    formData.append(
      "photo",
      photoFile
    );

    setPhotoLoading(userId);

    try {
      const headers = {
        ...authHeaders(),
        Accept:
          "application/json",
      };

      /*
       * Do NOT manually set Content-Type.
       * Browser will set multipart/form-data
       * with the correct boundary.
       */
      delete headers["Content-Type"];
      delete headers["content-type"];

      const response =
        await fetch(
          `${API_URL}/users/${userId}/photo`,
          {
            method: "POST",
            headers,
            body: formData,
          }
        );

      const payload =
        await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            "Unable to upload user photo."
        );
      }

      const returnedUser =
        extractUser(payload);

      const updatedUser =
        returnedUser ||
        {
          ...selectedUser,
          photo:
            payload?.data?.photo ||
            payload?.data?.url ||
            payload?.photo ||
            payload?.url ||
            selectedUser.photo,

          photoPublicId:
            payload?.data?.photoPublicId ||
            payload?.data?.publicId ||
            payload?.photoPublicId ||
            payload?.publicId ||
            selectedUser.photoPublicId,
        };

      setUsers((previous) =>
        previous.map((user) =>
          getUserId(user) === userId
            ? updatedUser
            : user
        )
      );

      setSelectedUser(
        updatedUser
      );

      showSuccess(
        "User photo uploaded successfully."
      );

      closePhotoModal();

      /*
       * Reload from backend to ensure
       * frontend is synchronized.
       */
      await loadUsers();
    } catch (err) {
      console.error(
        "USER PHOTO UPLOAD ERROR:",
        err
      );

      showError(
        err.message ||
          "Unable to upload user photo."
      );
    } finally {
      setPhotoLoading("");
    }
  };

  const removePhoto = async (
    user
  ) => {
    const userId =
      getUserId(user);

    if (!userId) return;

    if (!getPhoto(user)) {
      showError(
        "This user does not have a profile photo."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Remove the profile photo for ${getUserName(
          user
        )}?`
      );

    if (!confirmed) return;

    setPhotoLoading(userId);

    try {
      const response =
        await fetch(
          `${API_URL}/users/${userId}/photo`,
          {
            method: "DELETE",

            headers: {
              ...authHeaders(),
              Accept:
                "application/json",
            },
          }
        );

      const payload =
        await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            "Unable to remove user photo."
        );
      }

      const returnedUser =
        extractUser(payload);

      const updatedUser =
        returnedUser ||
        {
          ...user,
          photo: null,
          photoPublicId: null,
        };

      setUsers((previous) =>
        previous.map((item) =>
          getUserId(item) === userId
            ? updatedUser
            : item
        )
      );

      if (
        selectedUser &&
        getUserId(selectedUser) === userId
      ) {
        setSelectedUser(
          updatedUser
        );
      }

      setPhotoPreview("");
      setPhotoFile(null);

      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }

      showSuccess(
        "User photo removed successfully."
      );
    } catch (err) {
      console.error(
        "REMOVE USER PHOTO ERROR:",
        err
      );

      showError(
        err.message ||
          "Unable to remove user photo."
      );
    } finally {
      setPhotoLoading("");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER AVATAR
  |--------------------------------------------------------------------------
  */

  const renderAvatar = (
    user,
    sizeClass = ""
  ) => {
    const photo =
      getPhoto(user);

    if (photo) {
      return (
        <img
          src={photo}
          alt={getUserName(user)}
          className={`users-avatar-image ${sizeClass}`}
          onError={(event) => {
            event.currentTarget.style.display =
              "none";
          }}
        />
      );
    }

    return (
      <div
        className={`users-avatar-placeholder ${sizeClass}`}
      >
        {getInitials(user)}
      </div>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | JSX
  |--------------------------------------------------------------------------
  */

  return (
    <div className="users-page">

      <div className="users-page-header">
        <div>
          <div className="users-page-eyebrow">
            TA-HOSS LOG
          </div>

          <h1>User Management</h1>

          <p>
            Manage administrators,
            registration officers,
            verification officers and
            viewers.
          </p>
        </div>

        <button
          type="button"
          className="users-primary-button"
          onClick={openCreateForm}
        >
          <span className="button-icon">
            +
          </span>
          Add User
        </button>
      </div>

      {error && (
        <div className="users-alert users-alert-error">
          <span className="alert-icon">
            !
          </span>

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="users-alert users-alert-success">
          <span className="alert-icon">
            ✓
          </span>

          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="users-statistics">

        <div className="users-stat-card">
          <div className="users-stat-icon">
            👥
          </div>

          <div>
            <span>Total Users</span>
            <strong>
              {statistics.total}
            </strong>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon">
            ✓
          </div>

          <div>
            <span>Active</span>
            <strong>
              {statistics.active}
            </strong>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon">
            ⏸
          </div>

          <div>
            <span>Suspended</span>
            <strong>
              {statistics.suspended}
            </strong>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon">
            📝
          </div>

          <div>
            <span>Registration</span>
            <strong>
              {statistics.registration}
            </strong>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon">
            ✓
          </div>

          <div>
            <span>Verification</span>
            <strong>
              {statistics.verification}
            </strong>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon">
            👁
          </div>

          <div>
            <span>Viewers</span>
            <strong>
              {statistics.viewers}
            </strong>
          </div>
        </div>

      </div>

      <div className="users-toolbar">

        <div className="users-search">
          <span>⌕</span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search name, username or role..."
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
            >
              ×
            </button>
          )}
        </div>

        <div className="users-filter">
          <label>Role</label>

          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Roles
            </option>

            {ROLE_OPTIONS.map(
              (role) => (
                <option
                  key={role.value}
                  value={role.value}
                >
                  {role.label}
                </option>
              )
            )}

            <option
              value={ROLES.SUPER_ADMIN}
            >
              Super Admin
            </option>
          </select>
        </div>

        <div className="users-filter">
          <label>Status</label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Statuses
            </option>

            {STATUS_OPTIONS.map(
              (status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              )
            )}
          </select>
        </div>

        <button
          type="button"
          className="users-refresh-button"
          onClick={loadUsers}
          disabled={loading}
        >
          ↻ Refresh
        </button>

      </div>

      <div className="users-results-summary">
        Showing{" "}
        <strong>
          {filteredUsers.length}
        </strong>{" "}
        of{" "}
        <strong>
          {users.length}
        </strong>{" "}
        users
      </div>

      <div className="users-table-card">

        {loading ? (
          <div className="users-loading">
            <div className="users-spinner" />
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (

          <div className="users-empty">
            <div className="users-empty-icon">
              👤
            </div>

            <h3>No users found</h3>

            <p>
              {users.length === 0
                ? "No user accounts have been created yet."
                : "Try changing your search or filters."}
            </p>

            {users.length === 0 && (
              <button
                type="button"
                className="users-primary-button"
                onClick={openCreateForm}
              >
                + Add First User
              </button>
            )}
          </div>

        ) : (

          <div className="users-table-wrapper">

            <table className="users-table">

              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Account Created</th>
                  <th>Account Type</th>
                  <th
                    style={{
                      textAlign: "right",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredUsers.map(
                  (user) => {
                    const userId =
                      getUserId(user);

                    const isSelf =
                      userId ===
                      currentUserId;

                    const status =
                      getStatus(user);

                    const isBusy =
                      actionLoading ===
                      `${userId}-status`;

                    const isPhotoBusy =
                      photoLoading ===
                      userId;

                    return (
                      <tr key={userId}>

                        <td>
                          <div className="users-table-user-cell">

                            <div className="user-avatar user-avatar-sm">
                              {renderAvatar(user)}
                            </div>

                            <div className="users-table-user-info">

                              <div className="users-table-user-name">
                                {getUserName(
                                  user
                                )}

                                {isSelf && (
                                  <span className="users-you-badge">
                                    You
                                  </span>
                                )}
                              </div>

                              <div className="users-table-user-username">
                                @
                                {user.username ||
                                  "N/A"}
                              </div>

                            </div>

                          </div>
                        </td>

                        <td>
                          <span
                            className={`user-role-badge ${String(
                              user.role ||
                                ""
                            )
                              .toLowerCase()
                              .replace(
                                /_/g,
                                "-"
                              )}`}
                          >
                            {getRoleLabel(
                              user.role
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`user-status-badge ${status}`}
                          >
                            <span />
                            {getStatusLabel(
                              user
                            )}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            user.createdAt ||
                              user.created_at
                          )}
                        </td>

                        <td>
                          {isSelf
                            ? "Current Account"
                            : "System User"}
                        </td>

                        <td>

                          <div className="users-actions">

                            <button
                              type="button"
                              className="users-action-btn edit"
                              onClick={() =>
                                openDetails(
                                  user
                                )
                              }
                            >
                              View
                            </button>

                            <button
                              type="button"
                              className="users-action-btn edit"
                              onClick={() =>
                                openEditForm(
                                  user
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="users-action-btn edit"
                              onClick={() =>
                                openPhotoModal(
                                  user
                                )
                              }
                              disabled={
                                isPhotoBusy
                              }
                            >
                              {isPhotoBusy
                                ? "..."
                                : "Photo"}
                            </button>

                            {!isSelf &&
                              status ===
                                "active" && (
                                <button
                                  type="button"
                                  className="users-action-btn suspend"
                                  onClick={() =>
                                    handleSuspend(
                                      user
                                    )
                                  }
                                  disabled={
                                    isBusy
                                  }
                                >
                                  {isBusy
                                    ? "..."
                                    : "Suspend"}
                                </button>
                              )}

                            {!isSelf &&
                              status ===
                                "suspended" && (
                                <button
                                  type="button"
                                  className="users-action-btn edit"
                                  onClick={() =>
                                    handleActivate(
                                      user
                                    )
                                  }
                                  disabled={
                                    isBusy
                                  }
                                >
                                  {isBusy
                                    ? "..."
                                    : "Activate"}
                                </button>
                              )}

                            <button
                              type="button"
                              className="users-action-btn password"
                              onClick={() =>
                                openPasswordModal(
                                  user
                                )
                              }
                            >
                              Password
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                className="users-action-btn delete"
                                onClick={() =>
                                  openDeleteModal(
                                    user
                                  )
                                }
                              >
                                Delete
                              </button>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* CREATE / EDIT MODAL */}

      {showForm && (

        <div
          className="users-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >

          <div className="users-modal users-form-modal">

            <div className="users-modal-header">

              <div>
                <span>
                  {editingUser
                    ? "USER MANAGEMENT"
                    : "NEW ACCOUNT"}
                </span>

                <h2>
                  {editingUser
                    ? "Edit User"
                    : "Add User"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="users-form"
            >

              <div className="users-form-grid">

                <div className="users-form-group full">

                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="fullname"
                    value={form.fullname}
                    onChange={
                      handleFormChange
                    }
                    placeholder="Enter full name"
                    autoComplete="name"
                  />

                </div>

                <div className="users-form-group">

                  <label>
                    Username
                  </label>

                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={
                      handleFormChange
                    }
                    placeholder="Enter username"
                    autoComplete="username"
                    disabled={Boolean(
                      editingUser
                    )}
                  />

                </div>

                <div className="users-form-group">

                  <label>
                    Role
                  </label>

                  <select
                    name="role"
                    value={form.role}
                    onChange={
                      handleFormChange
                    }
                  >

                    {ROLE_OPTIONS.map(
                      (role) => (
                        <option
                          key={role.value}
                          value={
                            role.value
                          }
                        >
                          {role.label}
                        </option>
                      )
                    )}

                    {editingUser?.role ===
                      ROLES.SUPER_ADMIN && (
                      <option
                        value={
                          ROLES.SUPER_ADMIN
                        }
                      >
                        Super Admin
                      </option>
                    )}

                  </select>

                </div>

                <div className="users-form-group">

                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={
                      handleFormChange
                    }
                    disabled={
                      Boolean(editingUser) &&
                      getUserId(
                        editingUser
                      ) === currentUserId
                    }
                  >

                    {STATUS_OPTIONS.map(
                      (status) => (
                        <option
                          key={
                            status.value
                          }
                          value={
                            status.value
                          }
                        >
                          {status.label}
                        </option>
                      )
                    )}

                  </select>

                </div>

                <div className="users-form-group">

                  <label>
                    {editingUser
                      ? "Password"
                      : "Initial Password"}
                  </label>

                  <input
                    type="password"
                    name="password"
                    value={
                      form.password
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder={
                      editingUser
                        ? "Use Password button to change password"
                        : "Enter initial password"
                    }
                    autoComplete="new-password"
                    disabled={
                      Boolean(editingUser)
                    }
                  />

                </div>

              </div>

              <div className="users-form-note">

                <strong>
                  Role permissions
                </strong>

                <p>
                  Registration Officers
                  can register residents.
                  Verification Officers can
                  verify records. Viewers
                  have read-only access.
                </p>

              </div>

              <div className="users-modal-footer">

                <button
                  type="button"
                  className="users-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="users-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingUser
                    ? "Save Changes"
                    : "Create User"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* DETAILS MODAL */}

      {showDetails &&
        selectedUser && (

        <div
          className="users-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >

          <div className="users-modal users-details-modal">

            <div className="users-modal-header">

              <div>
                <span>
                  ACCOUNT INFORMATION
                </span>

                <h2>
                  User Profile
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetails}
              >
                ×
              </button>

            </div>

            <div className="users-details-content">

              <div className="users-details-profile">

                {renderAvatar(
                  selectedUser,
                  "large"
                )}

                <div>

                  <h3>
                    {getUserName(
                      selectedUser
                    )}
                  </h3>

                  <p>
                    @
                    {selectedUser.username ||
                      "N/A"}
                  </p>

                  <span
                    className={`users-status-badge ${getStatus(
                      selectedUser
                    )}`}
                  >
                    <span />

                    {getStatusLabel(
                      selectedUser
                    )}
                  </span>

                </div>

              </div>

              <div className="users-details-grid">

                <div>
                  <span>
                    Full Name
                  </span>

                  <strong>
                    {getUserName(
                      selectedUser
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Username
                  </span>

                  <strong>
                    @
                    {selectedUser.username ||
                      "N/A"}
                  </strong>
                </div>

                <div>
                  <span>
                    Role
                  </span>

                  <strong>
                    {getRoleLabel(
                      selectedUser.role
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Status
                  </span>

                  <strong>
                    {getStatusLabel(
                      selectedUser
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Created
                  </span>

                  <strong>
                    {formatDate(
                      selectedUser.createdAt
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Last Updated
                  </span>

                  <strong>
                    {formatDate(
                      selectedUser.updatedAt
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Photo
                  </span>

                  <strong>
                    {getPhoto(
                      selectedUser
                    )
                      ? "Uploaded"
                      : "Not uploaded"}
                  </strong>
                </div>

                <div>
                  <span>
                    Account ID
                  </span>

                  <strong>
                    {getUserId(
                      selectedUser
                    ) || "N/A"}
                  </strong>
                </div>

              </div>

            </div>

            <div className="users-modal-footer">

              <button
                type="button"
                className="users-secondary-button"
                onClick={closeDetails}
              >
                Close
              </button>

              <button
                type="button"
                className="users-primary-button"
                onClick={() => {
                  closeDetails();
                  openEditForm(
                    selectedUser
                  );
                }}
              >
                Edit User
              </button>

            </div>

          </div>

        </div>

      )}

      {/* PASSWORD MODAL */}

      {showPasswordModal &&
        selectedUser && (

        <div className="users-modal-overlay">

          <div className="users-modal users-small-modal">

            <div className="users-modal-header">

              <div>
                <span>
                  SECURITY
                </span>

                <h2>
                  Change Password
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closePasswordModal
                }
                disabled={saving}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handlePasswordChange
              }
              className="users-form"
            >

              <div className="users-password-user">

                {renderAvatar(
                  selectedUser
                )}

                <div>

                  <strong>
                    {getUserName(
                      selectedUser
                    )}
                  </strong>

                  <span>
                    @
                    {selectedUser.username}
                  </span>

                </div>

              </div>

              <div className="users-form-group">

                <label>
                  New Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />

              </div>

              <div className="users-form-group">

                <label>
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />

              </div>

              <div className="users-security-note">
                The Super Admin is changing
                this user's password
                administratively. The user's
                current password is not
                required.
              </div>

              <div className="users-modal-footer">

                <button
                  type="button"
                  className="users-secondary-button"
                  onClick={
                    closePasswordModal
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="users-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Changing..."
                    : "Change Password"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* DELETE MODAL */}

      {showDeleteModal &&
        selectedUser && (

        <div className="users-modal-overlay">

          <div className="users-modal users-small-modal users-danger-modal">

            <div className="users-danger-icon">
              !
            </div>

            <h2>
              Delete User Account?
            </h2>

            <p>
              You are about to permanently
              delete the account belonging
              to{" "}
              <strong>
                {getUserName(
                  selectedUser
                )}
              </strong>.
            </p>

            <p>
              This action should only be
              performed when the account is
              no longer required.
            </p>

            <div className="users-modal-footer">

              <button
                type="button"
                className="users-secondary-button"
                onClick={
                  closeDeleteModal
                }
                disabled={
                  actionLoading ===
                  `${getUserId(
                    selectedUser
                  )}-delete`
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="users-danger-button"
                onClick={handleDelete}
                disabled={
                  actionLoading ===
                  `${getUserId(
                    selectedUser
                  )}-delete`
                }
              >
                {actionLoading ===
                `${getUserId(
                  selectedUser
                )}-delete`
                  ? "Deleting..."
                  : "Yes, Delete User"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* PHOTO MODAL */}

      {showPhotoModal &&
        selectedUser && (

        <div className="users-modal-overlay">

          <div className="users-modal users-photo-modal">

            <div className="users-modal-header">

              <div>
                <span>
                  PROFILE PHOTO
                </span>

                <h2>
                  Manage Photo
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closePhotoModal
                }
                disabled={
                  photoLoading ===
                  getUserId(
                    selectedUser
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="users-photo-manager">

              <div className="users-photo-preview">

                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="User preview"
                  />
                ) : (
                  <div>
                    {getInitials(
                      selectedUser
                    )}
                  </div>
                )}

              </div>

              <h3>
                {getUserName(
                  selectedUser
                )}
              </h3>

              <p>
                Upload a clear profile
                photo.
              </p>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handlePhotoSelect
                }
                hidden
              />

              <div className="users-photo-actions">

                <button
                  type="button"
                  className="users-secondary-button"
                  onClick={() =>
                    photoInputRef.current?.click()
                  }
                  disabled={
                    photoLoading ===
                    getUserId(
                      selectedUser
                    )
                  }
                >
                  Choose Photo
                </button>

                {photoFile && (
                  <button
                    type="button"
                    className="users-primary-button"
                    onClick={
                      uploadPhoto
                    }
                    disabled={
                      photoLoading ===
                      getUserId(
                        selectedUser
                      )
                    }
                  >
                    {photoLoading ===
                    getUserId(
                      selectedUser
                    )
                      ? "Uploading..."
                      : "Upload Photo"}
                  </button>
                )}

                {getPhoto(
                  selectedUser
                ) && (
                  <button
                    type="button"
                    className="users-danger-outline-button"
                    onClick={() =>
                      removePhoto(
                        selectedUser
                      )
                    }
                    disabled={
                      photoLoading ===
                      getUserId(
                        selectedUser
                      )
                    }
                  >
                    Remove Photo
                  </button>
                )}

              </div>

              <small>
                JPG, PNG or WebP • Maximum
                5MB
              </small>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default UsersPage;