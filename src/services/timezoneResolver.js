const db = require('../config/database');

class TimezoneResolver {
    constructor() {
        this.timezoneCache = null;
        this.stateTimezoneMap = null;
        this.lastCacheTime = null;
        this.cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Initialize the timezone cache
     */
    async initializeCache() {
        if (this.timezoneCache && this.lastCacheTime && 
            (Date.now() - this.lastCacheTime) < this.cacheExpiryMs) {
            return; // Cache is still valid
        }

        try {
            console.log('🔄 Initializing timezone cache...');
            
            // Load all timezones
            const timezoneResult = await db.query(`
                SELECT id, timezone_name, display_name, abbreviation_standard, 
                       utc_offset_standard, observes_dst
                FROM timezones 
                ORDER BY id
            `);
            
            this.timezoneCache = timezoneResult.rows;
            
            // Create state-to-timezone mapping
            this.stateTimezoneMap = await this.createStateTimezoneMap();
            
            this.lastCacheTime = Date.now();
            console.log(`✅ Timezone cache initialized with ${this.timezoneCache.length} timezones`);
            
        } catch (error) {
            console.error('❌ Error initializing timezone cache:', error);
            throw error;
        }
    }

    /**
     * Create a mapping of states to their default timezones from database
     */
    async createStateTimezoneMap() {
        try {
            const result = await db.query(`
                SELECT s.state_code, s.timezone_id, t.display_name
                FROM states s
                JOIN timezones t ON s.timezone_id = t.id
                ORDER BY s.state_code
            `);
            
            const stateMap = {};
            result.rows.forEach(row => {
                stateMap[row.state_code] = row.timezone_id;
            });
            
            console.log(`📊 Loaded ${Object.keys(stateMap).length} state-timezone mappings from database`);
            return stateMap;
        } catch (error) {
            console.error('❌ Error loading state-timezone mappings from database:', error);
            // Fallback to a minimal hard-coded map for critical states
            return {
                'AL': 8, 'CA': 10, 'TX': 8, 'NY': 7, 'FL': 7, 'IL': 8, 'PA': 7, 'OH': 7, 'GA': 7, 'NC': 7
            };
        }
    }

    /**
     * Resolve timezone based on location data
     * Priority: 1. Exact match (state+city+zip), 2. State+city, 3. State default, 4. Fallback
     */
    async resolveTimezone({ country = 'US', state, city, zipcode }) {
        await this.initializeCache();
        
        if (!state) {
            console.warn('⚠️ No state provided for timezone resolution');
            return null;
        }

        // Convert full state names to state codes if needed
        let stateCode = state.toUpperCase().trim();
        
        // Map full state names to state codes
        const fullStateToCode = {
            'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
            'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
            'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
            'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
            'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
            'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
            'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
            'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
            'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
            'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
            'DISTRICT OF COLUMBIA': 'DC', 'PUERTO RICO': 'PR', 'GUAM': 'GU', 'NORTHERN MARIANA ISLANDS': 'MP',
            'US VIRGIN ISLANDS': 'VI', 'AMERICAN SAMOA': 'AS'
        };
        
        // If it's a full state name, convert to code
        if (fullStateToCode[stateCode]) {
            stateCode = fullStateToCode[stateCode];
        }
        
        // Priority 1: Try to find exact match in database (if we have city/zip data)
        if (city && zipcode) {
            const exactMatch = await this.findExactMatch(stateCode, city, zipcode);
            if (exactMatch) {
                console.log(`✅ Found exact timezone match: ${exactMatch.display_name} for ${stateCode}, ${city}, ${zipcode}`);
                return exactMatch;
            }
        }

        // Priority 2: Try state + city match
        if (city) {
            const cityMatch = await this.findCityMatch(stateCode, city);
            if (cityMatch) {
                console.log(`✅ Found city timezone match: ${cityMatch.display_name} for ${stateCode}, ${city}`);
                return cityMatch;
            }
        }

        // Priority 3: Use state default timezone
        const stateDefault = this.getStateDefaultTimezone(stateCode);
        if (stateDefault) {
            console.log(`✅ Using state default timezone: ${stateDefault.display_name} for ${stateCode}`);
            return stateDefault;
        }

        // Priority 4: Fallback to Eastern Time (most common)
        const fallback = this.timezoneCache.find(tz => tz.id === 7); // Eastern Time
        console.log(`⚠️ No timezone found for ${stateCode}, using fallback: ${fallback?.display_name}`);
        return fallback || null;
    }

    /**
     * Find exact match in existing records
     */
    async findExactMatch(stateCode, city, zipcode) {
        try {
            const result = await db.query(`
                SELECT DISTINCT t.id, t.timezone_name, t.display_name, t.abbreviation_standard
                FROM records r
                JOIN timezones t ON r.timezone_id = t.id
                WHERE r.state_code = $1 
                AND LOWER(r.city) = LOWER($2) 
                AND r.zip = $3
                AND r.timezone_id IS NOT NULL
                LIMIT 1
            `, [stateCode, city, zipcode]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding exact timezone match:', error);
            return null;
        }
    }

    /**
     * Find city match in existing records
     */
    async findCityMatch(stateCode, city) {
        try {
            const result = await db.query(`
                SELECT DISTINCT t.id, t.timezone_name, t.display_name, t.abbreviation_standard
                FROM records r
                JOIN timezones t ON r.timezone_id = t.id
                WHERE r.state_code = $1 
                AND LOWER(r.city) = LOWER($2)
                AND r.timezone_id IS NOT NULL
                LIMIT 1
            `, [stateCode, city]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding city timezone match:', error);
            return null;
        }
    }

    /**
     * Get default timezone for a state
     */
    getStateDefaultTimezone(stateCode) {
        const timezoneId = this.stateTimezoneMap[stateCode];
        if (!timezoneId) {
            return null;
        }
        
        return this.timezoneCache.find(tz => tz.id === timezoneId) || null;
    }

    /**
     * Get all available timezones
     */
    async getAllTimezones() {
        await this.initializeCache();
        return this.timezoneCache;
    }

    /**
     * Get timezone by ID
     */
    async getTimezoneById(id) {
        await this.initializeCache();
        return this.timezoneCache.find(tz => tz.id === id) || null;
    }

    /**
     * Get timezone by name
     */
    async getTimezoneByName(timezoneName) {
        await this.initializeCache();
        return this.timezoneCache.find(tz => tz.timezone_name === timezoneName) || null;
    }

    /**
     * Clear cache (useful for testing or manual refresh)
     */
    clearCache() {
        this.timezoneCache = null;
        this.stateTimezoneMap = null;
        this.lastCacheTime = null;
        console.log('🗑️ Timezone cache cleared');
    }
}

// Export singleton instance
module.exports = new TimezoneResolver();
