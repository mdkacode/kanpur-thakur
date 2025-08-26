const Filter = require('../models/Filter');

class FilterController {
  // Create a new filter
  static async createFilter(req, res) {
    try {
      const { name, filter_type, filter_config } = req.body;
      const user_id = req.user?.id || null; // Get from auth middleware, use null for anonymous users
      
      if (!name || !filter_config) {
        return res.status(400).json({
          success: false,
          message: 'Filter name and configuration are required'
        });
      }

      const result = await Filter.createFilter({
        name,
        user_id,
        filter_type: filter_type || 'demographic',
        filter_config
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Filter created successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to create filter',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error creating filter:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating filter',
        error: error.message
      });
    }
  }

  // Get all filters for a user
  static async getUserFilters(req, res) {
    try {
      const user_id = req.user?.id || null;
      const { filter_type } = req.query;

      const result = await Filter.getFiltersByUser(user_id, filter_type);

      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to get filters',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error getting user filters:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting user filters',
        error: error.message
      });
    }
  }

  // Update a filter
  static async updateFilter(req, res) {
    try {
      const { id } = req.params;
      const { name, filter_config, is_active } = req.body;

      if (!name && !filter_config && is_active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one field must be provided for update'
        });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (filter_config) updateData.filter_config = filter_config;
      if (is_active !== undefined) updateData.is_active = is_active;

      const result = await Filter.updateFilter(id, updateData);

      if (result.success) {
        res.json({
          success: true,
          message: 'Filter updated successfully',
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Filter not found',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error updating filter:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating filter',
        error: error.message
      });
    }
  }

  // Delete a filter (soft delete)
  static async deleteFilter(req, res) {
    try {
      const { id } = req.params;

      const result = await Filter.deleteFilter(id);

      if (result.success) {
        res.json({
          success: true,
          message: 'Filter deleted successfully',
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Filter not found',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error deleting filter:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting filter',
        error: error.message
      });
    }
  }

  // Get a specific filter by ID
  static async getFilterById(req, res) {
    try {
      const { id } = req.params;

      const result = await Filter.getFilterById(id);

      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Filter not found',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error getting filter:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting filter',
        error: error.message
      });
    }
  }

  // Apply a saved filter to get filtered zipcodes
  static async applyFilter(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      console.log('🔍 applyFilter called with filter ID:', id);

      // Get the filter configuration
      const filterResult = await Filter.getFilterById(id);
      if (!filterResult.success) {
        console.log('❌ Filter not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Filter not found'
        });
      }

      const filter = filterResult.data;
      const filterConfig = filter.filter_config;
      
      console.log('🔍 Raw filter from database:', filter);
      console.log('🔍 Filter config type:', typeof filterConfig);
      console.log('🔍 Filter config:', JSON.stringify(filterConfig, null, 2));

      // Import DemographicRecord model
      const DemographicRecord = require('../models/DemographicRecord');

      // Process the filter configuration to handle multiselect values
      const processedConfig = {
        page: parseInt(page),
        limit: parseInt(limit),
        search: filterConfig.search || null,
        sortBy: filterConfig.sortBy || 'created_at',
        sortOrder: filterConfig.sortOrder === 'ascend' || filterConfig.sortOrder === 'ASC' ? 'ASC' : 'DESC'
      };

      // Process basic filters (multiselect fields)
      const filters = {};
      if (filterConfig.zip_code) {
        filters.zip_code = Array.isArray(filterConfig.zip_code) 
          ? filterConfig.zip_code 
          : filterConfig.zip_code.split(',').map(s => s.trim()).filter(s => s);
      }
      if (filterConfig.state) {
        filters.state = Array.isArray(filterConfig.state) 
          ? filterConfig.state 
          : filterConfig.state.split(',').map(s => s.trim()).filter(s => s);
      }
      if (filterConfig.county) {
        filters.county = Array.isArray(filterConfig.county) 
          ? filterConfig.county 
          : filterConfig.county.split(',').map(s => s.trim()).filter(s => s);
      }
      if (filterConfig.city) {
        filters.city = Array.isArray(filterConfig.city) 
          ? filterConfig.city 
          : filterConfig.city.split(',').map(s => s.trim()).filter(s => s);
      }
      if (filterConfig.timezone) {
        filters.timezone = Array.isArray(filterConfig.timezone) 
          ? filterConfig.timezone 
          : filterConfig.timezone.split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed timezone filter:', filters.timezone);
      }

      // Process advanced filters (numeric ranges)
      const advancedFilters = {};
      const numericFields = [
        'mhhi_min', 'mhhi_max', 'avg_hhi_min', 'avg_hhi_max', 'pc_income_min', 'pc_income_max',
        'pct_hh_w_income_200k_plus_min', 'pct_hh_w_income_200k_plus_max', 'median_age_min', 'median_age_max',
        'pop_dens_sq_mi_min', 'pop_dens_sq_mi_max', 'race_ethnicity_white_min', 'race_ethnicity_white_max',
        'race_ethnicity_black_min', 'race_ethnicity_black_max', 'race_ethnicity_hispanic_min', 'race_ethnicity_hispanic_max',
        'households_min', 'households_max', 'family_hh_total_min', 'family_hh_total_max',
        'edu_att_bachelors_min', 'edu_att_bachelors_max', 'unemployment_pct_min', 'unemployment_pct_max',
        'housing_units_min', 'housing_units_max', 'owner_occupied_min', 'owner_occupied_max'
      ];

      // Process array-based filters (multiselect fields)
      const arrayFields = ['mhhi', 'avg_hhi', 'median_age', 'households', 'race_ethnicity_white', 'race_ethnicity_black', 'race_ethnicity_hispanic'];
      arrayFields.forEach(field => {
        if (filterConfig[field]) {
          advancedFilters[field] = Array.isArray(filterConfig[field]) 
            ? filterConfig[field] 
            : filterConfig[field].split(',').map(s => s.trim()).filter(s => s);
        }
      });

      numericFields.forEach(field => {
        if (filterConfig[field] && filterConfig[field].toString().trim() !== '') {
          advancedFilters[field] = filterConfig[field].toString().trim();
        }
      });

      console.log('🔍 Processed filters:', filters);
      console.log('🔍 Processed advanced filters:', advancedFilters);

      // Apply the filter configuration
      const result = await DemographicRecord.findAll({
        ...processedConfig,
        filters,
        advancedFilters
      });

      console.log('✅ Filter applied successfully, found zipcodes:', result.filteredZipcodes?.length || 0);

      res.json({
        success: true,
        data: result.records,
        filteredZipcodes: result.filteredZipcodes,
        pagination: result.pagination,
        appliedFilter: filter
      });

    } catch (error) {
      console.error('❌ Error applying filter:', error);
      res.status(500).json({
        success: false,
        message: 'Error applying filter',
        error: error.message
      });
    }
  }
}

module.exports = FilterController;
