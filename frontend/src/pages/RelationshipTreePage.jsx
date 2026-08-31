import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api from "../services/api";

import "./RelationshipTreePage.css";

const RelationshipTreePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ==========================================
   * LOAD HOUSEHOLD RELATIONSHIP TREE
   * ==========================================
   */

  useEffect(() => {
    let mounted = true;

    const loadTree = async () => {
      if (!id) {
        if (mounted) {
          setError("Household ID is missing.");
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/households/${id}/tree`
        );

        console.log(
          "RELATIONSHIP TREE RESPONSE:",
          response.data
        );

        if (
          response.data?.success &&
          response.data?.data
        ) {
          if (mounted) {
            setTree(response.data.data);
          }
        } else {
          if (mounted) {
            setError(
              "Invalid relationship tree response."
            );
          }
        }
      } catch (err) {
        console.error(
          "RELATIONSHIP TREE ERROR:",
          err
        );

        if (mounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load relationship tree."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTree();

    return () => {
      mounted = false;
    };
  }, [id]);

  /*
   * ==========================================
   * HELPER - NORMALIZE ID
   * ==========================================
   */

  const getId = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (value._id) {
      return String(value._id);
    }

    if (value.id) {
      return String(value.id);
    }

    return String(value);
  };

  /*
   * ==========================================
   * HOUSEHOLD HEAD
   * ==========================================
   */

  const head = useMemo(() => {
    if (!tree?.members?.length) {
      return null;
    }

    return (
      tree.members.find(
        (member) => member.isHead === true
      ) || null
    );
  }, [tree]);

  /*
   * ==========================================
   * FIND MEMBER BY ID
   * ==========================================
   */

  const findMember = (memberId) => {
    if (!tree?.members) {
      return null;
    }

    const normalizedId = getId(memberId);

    return (
      tree.members.find(
        (member) =>
          getId(member.id) === normalizedId
      ) || null
    );
  };

  /*
   * ==========================================
   * CREATE UNIQUE RELATIONSHIP GROUPS
   * ==========================================
   *
   * A resident can have more than one
   * relationship record with the head.
   *
   * Example:
   *
   * John -> Mary = spouse
   * John -> Mary = child
   *
   * Mary appears once in the visual tree,
   * while the registered relationship section
   * below still shows both exact records.
   */

  const familyBranches = useMemo(() => {
    if (!tree?.members || !head) {
      return [];
    }

    const groups = new Map();

    const headId = getId(head.id);

    tree.relationships?.forEach(
      (relationship) => {
        const fromId = getId(
          relationship.from
        );

        const toId = getId(
          relationship.to
        );

        let connectedMemberId = null;

        if (fromId === headId) {
          connectedMemberId = toId;
        } else if (toId === headId) {
          connectedMemberId = fromId;
        }

        if (!connectedMemberId) {
          return;
        }

        if (
          connectedMemberId === headId
        ) {
          return;
        }

        const member =
          findMember(connectedMemberId);

        if (!member) {
          return;
        }

        if (
          !groups.has(
            connectedMemberId
          )
        ) {
          groups.set(
            connectedMemberId,
            {
              member,
              relationships: [],
            }
          );
        }

        const group =
          groups.get(
            connectedMemberId
          );

        const relationshipType =
          relationship.relationship;

        if (
          relationshipType &&
          !group.relationships.includes(
            relationshipType
          )
        ) {
          group.relationships.push(
            relationshipType
          );
        }
      }
    );

    return Array.from(
      groups.values()
    );
  }, [tree, head]);

  /*
   * ==========================================
   * MEMBERS NOT DIRECTLY CONNECTED TO HEAD
   * ==========================================
   */

  const unconnectedMembers = useMemo(() => {
    if (!tree?.members) {
      return [];
    }

    const connectedIds = new Set(
      familyBranches.map(
        (branch) =>
          getId(branch.member.id)
      )
    );

    const headId = head
      ? getId(head.id)
      : null;

    return tree.members.filter(
      (member) => {
        const memberId =
          getId(member.id);

        return (
          memberId !== headId &&
          !connectedIds.has(memberId)
        );
      }
    );
  }, [
    tree,
    familyBranches,
    head,
  ]);

  /*
   * ==========================================
   * FORMAT DATE
   * ==========================================
   */

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "N/A";
    }

    return parsedDate.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /*
   * ==========================================
   * FORMAT LABEL
   * ==========================================
   */

  const relationshipLabel = (
    relationship
  ) => {
    if (!relationship) {
      return "Member";
    }

    return String(
      relationship
    )
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  /*
   * ==========================================
   * VERIFICATION LABEL
   * ==========================================
   */

  const verificationLabel = (
    status
  ) => {
    if (!status) {
      return "Pending";
    }

    return relationshipLabel(
      status
    );
  };

  /*
   * ==========================================
   * MEMBER CARD
   * ==========================================
   */

  const MemberCard = ({
    member,
    relationships = [],
    headCard = false,
  }) => {
    if (!member) {
      return null;
    }

    const relationshipText =
      relationships.length > 0
        ? relationships
            .map(
              relationshipLabel
            )
            .join(" • ")
        : member.relationshipToHead
          ? relationshipLabel(
              member.relationshipToHead
            )
          : "Household Member";

    const residentId =
      getId(member.id);

    return (
      <Link
        to={`/resident/${residentId}`}
        className={`family-member-card ${
          headCard
            ? "family-head-card"
            : ""
        }`}
      >
        <div className="family-card-top">
          <div className="family-avatar">
            {member.name
              ?.charAt(0)
              ?.toUpperCase() ||
              "?"}
          </div>

          <span
            className={`family-verification ${
              member.verificationStatus ===
              "verified"
                ? "verified"
                : "pending"
            }`}
          >
            {verificationLabel(
              member.verificationStatus
            )}
          </span>
        </div>

        <div className="family-member-details">
          <strong>
            {member.name ||
              "Unknown Resident"}
          </strong>

          <span>
            {member.residentId ||
              "No Resident ID"}
          </span>

          <span className="family-role">
            {headCard
              ? "Household Head"
              : relationshipText}
          </span>

          <span>
            {member.gender
              ? relationshipLabel(
                  member.gender
                )
              : "N/A"}

            {" • "}

            {formatDate(
              member.dateOfBirth
            )}
          </span>
        </div>

        <span className="family-profile-link">
          View Profile →
        </span>
      </Link>
    );
  };

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />

          <p>
            Loading relationship tree...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ==========================================
   * ERROR
   * ==========================================
   */

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          {error}
        </div>

        <button
          className="back-button"
          onClick={() =>
            navigate(
              `/households/${id}`
            )
          }
        >
          ← Back to Household
        </button>
      </div>
    );
  }

  /*
   * ==========================================
   * NO TREE
   * ==========================================
   */

  if (!tree) {
    return (
      <div className="dashboard-page">
        <div className="empty-state">
          <strong>
            No relationship tree found
          </strong>

          <span>
            This household does not
            currently have relationship
            data available.
          </span>
        </div>
      </div>
    );
  }

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <div className="dashboard-header">
        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Household /
            Relationship Tree
          </div>

          <h1>
            Household Relationship Tree
          </h1>

          <p>
            Visual family and household
            relationship structure.
          </p>
        </div>

        <button
          className="back-button"
          onClick={() =>
            navigate(
              `/households/${id}`
            )
          }
        >
          ← Back to Household
        </button>
      </div>

      {/* SUMMARY */}

      <div className="dashboard-stats">

        <div className="stat-card">
          <span>
            Household
          </span>

          <strong>
            {tree.household
              ?.householdId ||
              "N/A"}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Members
          </span>

          <strong>
            {tree.memberCount ??
              tree.members?.length ??
              0}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Relationships
          </span>

          <strong>
            {tree.relationships
              ?.length || 0}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Community
          </span>

          <strong>
            {tree.household
              ?.community ||
              "Ta-hoss"}
          </strong>
        </div>

      </div>

      {/* VISUAL FAMILY TREE */}

      <section className="dashboard-panel">

        <div className="panel-header">
          <div>
            <h2>
              Family Relationship Structure
            </h2>

            <p>
              Click any resident card to
              open their profile.
            </p>
          </div>
        </div>

        <div className="family-tree-container">

          {head ? (
            <>
              {/* HOUSEHOLD HEAD */}

              <div className="family-tree-root">

                <MemberCard
                  member={head}
                  headCard
                />

              </div>

              {/* CONNECTION */}

              {familyBranches.length >
                0 && (
                <div className="tree-root-connector">
                  <div className="tree-line-vertical" />
                </div>
              )}

              {/* DIRECT RELATIONSHIPS */}

              {familyBranches.length >
                0 && (
                <div className="tree-level">

                  <div className="tree-horizontal-line" />

                  <div className="tree-members">

                    {familyBranches.map(
                      (branch) => (
                        <div
                          className="tree-member-branch"
                          key={getId(
                            branch.member.id
                          )}
                        >

                          <div className="tree-branch-line" />

                          <div className="tree-relationship-label">
                            {branch.relationships
                              .map(
                                relationshipLabel
                              )
                              .join(
                                " • "
                              )}
                          </div>

                          <MemberCard
                            member={
                              branch.member
                            }
                            relationships={
                              branch.relationships
                            }
                          />

                        </div>
                      )
                    )}

                  </div>
                </div>
              )}

              {/* NO DIRECT RELATIONSHIPS */}

              {familyBranches.length ===
                0 &&
                tree.members?.length >
                  1 && (
                <div className="tree-no-relationships">

                  <div className="tree-line-vertical" />

                  <p>
                    No registered
                    relationships connect
                    other members directly
                    to the household head.
                  </p>

                </div>
              )}
            </>
          ) : (
            <div className="empty-state">

              <strong>
                No household head found
              </strong>

              <span>
                This household does not
                currently have a member
                identified as the household
                head.
              </span>

            </div>
          )}

          {/* OTHER HOUSEHOLD MEMBERS */}

          {unconnectedMembers.length >
            0 && (
            <div className="unconnected-members">

              <div className="unconnected-title">
                Other Household Members
              </div>

              <div className="unconnected-grid">

                {unconnectedMembers.map(
                  (member) => (
                    <MemberCard
                      key={getId(
                        member.id
                      )}
                      member={member}
                      relationships={[
                        member.relationshipToHead ||
                          "member",
                      ]}
                    />
                  )
                )}

              </div>

            </div>
          )}

          {/* EMPTY HOUSEHOLD */}

          {(!tree.members ||
            tree.members.length ===
              0) && (
            <div className="empty-state">

              <strong>
                No household members
              </strong>

              <span>
                There are no residents
                available for this
                household.
              </span>

            </div>
          )}

        </div>
      </section>

      {/* REGISTERED RELATIONSHIPS */}

      <section className="dashboard-panel">

        <div className="panel-header">
          <div>
            <h2>
              Registered Relationships
            </h2>

            <p>
              Exact relationship records
              stored in TA-HOSS LOG.
            </p>
          </div>
        </div>

        {tree.relationships?.length >
        0 ? (
          <div className="registered-relationships">

            {tree.relationships.map(
              (relationship) => {

                const fromMember =
                  findMember(
                    relationship.from
                  );

                const toMember =
                  findMember(
                    relationship.to
                  );

                const fromId =
                  getId(
                    relationship.from
                  );

                const toId =
                  getId(
                    relationship.to
                  );

                return (
                  <div
                    className="registered-relationship"
                    key={
                      getId(
                        relationship.id
                      )
                    }
                  >

                    {/* FROM RESIDENT */}

                    <Link
                      to={`/resident/${fromId}`}
                      className="relationship-person"
                    >
                      <strong>
                        {fromMember?.name ||
                          "Unknown"}
                      </strong>

                      <span>
                        {fromMember
                          ?.residentId ||
                          ""}
                      </span>
                    </Link>

                    {/* RELATIONSHIP */}

                    <div className="relationship-type">

                      <span>
                        {relationshipLabel(
                          relationship.relationship
                        )}
                      </span>

                      <strong>
                        →
                      </strong>

                    </div>

                    {/* TO RESIDENT */}

                    <Link
                      to={`/resident/${toId}`}
                      className="relationship-person"
                    >
                      <strong>
                        {toMember?.name ||
                          "Unknown"}
                      </strong>

                      <span>
                        {toMember
                          ?.residentId ||
                          ""}
                      </span>
                    </Link>

                  </div>
                );
              }
            )}

          </div>
        ) : (
          <div className="empty-state">

            <strong>
              No relationships registered
            </strong>

            <span>
              No relationship records have
              been registered for this
              household.
            </span>

          </div>
        )}

      </section>

      {/* ACTIONS */}

      <section className="dashboard-panel">

        <div className="household-action-grid">

          <button
            onClick={() =>
              navigate(
                `/households/${id}`
              )
            }
          >
            <strong>
              🏠 Household
            </strong>

            <span>
              Return to household details
            </span>
          </button>

          {head && (
            <button
              onClick={() =>
                navigate(
                  `/resident/${getId(
                    head.id
                  )}`
                )
              }
            >
              <strong>
                👤 Household Head
              </strong>

              <span>
                View resident profile
              </span>
            </button>
          )}

          <button
            onClick={() =>
              navigate("/map")
            }
          >
            <strong>
              📍 Community Map
            </strong>

            <span>
              View household GPS locations
            </span>
          </button>

        </div>

      </section>

    </div>
  );
};

export default RelationshipTreePage;