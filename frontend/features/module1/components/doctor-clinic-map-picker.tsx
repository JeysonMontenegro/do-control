"use client";

import { useMemo, useState } from "react";

import { Autocomplete, GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";

type DoctorClinicMapPickerProps = {
  address?: string;
  latitude: string;
  longitude: string;
  onAddressChange?: (address: string) => void;
  onChange: (coordinates: { latitude: string; longitude: string }) => void;
};

const libraries: ("places")[] = ["places"];
const DEFAULT_CENTER = { lat: 14.6349, lng: -90.5069 };
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export function DoctorClinicMapPicker({
  address,
  latitude,
  longitude,
  onAddressChange,
  onChange,
}: DoctorClinicMapPickerProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "doctor-clinic-google-map",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const hasCoordinates = latitude.trim() !== "" && longitude.trim() !== "" && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const center = useMemo(() => {
    if (hasCoordinates) {
      return { lat: Number(latitude), lng: Number(longitude) };
    }
    return DEFAULT_CENTER;
  }, [hasCoordinates, latitude, longitude]);

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
    : address?.trim()
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
      : null;

  return (
    <div className="doctor-map-picker">
      <div className="doctor-map-picker-copy">
        <strong>Selecciona la ubicación en Google Maps</strong>
        <span>Busca la clínica por nombre o dirección, luego haz clic en el mapa para fijar el punto exacto.</span>
      </div>

      {!GOOGLE_MAPS_API_KEY ? (
        <div className="doctor-map-picker-fallback">
          Falta configurar <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en el entorno del frontend.
        </div>
      ) : loadError ? (
        <div className="doctor-map-picker-fallback">
          No se pudo cargar Google Maps en este momento.
        </div>
      ) : isLoaded ? (
        <>
          <Autocomplete
            onLoad={setAutocomplete}
            onPlaceChanged={() => {
              const place = autocomplete?.getPlace();
              const location = place?.geometry?.location;
              if (!location) {
                return;
              }
              const formattedAddress = place.formatted_address?.trim();
              if (formattedAddress && onAddressChange) {
                onAddressChange(formattedAddress);
              }
              onChange({
                latitude: location.lat().toFixed(6),
                longitude: location.lng().toFixed(6),
              });
            }}
          >
            <input
              className="doctor-map-search-input"
              placeholder="Buscar clínica o dirección exacta"
              defaultValue={address ?? ""}
            />
          </Autocomplete>
          <div className="doctor-map-picker-shell">
            <GoogleMap
              center={center}
              mapContainerClassName="doctor-map-canvas"
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
              zoom={hasCoordinates ? 17 : 13}
              onClick={(event) => {
                if (!event.latLng) {
                  return;
                }
                onChange({
                  latitude: event.latLng.lat().toFixed(6),
                  longitude: event.latLng.lng().toFixed(6),
                });
              }}
            >
              {hasCoordinates ? <MarkerF position={center} /> : null}
            </GoogleMap>
          </div>
        </>
      ) : (
        <div className="doctor-map-picker-fallback">Cargando Google Maps...</div>
      )}

      <div className="doctor-map-picker-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            if (!navigator.geolocation) {
              return;
            }
            navigator.geolocation.getCurrentPosition((position) => {
              onChange({
                latitude: position.coords.latitude.toFixed(6),
                longitude: position.coords.longitude.toFixed(6),
              });
            });
          }}
        >
          Usar mi ubicación actual
        </button>
        {googleMapsUrl ? (
          <a className="secondary-button" href={googleMapsUrl} target="_blank" rel="noreferrer">
            Abrir en Google Maps
          </a>
        ) : null}
      </div>
    </div>
  );
}
