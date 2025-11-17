
let mapbox_access_token, google_access_token;

if (import.meta.env.MODE === 'development') {
    mapbox_access_token = import.meta.env.VITE_MAPBOX_DEV;
    google_access_token = import.meta.env.VITE_GOOGLE_DEV;
}
else if (import.meta.env.MODE === 'production') {
    mapbox_access_token = import.meta.env.VITE_MAPBOX_PROD;
    google_access_token = import.meta.env.VITE_GOOGLE_PROD;
}

export { mapbox_access_token, google_access_token };