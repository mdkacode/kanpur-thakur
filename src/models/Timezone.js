const db = require('../config/database');

class Timezone {
  static async findAll() {
    try {
      const query = `
        SELECT id, timezone_name, display_name, abbreviation_standard, 
               abbreviation_daylight, utc_offset_standard, utc_offset_daylight, 
               observes_dst, description, states, created_at, updated_at
        FROM timezones 
        ORDER BY display_name ASC
      `;
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all timezones:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT id, timezone_name, display_name, abbreviation_standard, 
               abbreviation_daylight, utc_offset_standard, utc_offset_daylight, 
               observes_dst, description, states, created_at, updated_at
        FROM timezones 
        WHERE id = $1
      `;
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching timezone by ID:', error);
      throw error;
    }
  }

  static async findByName(timezoneName) {
    try {
      const query = `
        SELECT id, timezone_name, display_name, abbreviation_standard, 
               abbreviation_daylight, utc_offset_standard, utc_offset_daylight, 
               observes_dst, description, states, created_at, updated_at
        FROM timezones 
        WHERE timezone_name = $1
      `;
      const result = await db.query(query, [timezoneName]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching timezone by name:', error);
      throw error;
    }
  }

  static async findByState(state) {
    try {
      const query = `
        SELECT id, timezone_name, display_name, abbreviation_standard, 
               abbreviation_daylight, utc_offset_standard, utc_offset_daylight, 
               observes_dst, description, states, created_at, updated_at
        FROM timezones 
        WHERE $1 = ANY(states)
        ORDER BY display_name ASC
      `;
      const result = await db.query(query, [state]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching timezones by state:', error);
      throw error;
    }
  }

  static async create(timezoneData) {
    try {
      const {
        timezone_name,
        display_name,
        abbreviation_standard,
        abbreviation_daylight,
        utc_offset_standard,
        utc_offset_daylight,
        observes_dst,
        description,
        states
      } = timezoneData;

      const query = `
        INSERT INTO timezones (
          timezone_name, display_name, abbreviation_standard, abbreviation_daylight,
          utc_offset_standard, utc_offset_daylight, observes_dst, description, states
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        timezone_name,
        display_name,
        abbreviation_standard,
        abbreviation_daylight,
        utc_offset_standard,
        utc_offset_daylight,
        observes_dst,
        description,
        states
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating timezone:', error);
      throw error;
    }
  }

  static async update(id, timezoneData) {
    try {
      const {
        timezone_name,
        display_name,
        abbreviation_standard,
        abbreviation_daylight,
        utc_offset_standard,
        utc_offset_daylight,
        observes_dst,
        description,
        states
      } = timezoneData;

      const query = `
        UPDATE timezones 
        SET timezone_name = $2, display_name = $3, abbreviation_standard = $4,
            abbreviation_daylight = $5, utc_offset_standard = $6, utc_offset_daylight = $7,
            observes_dst = $8, description = $9, states = $10, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const values = [
        id,
        timezone_name,
        display_name,
        abbreviation_standard,
        abbreviation_daylight,
        utc_offset_standard,
        utc_offset_daylight,
        observes_dst,
        description,
        states
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating timezone:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = `DELETE FROM timezones WHERE id = $1 RETURNING *`;
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting timezone:', error);
      throw error;
    }
  }

  // Helper method to get current time in a specific timezone
  static async getCurrentTimeInTimezone(timezoneId) {
    try {
      const timezone = await this.findById(timezoneId);
      if (!timezone) {
        throw new Error('Timezone not found');
      }

      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      
      // Determine if DST is currently in effect (basic check)
      const isDST = timezone.observes_dst && this.isDaylightSavingTime(now);
      const offset = isDST ? timezone.utc_offset_daylight : timezone.utc_offset_standard;
      
      const localTime = new Date(utcTime + (offset * 60000));
      
      return {
        timezone: timezone,
        current_time: localTime,
        is_dst: isDST,
        offset_minutes: offset,
        abbreviation: isDST ? timezone.abbreviation_daylight : timezone.abbreviation_standard
      };
    } catch (error) {
      console.error('Error getting current time in timezone:', error);
      throw error;
    }
  }

  // Basic DST check (US DST rules - 2nd Sunday in March to 1st Sunday in November)
  static isDaylightSavingTime(date) {
    const year = date.getFullYear();
    
    // DST starts on the second Sunday in March
    const march = new Date(year, 2, 1); // March 1st
    const firstSundayMarch = new Date(year, 2, 1 + (7 - march.getDay()) % 7);
    const dstStart = new Date(year, 2, firstSundayMarch.getDate() + 7);
    
    // DST ends on the first Sunday in November
    const november = new Date(year, 10, 1); // November 1st
    const dstEnd = new Date(year, 10, 1 + (7 - november.getDay()) % 7);
    
    return date >= dstStart && date < dstEnd;
  }

  // Get formatted timezone display
  static formatTimezoneDisplay(timezone, includeOffset = true) {
    const isDST = this.isDaylightSavingTime(new Date());
    const abbr = isDST && timezone.observes_dst ? 
      timezone.abbreviation_daylight : 
      timezone.abbreviation_standard;
    
    let display = `${timezone.display_name} (${abbr})`;
    
    if (includeOffset) {
      const offset = isDST && timezone.observes_dst ? 
        timezone.utc_offset_daylight : 
        timezone.utc_offset_standard;
      const hours = Math.abs(Math.floor(offset / 60));
      const minutes = Math.abs(offset % 60);
      const sign = offset >= 0 ? '+' : '-';
      display += ` UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return display;
  }
}

module.exports = Timezone;
