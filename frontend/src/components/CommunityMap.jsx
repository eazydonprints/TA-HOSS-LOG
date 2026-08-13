import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const CommunityMap = ({ households = [] }) => {

  console.log(
    "TA-HOSS HOUSEHOLDS:",
    households
  );

  const validHouseholds = households.filter(
    household => {

      const latitude =
        Number(household.latitude);

      const longitude =
        Number(household.longitude);

      return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      );
    }
  );

  console.log(
    "TA-HOSS VALID HOUSEHOLDS:",
    validHouseholds
  );

  const first =
    validHouseholds[0];

  const center = first
    ? [
        Number(first.latitude),
        Number(first.longitude)
      ]
    : [
        9.123456,
        8.123456
      ];

  return (
    <div
      style={{
        width: "100%",
        height: "600px",
        minHeight: "600px",
        position: "relative"
      }}
    >

      <MapContainer
        center={center}
        zoom={17}
        scrollWheelZoom={true}
        style={{
          width: "100%",
          height: "600px",
          minHeight: "600px"
        }}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validHouseholds.map(
          household => {

            const latitude =
              Number(
                household.latitude
              );

            const longitude =
              Number(
                household.longitude
              );

            console.log(
              "RENDERING MARKER:",
              household.householdId,
              latitude,
              longitude
            );

            return (
              <Marker
                key={household.householdId}
                position={[
                  latitude,
                  longitude
                ]}
                icon={icon}
              >

                <Popup>

                  <div
                    style={{
                      minWidth: "220px"
                    }}
                  >

                    <h3>
                      {household.householdId}
                    </h3>

                    <p>
                      <strong>
                        Compound:
                      </strong>{" "}
                      {household.compound}
                    </p>

                    <p>
                      <strong>
                        House:
                      </strong>{" "}
                      {household.houseNumber}
                    </p>

                    <p>
                      <strong>
                        Residents:
                      </strong>{" "}
                      {household.residentCount}
                    </p>

                    <p>
                      <strong>
                        Verified:
                      </strong>{" "}
                      {household.verifiedCount}
                    </p>

                    <p>
                      <strong>
                        GPS Accuracy:
                      </strong>{" "}
                      ±{household.accuracy}m
                    </p>

                    <p>
                      <strong>
                        Coordinates:
                      </strong>
                      <br />
                      {latitude.toFixed(6)},
                      {" "}
                      {longitude.toFixed(6)}
                    </p>

                    <div
                      style={{
                        padding: "6px",
                        background: "#e9f8f0",
                        color: "#087443",
                        borderRadius: "5px",
                        textAlign: "center",
                        fontWeight: "bold"
                      }}
                    >
                      ● GPS MAPPED
                    </div>

                  </div>

                </Popup>

              </Marker>
            );

          }
        )}

      </MapContainer>

      <div
        style={{
          position: "absolute",
          right: "15px",
          bottom: "15px",
          zIndex: 1000,
          padding: "10px 14px",
          background: "white",
          borderRadius: "8px",
          boxShadow:
            "0 2px 10px rgba(0,0,0,.2)"
        }}
      >

        <strong>
          {validHouseholds.length}
        </strong>

        {" "}
        mapped households

      </div>

    </div>
  );
};

export default CommunityMap;