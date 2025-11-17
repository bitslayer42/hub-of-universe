// SEFRETH!!!!!!!!!!!!!!!!
let getSessions = async () => {
    const language = navigator.language || "en-US";
    const locale = new Intl.Locale(language);
    const region = locale.region || "US";
    let google_body = {
        "language": language,
        "region": region,
    };

    google_body.layerTypes = ["layerRoadmap"];
    google_body.styles = [
        {
            "featureType": "all",
            elementType: "labels.text",
            "stylers": [
                { "visibility": "off" }
            ]
        }
    ];
    let mapTypes = ["satellite", "roadmap", "terrain"];
    let sessionKeys = [];
    for (let type of mapTypes) {
        google_body.mapType = type;
        // fetch session for each type
        const google_api_session = await fetch(`https://tile.googleapis.com/v1/createSession?key=AIzaSyClBtxCSpwQ7urX6L3ANbVy4atCvaXDwzk`, {// dont use this line in program
            method: "POST",
            body: JSON.stringify(google_body),
            headers: {
                "Content-Type": "application/json",
                "referer": "localhost:5173" // dont use this line in program
            }
        })
            .then(response => response.text())
            .catch(error => {
                console.error('Error fetching Google Maps Tile Session:', error);
            });
        const google_api_session_json = JSON.parse(google_api_session);
        sessionKeys.push(google_api_session_json.session);
    };
    return(sessionKeys);
};

console.log(await getSessions());