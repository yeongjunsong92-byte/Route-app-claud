/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;
let mapScriptPromise: Promise<void> | null = null;

function loadMapScript() {
  if (window.google?.maps) return Promise.resolve();
  if (mapScriptPromise) return mapScriptPromise;

  mapScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (window.google?.maps) resolve();
      else reject(new Error("Google Maps loaded without the maps namespace"));
      script.remove();
    };
    script.onerror = () => {
      mapScriptPromise = null;
      script.remove();
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return mapScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  fallback?: ReactNode;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
  fallback,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    loadMapScript()
      .then(() => {
        if (!active) return;
        setStatus("ready");
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
    if (status !== "ready" || !mapContainer.current || !window.google?.maps) return;
    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: false,
      streetViewControl: false,
      mapId: "DEMO_MAP_ID",
    });
    onMapReady?.(map.current);
  }, [initialCenter, initialZoom, onMapReady, status]);

  if (status !== "ready") {
    return (
      <div className={cn("route-map-surface", className)}>
        {fallback || (
          <div className="route-map-state">
            <span className="route-map-state-dot" />
            <strong>{status === "loading" ? "지도를 불러오는 중" : "지도 미리보기"}</strong>
            <span>{status === "loading" ? "잠시만 기다려주세요" : "Google Maps API를 연결하면 실제 지도로 표시됩니다."}</span>
          </div>
        )}
      </div>
    );
  }

  return <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />;
}
