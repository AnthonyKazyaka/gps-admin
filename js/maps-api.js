/**
 * Google Maps API Integration
 * Handles drive time estimation and route optimization
 */

class MapsAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.service = null;
        this.geocoder = null;
        this.isLoaded = false;
        this.cache = this.loadCache(); // Load cache from localStorage
        this.cacheKey = 'gps-admin-maps-cache';
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    }

    /**
     * Load cache from localStorage
     */
    loadCache() {
        try {
            const cached = localStorage.getItem('gps-admin-maps-cache');
            if (cached) {
                const data = JSON.parse(cached);
                // Convert plain object back to Map
                return new Map(Object.entries(data));
            }
        } catch (error) {
            console.warn('Failed to load Maps API cache:', error);
        }
        return new Map();
    }

    /**
     * Save cache to localStorage
     */
    saveCache() {
        try {
            // Convert Map to plain object for JSON serialization
            const cacheObj = Object.fromEntries(this.cache);
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheObj));
        } catch (error) {
            console.warn('Failed to save Maps API cache:', error);
        }
    }

    /**
     * Clear old cache entries
     */
    cleanCache() {
        const now = Date.now();
        let cleaned = false;
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheExpiry) {
                this.cache.delete(key);
                cleaned = true;
            }
        }
        
        if (cleaned) {
            this.saveCache();
            console.log('🧹 Cleaned expired Maps API cache entries');
        }
    }

    /**
     * Initialize Google Maps API
     */
    async init() {
        try {
            await this.loadMapsAPI();
            this.service = new google.maps.DistanceMatrixService();
            this.geocoder = new google.maps.Geocoder();
            this.isLoaded = true;
            
            // Clean old cache entries on init
            this.cleanCache();
            
            console.log('✅ Maps API initialized');
            return true;
        } catch (error) {
            console.error('Error initializing Maps API:', error);
            return false;
        }
    }

    /**
     * Load Google Maps API script
     */
    loadMapsAPI() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (typeof google !== 'undefined' && google.maps) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Calculate drive time between two locations
     * @param {string} origin - Starting location
     * @param {string} destination - Ending location
     * @param {Date} departureTime - When to depart (for traffic)
     * @returns {Object} Distance and duration info
     */
    async calculateDriveTime(origin, destination, departureTime = null) {
        if (!this.isLoaded) {
            throw new Error('Maps API not initialized');
        }

        // Normalize locations for consistent caching
        const normalizedOrigin = origin.trim().toLowerCase();
        const normalizedDestination = destination.trim().toLowerCase();
        
        // Check cache (use 1 hour for time-sensitive traffic data)
        const cacheKey = `${normalizedOrigin}|${normalizedDestination}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            const cacheAge = Date.now() - cached.timestamp;
            
            // Use cached data if less than 1 hour old
            if (cacheAge < 3600000) {
                console.log(`📦 Using cached travel time (${Math.round(cacheAge / 60000)} min old)`);
                return cached.data;
            }
        }

        try {
            const request = {
                origins: [origin],
                destinations: [destination],
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.IMPERIAL,
            };

            // Add departure time for traffic-aware routing
            if (departureTime) {
                request.drivingOptions = {
                    departureTime: departureTime,
                    trafficModel: google.maps.TrafficModel.BEST_GUESS,
                };
            }

            const result = await new Promise((resolve, reject) => {
                this.service.getDistanceMatrix(request, (response, status) => {
                    if (status === google.maps.DistanceMatrixStatus.OK) {
                        resolve(response);
                    } else {
                        reject(new Error(`Distance Matrix request failed: ${status}`));
                    }
                });
            });

            const element = result.rows[0].elements[0];

            if (element.status !== google.maps.DistanceMatrixElementStatus.OK) {
                throw new Error(`Route not found: ${element.status}`);
            }

            const data = {
                distance: {
                    text: element.distance.text,
                    value: element.distance.value, // meters
                    miles: (element.distance.value * 0.000621371).toFixed(1),
                },
                duration: {
                    text: element.duration.text,
                    value: element.duration.value, // seconds
                    minutes: Math.round(element.duration.value / 60),
                },
                durationInTraffic: element.duration_in_traffic ? {
                    text: element.duration_in_traffic.text,
                    value: element.duration_in_traffic.value,
                    minutes: Math.round(element.duration_in_traffic.value / 60),
                } : null,
                origin: origin,
                destination: destination,
            };

            // Cache result in memory and localStorage
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now(),
            });
            this.saveCache();

            console.log(`✅ Calculated travel time: ${data.duration.text} (${data.distance.miles} mi)`);

            return data;
        } catch (error) {
            console.error('Error calculating drive time:', error);
            throw error;
        }
    }

    /**
     * Calculate optimal route for multiple stops
     * @param {string} start - Starting location
     * @param {Array} waypoints - Array of waypoint addresses
     * @param {string} end - Ending location (optional, defaults to start)
     * @returns {Object} Optimized route info
     */
    async optimizeRoute(start, waypoints, end = null) {
        if (!this.isLoaded) {
            throw new Error('Maps API not initialized');
        }

        try {
            const directionsService = new google.maps.DirectionsService();

            const request = {
                origin: start,
                destination: end || start,
                waypoints: waypoints.map(wp => ({
                    location: wp,
                    stopover: true,
                })),
                optimizeWaypoints: true,
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.IMPERIAL,
            };

            const result = await new Promise((resolve, reject) => {
                directionsService.route(request, (response, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        resolve(response);
                    } else {
                        reject(new Error(`Directions request failed: ${status}`));
                    }
                });
            });

            const route = result.routes[0];
            const waypointOrder = result.routes[0].waypoint_order;

            let totalDistance = 0;
            let totalDuration = 0;

            route.legs.forEach(leg => {
                totalDistance += leg.distance.value;
                totalDuration += leg.duration.value;
            });

            return {
                waypointOrder: waypointOrder,
                optimizedWaypoints: waypointOrder.map(i => waypoints[i]),
                totalDistance: {
                    text: `${(totalDistance * 0.000621371).toFixed(1)} mi`,
                    value: totalDistance,
                    miles: (totalDistance * 0.000621371).toFixed(1),
                },
                totalDuration: {
                    text: this.formatDuration(totalDuration),
                    value: totalDuration,
                    minutes: Math.round(totalDuration / 60),
                },
                legs: route.legs.map(leg => ({
                    start: leg.start_address,
                    end: leg.end_address,
                    distance: {
                        text: leg.distance.text,
                        value: leg.distance.value,
                        miles: (leg.distance.value * 0.000621371).toFixed(1),
                    },
                    duration: {
                        text: leg.duration.text,
                        value: leg.duration.value,
                        minutes: Math.round(leg.duration.value / 60),
                    },
                })),
            };
        } catch (error) {
            console.error('Error optimizing route:', error);
            throw error;
        }
    }

    /**
     * Geocode an address to get coordinates
     * @param {string} address - Address to geocode
     * @returns {Object} Lat/lng coordinates
     */
    async geocodeAddress(address) {
        if (!this.isLoaded) {
            throw new Error('Maps API not initialized');
        }

        try {
            const result = await new Promise((resolve, reject) => {
                this.geocoder.geocode({ address: address }, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK) {
                        resolve(results[0]);
                    } else {
                        reject(new Error(`Geocoding failed: ${status}`));
                    }
                });
            });

            return {
                address: result.formatted_address,
                location: {
                    lat: result.geometry.location.lat(),
                    lng: result.geometry.location.lng(),
                },
                placeId: result.place_id,
            };
        } catch (error) {
            console.error('Error geocoding address:', error);
            throw error;
        }
    }

    /**
     * Calculate travel time for a sequence of appointments
     * @param {string} homeBase - Home/office address
     * @param {Array} appointments - Array of appointment objects with locations
     * @returns {Object} Travel analysis
     */
    async analyzeAppointmentTravel(homeBase, appointments) {
        if (appointments.length === 0) {
            return {
                totalTravelTime: 0,
                totalDistance: 0,
                segments: [],
            };
        }

        // Sort appointments by start time
        const sortedAppts = [...appointments].sort((a, b) => a.start - b.start);

        const segments = [];
        let totalTravelTime = 0;
        let totalDistance = 0;

        // Calculate travel from home to first appointment
        if (sortedAppts.length > 0) {
            const firstLeg = await this.calculateDriveTime(
                homeBase,
                sortedAppts[0].location,
                sortedAppts[0].start
            );

            segments.push({
                from: 'Home',
                to: sortedAppts[0].location,
                ...firstLeg,
            });

            totalTravelTime += firstLeg.duration.minutes;
            totalDistance += parseFloat(firstLeg.distance.miles);
        }

        // Calculate travel between appointments
        for (let i = 0; i < sortedAppts.length - 1; i++) {
            const current = sortedAppts[i];
            const next = sortedAppts[i + 1];

            const leg = await this.calculateDriveTime(
                current.location,
                next.location,
                next.start
            );

            segments.push({
                from: current.location,
                to: next.location,
                ...leg,
            });

            totalTravelTime += leg.duration.minutes;
            totalDistance += parseFloat(leg.distance.miles);
        }

        // Calculate travel from last appointment to home
        if (sortedAppts.length > 0) {
            const lastAppt = sortedAppts[sortedAppts.length - 1];
            const lastLeg = await this.calculateDriveTime(
                lastAppt.location,
                homeBase,
                lastAppt.end
            );

            segments.push({
                from: lastAppt.location,
                to: 'Home',
                ...lastLeg,
            });

            totalTravelTime += lastLeg.duration.minutes;
            totalDistance += parseFloat(lastLeg.distance.miles);
        }

        return {
            totalTravelTime,
            totalDistance: totalDistance.toFixed(1),
            segments,
            homeBase,
            appointmentCount: appointments.length,
        };
    }

    /**
     * Estimate travel time (mock fallback when API not available)
     * @param {number} distanceMiles - Distance in miles
     * @returns {number} Estimated minutes
     */
    estimateTravelTime(distanceMiles) {
        // Assume average speed of 30 mph in city
        return Math.round((distanceMiles / 30) * 60);
    }

    /**
     * Format duration in seconds to readable string
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} min`;
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        localStorage.removeItem(this.cacheKey);
        console.log('🧹 Maps API cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let totalEntries = 0;
        let expiredEntries = 0;
        
        for (const [key, value] of this.cache.entries()) {
            totalEntries++;
            if (now - value.timestamp > this.cacheExpiry) {
                expiredEntries++;
            }
        }
        
        return {
            totalEntries,
            expiredEntries,
            activeEntries: totalEntries - expiredEntries,
        };
    }
}

// Make available globally
window.MapsAPI = MapsAPI;
