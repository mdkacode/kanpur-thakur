const Timezone = require('../models/Timezone');

class TimezoneController {
  // Get all timezones
  static async getAllTimezones(req, res) {
    try {
      const timezones = await Timezone.findAll();
      
      res.json({
        success: true,
        data: timezones,
        message: 'Timezones retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllTimezones:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving timezones',
        error: error.message
      });
    }
  }

  // Get timezone by ID
  static async getTimezoneById(req, res) {
    try {
      const { id } = req.params;
      const timezone = await Timezone.findById(id);
      
      if (!timezone) {
        return res.status(404).json({
          success: false,
          message: 'Timezone not found'
        });
      }

      res.json({
        success: true,
        data: timezone,
        message: 'Timezone retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getTimezoneById:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving timezone',
        error: error.message
      });
    }
  }

  // Get timezones by state
  static async getTimezonesByState(req, res) {
    try {
      const { state } = req.params;
      const timezones = await Timezone.findByState(state);
      
      res.json({
        success: true,
        data: timezones,
        message: `Timezones for ${state} retrieved successfully`
      });
    } catch (error) {
      console.error('Error in getTimezonesByState:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving timezones by state',
        error: error.message
      });
    }
  }

  // Create new timezone
  static async createTimezone(req, res) {
    try {
      const timezoneData = req.body;
      
      // Validate required fields
      const requiredFields = ['timezone_name', 'display_name', 'abbreviation_standard', 'utc_offset_standard'];
      for (const field of requiredFields) {
        if (!timezoneData[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field}`
          });
        }
      }

      const newTimezone = await Timezone.create(timezoneData);
      
      res.status(201).json({
        success: true,
        data: newTimezone,
        message: 'Timezone created successfully'
      });
    } catch (error) {
      console.error('Error in createTimezone:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating timezone',
        error: error.message
      });
    }
  }

  // Update timezone
  static async updateTimezone(req, res) {
    try {
      const { id } = req.params;
      const timezoneData = req.body;
      
      const updatedTimezone = await Timezone.update(id, timezoneData);
      
      if (!updatedTimezone) {
        return res.status(404).json({
          success: false,
          message: 'Timezone not found'
        });
      }

      res.json({
        success: true,
        data: updatedTimezone,
        message: 'Timezone updated successfully'
      });
    } catch (error) {
      console.error('Error in updateTimezone:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating timezone',
        error: error.message
      });
    }
  }

  // Delete timezone
  static async deleteTimezone(req, res) {
    try {
      const { id } = req.params;
      
      // Check if timezone is being used by demographic records
      const db = require('../config/database');
      const checkQuery = 'SELECT COUNT(*) as count FROM demographic_records WHERE timezone_id = $1';
      const checkResult = await db.query(checkQuery, [id]);
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete timezone that is in use by demographic records'
        });
      }

      const deletedTimezone = await Timezone.delete(id);
      
      if (!deletedTimezone) {
        return res.status(404).json({
          success: false,
          message: 'Timezone not found'
        });
      }

      res.json({
        success: true,
        data: deletedTimezone,
        message: 'Timezone deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteTimezone:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting timezone',
        error: error.message
      });
    }
  }

  // Get current time in specific timezone
  static async getCurrentTimeInTimezone(req, res) {
    try {
      const { id } = req.params;
      const timeInfo = await Timezone.getCurrentTimeInTimezone(id);
      
      res.json({
        success: true,
        data: timeInfo,
        message: 'Current time retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getCurrentTimeInTimezone:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving current time',
        error: error.message
      });
    }
  }

  // Get timezone options for dropdown/select components
  static async getTimezoneOptions(req, res) {
    try {
      const timezones = await Timezone.findAll();
      
      const options = timezones.map(tz => ({
        id: tz.id,
        value: tz.id,
        label: Timezone.formatTimezoneDisplay(tz),
        timezone_name: tz.timezone_name,
        display_name: tz.display_name,
        abbreviation: tz.observes_dst && Timezone.isDaylightSavingTime(new Date()) ? 
          tz.abbreviation_daylight : tz.abbreviation_standard,
        states: null
      }));
      
      res.json({
        success: true,
        data: options,
        message: 'Timezone options retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getTimezoneOptions:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving timezone options',
        error: error.message
      });
    }
  }
}

module.exports = TimezoneController;
