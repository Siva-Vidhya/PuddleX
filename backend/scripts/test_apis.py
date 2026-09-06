import httpx, asyncio

async def test():
    async with httpx.AsyncClient(timeout=10) as client:

        # Test 1: Open-Meteo rainfall for Chennai
        r1 = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={"latitude": 13.0827, "longitude": 80.2707,
                    "hourly": "precipitation", "forecast_days": 1,
                    "timezone": "Asia/Kolkata"}
        )
        print("Open-Meteo status:", r1.status_code)
        data = r1.json()
        print("Latest rainfall (mm):", data["hourly"]["precipitation"][0])

        # Test 2: Nominatim geocoding
        r2 = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": "T Nagar, Chennai", "format": "json", "limit": 1},
            headers={"User-Agent": "PuddleX/1.0"}
        )
        print("Nominatim status:", r2.status_code)
        loc = r2.json()[0]
        print("T Nagar coords:", loc["lat"], loc["lon"])

        # Test 3: OSRM routing
        r3 = await client.get(
            "http://router.project-osrm.org/route/v1/driving/80.2336,13.0418;80.2707,13.0827",
            params={"overview": "full", "geometries": "geojson"}
        )
        print("OSRM status:", r3.status_code)
        route = r3.json()
        print("Route distance (km):", round(route["routes"][0]["distance"] / 1000, 2))

asyncio.run(test())
