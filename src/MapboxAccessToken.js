
let mapbox_access_token;
if (import.meta.env.MODE === 'development') {
    mapbox_access_token = import.meta.env.VITE_DEV_KEY;
}
else if (import.meta.env.MODE === 'production') {
    mapbox_access_token = import.meta.env.VITE_PROD_KEY;
}
export { mapbox_access_token };