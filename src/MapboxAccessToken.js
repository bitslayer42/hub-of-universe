
import 'dotenv/config';
let mapbox_access_token;
if (process.env.NODE_ENV === 'development') {
    mapbox_access_token = process.env.DEV;
}
else if (process.env.NODE_ENV === 'production') {
    mapbox_access_token = process.env.PROD;
}
export { mapbox_access_token };