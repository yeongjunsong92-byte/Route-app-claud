/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
    gm_authFailure?: () => void;
  }
}

const FRONTEND_MAP_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY as string | undefined;
const MAPS_SCRIPT_PARAMS = new URLSearchParams({ origin: window.location.origin });
if (FRONTEND_MAP_KEY) MAPS_SCRIPT_PARAMS.set("key", FRONTEND_MAP_KEY);
const MAPS_SCRIPT_URL = `/api/maps/script?${MAPS_SCRIPT_PARAMS.toString()}`;
let mapScriptPromise: Promise<void> | null = null;

function waitForGoogleMaps(timeoutMs = 15000) {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (window.google?.maps) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("Google Maps namespace was not ready before timeout"));
        return;
      }
      window.setTimeout(check, 50);
    };
    check();
  });
}

function loadMapScript() {
  if (window.google?.maps) return Promise.resolve();
  if (mapScriptPromise) return mapScriptPromise;

  mapScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("route-google-maps-script") as HTMLScriptElement | null;
    if (existing) {
      waitForGoogleMaps().then(resolve).catch(reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "route-google-maps-script";
    script.src = MAPS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => waitForGoogleMaps().then(resolve).catch(reject);
    script.onerror = () => reject(new Error("Google Maps same-origin proxy request failed"));
    document.head.appendChild(script);
  }).catch((error) => {
    mapScriptPromise = null;
    throw error;
  });

  return mapScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  onMapClick?: (event: google.maps.MapMouseEvent) => void;
  fallback?: ReactNode;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
  onMapClick,
  fallback,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const onMapClickRef = useRef(onMapClick);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [tilesLoaded, setTilesLoaded] = useState(false);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    let active = true;
    loadMapScript()
      .then(() => {
        if (active) setStatus("ready");
      })
      .catch((error) => {
        console.warn("[Route Map] Google Maps unavailable; using fallback map.", error);
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !mapContainer.current || !window.google?.maps || map.current) return;
    try {
      const mapInstance = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: false,
        streetViewControl: false,
        clickableIcons: false,
      });
      map.current = mapInstance;
      const checkForTiles = () => {
        const hasGoogleTile = Boolean(mapContainer.current?.querySelector('img[src*="/maps/vt"], img[src*="maps.googleapis.com/maps/vt"], img[src*="mt0.google.com/vt"], img[src*="mt1.google.com/vt"]'));
        if (hasGoogleTile) setTilesLoaded(true);
      };
      const tilesListener = mapInstance.addListener("tilesloaded", () => window.setTimeout(checkForTiles, 180));
      const clickListener = mapInstance.addListener("click", (event: google.maps.MapMouseEvent) => onMapClickRef.current?.(event));
      const tileCheckInterval = window.setInterval(checkForTiles, 400);
      onMapReadyRef.current?.(mapInstance);
      return () => {
        tilesListener.remove();
        clickListener.remove();
        window.clearInterval(tileCheckInterval);
      };
    } catch (error) {
      console.warn("[Route Map] Map initialization failed; using fallback map.", error);
      setStatus("error");
    }
  }, [status]);

  useEffect(() => {
    if (!map.current) return;
    map.current.setCenter(initialCenter);
    map.current.setZoom(initialZoom);
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

  if (status !== "ready") {
    return (
      <div className={cn("route-map-surface", className)}>
        {fallback || (
          <div className="route-map-state">
            <span className="route-map-state-dot" />
            <strong>{status === "loading" ? "지도를 불러오는 중" : "지도 미리보기"}</strong>
            <span>{status === "loading" ? "잠시만 기다려주세요" : "Google Maps 연결을 확인해주세요."}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("route-map-live", className)}>
      <div ref={mapContainer} className="route-map-live-canvas" />
      {fallback && <div className={cn("route-map-live-fallback", !tilesLoaded && "is-visible")}>{fallback}</div>}
    </div>
  );
}
