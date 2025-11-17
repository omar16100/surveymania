"use client"
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapPreviewProps {
  latitude: number
  longitude: number
  zoom?: number
  height?: string
}

export default function MapPreview({
  latitude,
  longitude,
  zoom = 13,
  height = '400px'
}: MapPreviewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Initialize map
    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom,
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: false
    })

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Add marker
    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    L.marker([latitude, longitude], { icon: customIcon })
      .addTo(map)
      .bindPopup(`Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
      .openPopup()

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [latitude, longitude, zoom])

  return <div ref={containerRef} style={{ height, width: '100%' }} />
}
