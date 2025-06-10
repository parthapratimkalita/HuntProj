import { useEffect, useRef, useState } from "react";
import { Property } from "@shared/schema";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PropertyMapProps {
  properties: Property[];
  selectedProperty?: number;
  onPropertySelect?: (propertyId: number) => void;
  center?: [number, number];
  zoom?: number;
}

export default function PropertyMap({
  properties,
  selectedProperty,
  onPropertySelect,
  center = [39.8283, -98.5795], // Default center of USA
  zoom = 2, // Zoomed out further to show all of North America
}: PropertyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [cardPosition, setCardPosition] = useState({ left: 0, top: 0 });

  // Handle closing the property card
  const handleCloseCard = () => {
    setActiveProperty(null);
  };

  // Handle clicking on the property card to go to details
  const handleCardClick = (propertyId: number) => {
    window.location.href = `/properties/${propertyId}`;
  };

  useEffect(() => {
    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      // Create map with minimum zoom level of 2 (very zoomed out)
      mapRef.current = L.map("map", {
        minZoom: 4, // Restrict from zooming out further
        maxZoom: 15, // Maximum zoom in level
        worldCopyJump: true, // Allows the map to jump to the other side of the world
      }).setView(center, zoom);

      // Add the tile layer (OpenStreetMap)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => {
      marker.remove();
    });
    markersRef.current = {};

    // Add markers for each property
    properties.forEach((property) => {
      if (property.latitude && property.longitude) {
        try {
          const lat = parseFloat(property.latitude.toString());
          const lng = parseFloat(property.longitude.toString());

          // Skip if coordinates are invalid
          if (isNaN(lat) || isNaN(lng)) return;

          // Create custom marker with price
          const markerHtmlContent = `
            <div class="property-marker ${selectedProperty === property.id ? "selected" : ""}">
              $${property.price}
            </div>
          `;

          const customIcon = L.divIcon({
            html: markerHtmlContent,
            className: "property-marker-container",
            iconSize: [60, 24],
            iconAnchor: [30, 12],
          });

          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(
            mapRef.current!,
          );

          // Add click handler
          marker.on("click", (e) => {
            // Calculate position for property card
            if (mapRef.current && containerRef.current) {
              const map = mapRef.current;
              const containerBounds =
                containerRef.current.getBoundingClientRect();
              const point = map.latLngToContainerPoint([lat, lng]);

              // Position the card above the marker
              const cardWidth = 320;
              const cardHeight = 350; // Approximate height

              // Center the card horizontally on the marker
              let left = point.x - cardWidth / 2;

              // Ensure card doesn't go off the edges
              if (left < 20) left = 20;
              if (left + cardWidth > containerBounds.width - 20) {
                left = containerBounds.width - cardWidth - 20;
              }

              // Position card above the marker
              const top = point.y - cardHeight - 20;

              setCardPosition({ left, top });
              setActiveProperty(property);
            }

            if (onPropertySelect) {
              onPropertySelect(property.id);
            }
          });

          markersRef.current[property.id] = marker;
        } catch (error) {
          console.error(
            "Error creating marker for property:",
            property.id,
            error,
          );
        }
      }
    });

    // Apply special styling to selected property marker
    if (selectedProperty && markersRef.current[selectedProperty]) {
      const marker = markersRef.current[selectedProperty];
      const markerElement = marker.getElement();
      if (markerElement) {
        const markerContent = markerElement.querySelector(".property-marker");
        if (markerContent) {
          markerContent.classList.add("selected");
        }
      }
    }

    // Handle click on map to close property card
    if (mapRef.current) {
      mapRef.current.on("click", (e) => {
        // Check if click was on a marker
        const target = e.originalEvent.target as HTMLElement;
        if (!target.closest(".property-marker")) {
          setActiveProperty(null);
        }
      });
    }

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [properties, selectedProperty, onPropertySelect, center, zoom]);

  // Get property image
  const getPropertyImage = (property: Property) => {
    const propertyImages = (property.images as string[]) || [];
    const profileImageIndex = property.profileImageIndex || 0;

    return propertyImages.length > 0
      ? propertyImages[profileImageIndex] || propertyImages[0]
      : "https://images.unsplash.com/photo-1604868365551-590c19e69168";
  };

  return (
    <div
      id="map-container"
      ref={containerRef}
      className="w-full h-full relative"
    >
      <div id="map" className="w-full h-full rounded-xl overflow-hidden"></div>

      {/* Floating Property Card */}
      {activeProperty && (
        <div
          className="property-card-floating"
          style={{
            left: `${cardPosition.left}px`,
            top: `${cardPosition.top > 0 ? cardPosition.top : 50}px`,
          }}
        >
          <button onClick={handleCloseCard} className="property-card-close-btn">
            ×
          </button>

          <div
            className="property-card-image"
            style={{
              backgroundImage: `url('${getPropertyImage(activeProperty)}')`,
            }}
          >
            <div className="property-card-price">${activeProperty.price}</div>
          </div>

          <div
            className="property-card-content"
            onClick={() => handleCardClick(activeProperty.id)}
          >
            <div className="flex justify-between items-start">
              <h3 className="property-card-title">{activeProperty.title}</h3>
              <div className="property-card-rating">
                <span className="property-card-stars">★★★★★</span>
                <span className="property-card-reviews">(5)</span>
              </div>
            </div>
            <p className="property-card-location">
              {activeProperty.city || ""}, {activeProperty.state || ""}
            </p>
            <p className="property-card-type">
              {activeProperty.propertyType || "Hunting Property"}
            </p>
            <p className="property-card-night-price">
              ${activeProperty.price} night
            </p>
          </div>
        </div>
      )}

      {/* CSS Styles */}
      <style>{`
        .property-marker-container {
          background: transparent;
        }
        
        .property-marker {
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 9999px;
          padding: 5px 12px;
          font-weight: 500;
          font-size: 13px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          white-space: nowrap;
          transition: all 0.2s ease;
          cursor: pointer;
          min-width: 48px;
          text-align: center;
          display: inline-block;
        }
        
        .property-marker.selected {
          background-color: #ff385c;
          color: white;
          transform: scale(1.1);
          z-index: 1000;
        }
        
        .property-marker:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        }
        
        /* Floating Card Styling - Airbnb Style */
        .property-card-floating {
          position: absolute;
          width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          z-index: 1000;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .property-card-close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          background: white;
          border: none;
          border-radius: 50%;
          font-size: 20px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 10;
        }
        
        .property-card-close-btn:hover {
          background: #f5f5f5;
        }
        
        .property-card-image {
          height: 200px;
          background-size: cover;
          background-position: center;
          position: relative;
        }
        
        .property-card-price {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .property-card-content {
          padding: 16px;
        }
        
        .property-card-title {
          font-weight: bold;
          font-size: 16px;
          margin: 0 0 5px 0;
          color: #222;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .property-card-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
        }
        
        .property-card-stars {
          color: #ff385c;
        }
        
        .property-card-reviews {
          color: #717171;
        }
        
        .property-card-location {
          color: #717171;
          font-size: 14px;
          margin: 5px 0;
        }
        
        .property-card-type {
          color: #717171;
          font-size: 14px;
          margin: 0 0 5px 0;
        }
        
        .property-card-night-price {
          font-weight: bold;
          margin: 8px 0 0 0;
        }
        
        .property-card-floating:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 25px rgba(0,0,0,0.25);
        }
      `}</style>
    </div>
  );
}
