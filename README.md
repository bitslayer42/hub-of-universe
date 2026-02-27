# Hub of Universe

## Environment variables
Create files 

    .env.production 

and 

    .env.development, 

each with the 3 variables:

    VITE_MAPBOX_KEY=

    VITE_GOOGLE_KEY=

    VITE_HUB_API_KEY=


## Deploying

Run:

    ```
    git add .
    git commit
    git push
    ```

## Variables

    VITE_MAPBOX_KEY=

    VITE_GOOGLE_KEY=

    VITE_HUB_API_KEY=

    VITE_CITIES_URL=https://api.hubofuniverse.com/cities

    VITE_GEOLOCATION_KEY=
    
Variables are in .env.development for local dev and manually entered in the Cloudflare console under "Build secrets" for prod.

## Build config in Cloudflare console

- Build command: npm run build
- Deploy command: npx wrangler deploy
- Build secrets (see variables above)