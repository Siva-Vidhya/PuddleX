export interface UserPreferences {
  homeAddress: string
  homeLat: number | null
  homeLng: number | null
  notifyRain: boolean
  notifyFlood: boolean
  rainThreshold: number
}

export function getPreferences(): UserPreferences | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("puddlex_preferences")
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (!("Notification" in window)) return false
  if (Notification.permission === "granted") return true
  if (Notification.permission === "denied") return false
  const result = await Notification.requestPermission()
  return result === "granted"
}

export function sendNotification(title: string, body: string, icon = "/favicon.ico") {
  if (typeof window === "undefined") return
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon })
  }
}

export async function checkHomeAlerts(apiUrl: string): Promise<void> {
  if (typeof window === "undefined") return
  const prefs = getPreferences()
  if (!prefs || !prefs.homeLat || !prefs.homeLng) return

  try {
    const weatherRes = await fetch(
      `${apiUrl}/api/weather/summary?lat=${prefs.homeLat}&lng=${prefs.homeLng}`
    )
    const weather = await weatherRes.json()

    const roadsRes = await fetch(`${apiUrl}/api/roads`)
    const roadsData = await roadsRes.json()

    const rainfall = weather.rainfall_mm || 0
    const roads = roadsData.roads || []

    const nearbyHighRisk = roads.filter((road: any) => {
      if (road.flood_risk !== "high") return false
      if (!road.centroid_lat || !road.centroid_lng) return false
      const dlat = Math.abs(road.centroid_lat - prefs.homeLat!)
      const dlng = Math.abs(road.centroid_lng - prefs.homeLng!)
      return dlat < 0.009 && dlng < 0.009
    })

    if (prefs.notifyRain && rainfall >= prefs.rainThreshold) {
      sendNotification(
        "🌧 Heavy Rain Alert — PuddleX",
        `${rainfall}mm/hr rainfall detected near ${prefs.homeAddress}.`
      )
    }

    if (prefs.notifyFlood && nearbyHighRisk.length > 0) {
      const roadNames = nearbyHighRisk
        .slice(0, 2)
        .map((r: any) => r.name || "a nearby road")
        .join(" and ")
      sendNotification(
        "🚨 Flood Risk Alert — PuddleX",
        `High flood risk detected on ${roadNames} near your home.`
      )
    }
  } catch (err) {
    console.error("Alert check failed:", err)
  }
}
