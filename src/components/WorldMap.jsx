import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

// Axios базов URL от .env
const API_URL = process.env.BACKEND_URL || "http://localhost:5000";

// ClickHandler за click извън маркер + добавяне на нови инциденти
function ClickHandler({ addIncident, clearSelection }) {
  const map = useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;

      clearSelection();

      const confirmed = window.confirm("Искаш ли да отбележиш нередност тук?");
      if (!confirmed) return;

      const description = prompt("Опиши проблема:");
      if (!description) return;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*,video/*";
      fileInput.onchange = async () => {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append("lat", lat);
        formData.append("lng", lng);
        formData.append("description", description);
        if (file) formData.append("media", file);

        try {
          const res = await axios.post(`${API_URL}/incidents`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          addIncident(res.data);
        } catch (err) {
          alert("Грешка при качване на нередност");
          console.error(err);
        }
      };
      fileInput.click();
    },
  });
  return null;
}

// Създаване на custom marker с анимация
function createIcon(incident, isSelected) {
  if (isSelected) {
    return L.divIcon({
      className: "custom-marker selected",
      html: `
        <div style="
          width: 250px;
          border: 2px solid #FF4500;
          border-radius: 10px;
          overflow: hidden;
          background-color: #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          position: relative;
          cursor: pointer;
          transition: all 0.3s ease-in-out;
        ">
          <div style="
            position: absolute;
            top: 5px;
            right: 5px;
            width: 20px;
            height: 20px;
            background-color: #ff4500;
            color: #fff;
            font-weight: bold;
            text-align: center;
            line-height: 20px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10;
          " id="close-btn">×</div>

          <div style="padding: 8px; font-weight: bold; text-align: center;">
            ${incident.description}
          </div>
          ${
            incident.mediaUrl
              ? `<img src="${incident.mediaUrl}" style="width: 100%; display: block;" />`
              : ""
          }
        </div>
      `,
      iconSize: [250, 150],
      iconAnchor: [125, 75],
    });
  } else {
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="
        width: 40px;
        height: 40px;
        border: 2px solid #FF4500;
        border-radius: 5px;
        overflow: hidden;
        background-image: url('${
          incident.mediaUrl || "https://via.placeholder.com/40"
        }');
        background-size: cover;
        background-position: center;
        box-shadow: 0 0 5px rgba(255,69,0,0.6);
        cursor: pointer;
        transition: all 0.3s ease-in-out;
      "></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }
}

export default function WorldMap() {
  const [incidents, setIncidents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const addIncident = (incident) => {
    setIncidents([incident, ...incidents]);
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/incidents`)
      .then((res) => setIncidents(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div
      style={{
        width: "80%",
        maxWidth: "900px",
        height: "600px",
        margin: "50px auto",
        border: "2px solid #ccc",
        borderRadius: "10px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        backgroundColor: "#fff",
      }}
    >
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%", borderRadius: "10px" }}
        scrollWheelZoom={true}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.0}
        minZoom={2}
        worldCopyJump={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <ClickHandler
          addIncident={addIncident}
          clearSelection={() => setSelectedId(null)}
        />

        {incidents.map((inc) => {
          const isSelected = selectedId === inc.id;

          return (
            <Marker
              key={inc.id}
              position={[inc.lat, inc.lng]}
              icon={createIcon(inc, isSelected)}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedId(isSelected ? null : inc.id);
                },
              }}
            >
              {isSelected && (
                <div
                  ref={(el) => {
                    if (el) {
                      const btn = el.querySelector("#close-btn");
                      if (btn) {
                        btn.onclick = (e) => {
                          e.stopPropagation();
                          setSelectedId(null);
                        };
                      }
                    }
                  }}
                />
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
