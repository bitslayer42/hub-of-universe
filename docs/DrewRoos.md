

# High-precision work for high zoom levels. 

Assume a flat earth and don't deal with map projection 

In javascript, compute your center point using double precision, then split this into two single precision values, 
one for the index of the tile containing the center point, and then the center point's offset within that tile. 

To compute tile coordinates near the center point, you can compute a new point at a given distance and bearing 
from the center using single precision math. Just be sure to not recombine the tile index and tile offset into 
one variable or you'll lose precision again.

```javascript
    //javascript
    dbl_center = getTileXY(lat, lon, zoom);  //    [3.2, 1.7]
    flt_center_tile = floor(dbl_center);  // tile index        [3.0, 1.0] => 3/1/z
    flt_center_offset = dbl_center % 1;   // offset            [0.2, 0.7]
```

```javascript
glsl
    float earth_radius = 6371000;
    float earth_circumf = earthRadius * 2.0 * 3.14159;

    // Function to convert degrees to radians
    float radians(float degrees) {
        return degrees * (PI / 180.0);
    }

    // Function to calculate Haversine distance
    float haversineDistance(vec2 point1, vec2 point2, float earth_radius) {
        // point1.x = latitude1, point1.y = longitude1
        // point2.x = latitude2, point2.y = longitude2

        // Convert to radians
        float lat1 = radians(point1.x);
        float lon1 = radians(point1.y);
        float lat2 = radians(point2.x);
        float lon2 = radians(point2.y);

        // Calculate differences
        float dLat = lat2 - lat1;
        float dLon = lon2 - lon1;

        // Haversine formula
        float a = sin(dLat / 2.0) * sin(dLat / 2.0) +
                cos(lat1) * cos(lat2) *
                sin(dLon / 2.0) * sin(dLon / 2.0);
        float c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a));

        // Distance
        return earth_radius * c;
    }

    dist_meters = haversineDistance(vec2 point1, vec2 point2, float earth_radius)
    radial = vector(x=0, y=-1); // points north
    radial.scale(1/cos(lat));   // correct for mercator distortion (lat in radians)
    radial.scale(dist_meters / earth_circumf * 2^zoom);     // dist_meters of given point from center
    radial.rotate(bearing);                                 // bearing of given point from center [0.1, 0.4]

    flt_new_offset = flt_center_offset + radial ;           // [0.2, 0.7] + [0.1, 0.4] = [0.3, 1.1]
    flt_new_tile = flt_center_tile + floor(flt_new_offset); // tile index [3.0, 1.0] + [0, 1] => 3/2/z
    flt_new_offset = flt_new_offset % 1;                    // offset     [0.3, 0.1]

```    