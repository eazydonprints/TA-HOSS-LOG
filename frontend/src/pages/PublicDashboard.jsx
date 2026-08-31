import {
  useAuth,
} from "../context/AuthContext";

import "./PublicDashboard.css";


const PublicDashboard = () => {
  const {
    user,
  } = useAuth();


  return (
    <div className="public-dashboard">

      <div className="public-dashboard-header">

        <div>

          <h1>
            Welcome,{" "}
            {user?.firstName ||
              user?.fullname}
          </h1>

          <p>
            Welcome to the TA-HOSS LOG
            Public Platform.
          </p>

        </div>

      </div>


      <div className="public-dashboard-grid">

        <div className="public-dashboard-card">

          <h3>
            📰 Social Feed
          </h3>

          <p>
            Connect with people,
            share updates and interact
            with the community.
          </p>

        </div>


        <div className="public-dashboard-card">

          <h3>
            👥 People
          </h3>

          <p>
            Discover and connect with
            other users.
          </p>

        </div>


        <div className="public-dashboard-card">

          <h3>
            💬 Messages
          </h3>

          <p>
            Send and receive private
            messages.
          </p>

        </div>


        <div className="public-dashboard-card">

          <h3>
            🔔 Notifications
          </h3>

          <p>
            Stay updated with activities
            and interactions.
          </p>

        </div>

      </div>

    </div>
  );
};


export default PublicDashboard;