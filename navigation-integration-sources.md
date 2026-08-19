# Navigation Integration Sources

- Google Maps JavaScript Directions example confirms that `DirectionsService` accepts driving, walking, bicycling, and transit travel modes and updates routes when the selected mode changes. Source: https://developers.google.com/maps/documentation/javascript/examples/directions-travel-modes
- Google Maps URLs documentation confirms the universal directions format `https://www.google.com/maps/dir/?api=1`, supports `origin`, `destination`, `travelmode`, and `dir_action=navigate`, and opens the app when available or a browser otherwise. Source: https://developers.google.com/maps/documentation/urls/get-started
- NAVER Maps URL Scheme documentation confirms `nmap://navigation` supports current-location navigation and accepts `slat`, `slng`, `dlat`, `dlng`, `sname`, `dname`, and `appname`; the scheme requires the NAVER Maps app to be installed. Source: https://guide.ncloud-docs.com/docs/en/maps-url-scheme
