const DemographicRecord = require('../models/DemographicRecord');

class DemographicRecordController {
  static async getAllRecords(req, res) {
    try {
      console.log('📋 getAllRecords called with URL:', req.originalUrl, 'Query params:', req.query);
      
      const {
        page = 1,
        limit = 20,
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        state,
        zipcode,
        county,
        city,
        timezone,
        // Array-based filters
        mhhi,
        avg_hhi,
        median_age,
        households,
        race_ethnicity_white,
        race_ethnicity_black,
        race_ethnicity_hispanic,
        // Income & Economic
        mhhi_min,
        mhhi_max,
        avg_hhi_min,
        avg_hhi_max,
        pc_income_min,
        pc_income_max,
        pct_hh_w_income_200k_plus_min,
        pct_hh_w_income_200k_plus_max,
        
        // Demographics & Age
        median_age_min,
        median_age_max,
        pop_dens_sq_mi_min,
        pop_dens_sq_mi_max,
        
        // Race & Ethnicity
        race_ethnicity_white_min,
        race_ethnicity_white_max,
        race_ethnicity_black_min,
        race_ethnicity_black_max,
        race_ethnicity_hispanic_min,
        race_ethnicity_hispanic_max,
        
        // Household & Family
        households_min,
        households_max,
        family_hh_total_min,
        family_hh_total_max,
        
        // Education & Employment
        edu_att_bachelors_min,
        edu_att_bachelors_max,
        unemployment_pct_min,
        unemployment_pct_max,
        
        // Housing
        housing_units_min,
        housing_units_max,
        owner_occupied_min,
        owner_occupied_max
      } = req.query;
      
      // Validate and clean search parameter
      const cleanSearch = search && search.trim() ? search.trim() : null;
      
      const filters = {};
      // Handle multiselect fields - split comma-separated values into arrays
      if (state && state.trim()) {
        filters.state = state.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed state filter:', filters.state);
      }
      if (zipcode && zipcode.trim()) {
        filters.zipcode = zipcode.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed zipcode filter:', filters.zipcode);
      }
      if (county && county.trim()) {
        filters.county = county.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed county filter:', filters.county);
      }
      if (city && city.trim()) {
        filters.city = city.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed city filter:', filters.city);
      }
      if (timezone && timezone.trim()) {
        filters.timezone = timezone.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed timezone filter:', filters.timezone);
      }
      if (mhhi && mhhi.trim()) {
        filters.mhhi = mhhi.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed mhhi filter:', filters.mhhi);
      }
      if (avg_hhi && avg_hhi.trim()) {
        filters.avg_hhi = avg_hhi.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed avg_hhi filter:', filters.avg_hhi);
      }
      if (median_age && median_age.trim()) {
        filters.median_age = median_age.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed median_age filter:', filters.median_age);
      }
      if (households && households.trim()) {
        filters.households = households.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed households filter:', filters.households);
      }
      if (race_ethnicity_white && race_ethnicity_white.trim()) {
        filters.race_ethnicity_white = race_ethnicity_white.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed race_ethnicity_white filter:', filters.race_ethnicity_white);
      }
      if (race_ethnicity_black && race_ethnicity_black.trim()) {
        filters.race_ethnicity_black = race_ethnicity_black.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed race_ethnicity_black filter:', filters.race_ethnicity_black);
      }
      if (race_ethnicity_hispanic && race_ethnicity_hispanic.trim()) {
        filters.race_ethnicity_hispanic = race_ethnicity_hispanic.trim().split(',').map(s => s.trim()).filter(s => s);
        console.log('🔍 Processed race_ethnicity_hispanic filter:', filters.race_ethnicity_hispanic);
      }

      const advancedFilters = {};
      
      // Income & Economic
      if (mhhi_min && mhhi_min.trim()) advancedFilters.mhhi_min = mhhi_min.trim();
      if (mhhi_max && mhhi_max.trim()) advancedFilters.mhhi_max = mhhi_max.trim();
      if (avg_hhi_min && avg_hhi_min.trim()) advancedFilters.avg_hhi_min = avg_hhi_min.trim();
      if (avg_hhi_max && avg_hhi_max.trim()) advancedFilters.avg_hhi_max = avg_hhi_max.trim();
      if (pc_income_min && pc_income_min.trim()) advancedFilters.pc_income_min = pc_income_min.trim();
      if (pc_income_max && pc_income_max.trim()) advancedFilters.pc_income_max = pc_income_max.trim();
      if (pct_hh_w_income_200k_plus_min && pct_hh_w_income_200k_plus_min.trim()) advancedFilters.pct_hh_w_income_200k_plus_min = pct_hh_w_income_200k_plus_min.trim();
      if (pct_hh_w_income_200k_plus_max && pct_hh_w_income_200k_plus_max.trim()) advancedFilters.pct_hh_w_income_200k_plus_max = pct_hh_w_income_200k_plus_max.trim();
      
      // Demographics & Age
      if (median_age_min && median_age_min.trim()) advancedFilters.median_age_min = median_age_min.trim();
      if (median_age_max && median_age_max.trim()) advancedFilters.median_age_max = median_age_max.trim();
      if (pop_dens_sq_mi_min && pop_dens_sq_mi_min.trim()) advancedFilters.pop_dens_sq_mi_min = pop_dens_sq_mi_min.trim();
      if (pop_dens_sq_mi_max && pop_dens_sq_mi_max.trim()) advancedFilters.pop_dens_sq_mi_max = pop_dens_sq_mi_max.trim();
      
      // Race & Ethnicity
      if (race_ethnicity_white_min && race_ethnicity_white_min.trim()) advancedFilters.race_ethnicity_white_min = race_ethnicity_white_min.trim();
      if (race_ethnicity_white_max && race_ethnicity_white_max.trim()) advancedFilters.race_ethnicity_white_max = race_ethnicity_white_max.trim();
      if (race_ethnicity_black_min && race_ethnicity_black_min.trim()) advancedFilters.race_ethnicity_black_min = race_ethnicity_black_min.trim();
      if (race_ethnicity_black_max && race_ethnicity_black_max.trim()) advancedFilters.race_ethnicity_black_max = race_ethnicity_black_max.trim();
      if (race_ethnicity_hispanic_min && race_ethnicity_hispanic_min.trim()) advancedFilters.race_ethnicity_hispanic_min = race_ethnicity_hispanic_min.trim();
      if (race_ethnicity_hispanic_max && race_ethnicity_hispanic_max.trim()) advancedFilters.race_ethnicity_hispanic_max = race_ethnicity_hispanic_max.trim();
      
      // Household & Family
      if (households_min && households_min.trim()) advancedFilters.households_min = households_min.trim();
      if (households_max && households_max.trim()) advancedFilters.households_max = households_max.trim();
      if (family_hh_total_min && family_hh_total_min.trim()) advancedFilters.family_hh_total_min = family_hh_total_min.trim();
      if (family_hh_total_max && family_hh_total_max.trim()) advancedFilters.family_hh_total_max = family_hh_total_max.trim();
      
      // Education & Employment
      if (edu_att_bachelors_min && edu_att_bachelors_min.trim()) advancedFilters.edu_att_bachelors_min = edu_att_bachelors_min.trim();
      if (edu_att_bachelors_max && edu_att_bachelors_max.trim()) advancedFilters.edu_att_bachelors_max = edu_att_bachelors_max.trim();
      if (unemployment_pct_min && unemployment_pct_min.trim()) advancedFilters.unemployment_pct_min = unemployment_pct_min.trim();
      if (unemployment_pct_max && unemployment_pct_max.trim()) advancedFilters.unemployment_pct_max = unemployment_pct_max.trim();
      
      // Housing
      if (housing_units_min && housing_units_min.trim()) advancedFilters.housing_units_min = housing_units_min.trim();
      if (housing_units_max && housing_units_max.trim()) advancedFilters.housing_units_max = housing_units_max.trim();
      if (owner_occupied_min && owner_occupied_min.trim()) advancedFilters.owner_occupied_min = owner_occupied_min.trim();
      if (owner_occupied_max && owner_occupied_max.trim()) advancedFilters.owner_occupied_max = owner_occupied_max.trim();

      console.log('🔍 Controller processed advancedFilters:', advancedFilters);
      console.log('🔍 Controller processed filters:', filters);
      console.log('🔍 Raw query parameters:', req.query);

      const result = await DemographicRecord.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        search: cleanSearch,
        sortBy,
        sortOrder,
        filters,
        advancedFilters
      });

      res.json({
        success: true,
        data: result.records,
        filteredZipcodes: result.filteredZipcodes,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error getting demographic records:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving demographic records'
      });
    }
  }

  static async getRecordById(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 getRecordById called with ID:', id, 'Type:', typeof id, 'URL:', req.originalUrl);
      
      const record = await DemographicRecord.findById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Demographic record not found'
        });
      }

      res.json({
        success: true,
        data: record
      });

    } catch (error) {
      console.error('Error getting demographic record:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving demographic record'
      });
    }
  }

  static async getRecordByZipcode(req, res) {
    try {
      const { zipcode } = req.params;
      const record = await DemographicRecord.findByZipcode(zipcode);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Demographic record not found for this zipcode'
        });
      }

      res.json({
        success: true,
        data: record
      });

    } catch (error) {
      console.error('Error getting demographic record by zipcode:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving demographic record'
      });
    }
  }

  static async createRecord(req, res) {
    try {
      const recordData = req.body;
      
      // Validate required fields
      if (!recordData.zipcode) {
        return res.status(400).json({
          success: false,
          message: 'Zipcode is required'
        });
      }

      const record = await DemographicRecord.create(recordData);
      
      res.status(201).json({
        success: true,
        message: 'Demographic record created successfully',
        data: record
      });

    } catch (error) {
      console.error('Error creating demographic record:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating demographic record'
      });
    }
  }

  static async updateRecord(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const record = await DemographicRecord.findById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Demographic record not found'
        });
      }

      const updatedRecord = await DemographicRecord.update(id, updateData);
      
      res.json({
        success: true,
        message: 'Demographic record updated successfully',
        data: updatedRecord
      });

    } catch (error) {
      console.error('Error updating demographic record:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating demographic record'
      });
    }
  }

  static async deleteRecord(req, res) {
    try {
      const { id } = req.params;
      
      const record = await DemographicRecord.findById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Demographic record not found'
        });
      }

      await DemographicRecord.delete(id);
      
      res.json({
        success: true,
        message: 'Demographic record deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting demographic record:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting demographic record'
      });
    }
  }

  static async getStats(req, res) {
    try {
      const stats = await DemographicRecord.getStats();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting demographic stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving demographic statistics'
      });
    }
  }

  static async searchRecords(req, res) {
    try {
      const { 
        query, 
        page = 1, 
        limit = 50,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search: query,
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      };

      const result = await DemographicRecord.findAll(options);
      
      res.json({
        success: true,
        data: result.records,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error searching demographic records:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching demographic records'
      });
    }
  }

  static async getStates(req, res) {
    try {
      const query = 'SELECT DISTINCT state FROM demographic_records WHERE state IS NOT NULL AND state != \'\' ORDER BY state';
      const result = await DemographicRecord.db.query(query);
      
      res.json({
        success: true,
        data: result.rows.map(row => row.state)
      });

    } catch (error) {
      console.error('Error getting states:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving states'
      });
    }
  }

  static async getCountiesByState(req, res) {
    try {
      const { state } = req.params;
      const query = 'SELECT DISTINCT county FROM demographic_records WHERE state = $1 AND county IS NOT NULL AND county != \'\' ORDER BY county';
      const result = await DemographicRecord.db.query(query, [state]);
      
      res.json({
        success: true,
        data: result.rows.map(row => row.county)
      });

    } catch (error) {
      console.error('Error getting counties:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving counties'
      });
    }
  }

  static async getUniqueValues(req, res) {
    try {
      const { field } = req.params;
      const { search = '', limit = 10 } = req.query;
      
      console.log('🔍 getUniqueValues called with:', { field, search, limit });
      console.log('🔍 Full request URL:', req.originalUrl);
      console.log('🔍 Request query:', req.query);
      
      if (!field) {
        console.log('❌ Field parameter missing');
        return res.status(400).json({
          success: false,
          message: 'Field parameter is required'
        });
      }

      console.log('🔍 Calling model getUniqueValues with:', { field, search, limit });
      const values = await DemographicRecord.getUniqueValues(field, search, parseInt(limit));
      console.log('✅ Model returned values:', values);
      
      res.json({
        success: true,
        data: values
      });

    } catch (error) {
      console.error('❌ Error in getUniqueValues:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving unique values'
      });
    }
  }

  static async getFilterOptions(req, res) {
    try {
      let filterOptions;
      
      try {
        // Try to get full filter options first
        filterOptions = await DemographicRecord.getFilterOptions();
      } catch (error) {
        console.warn('Full filter options failed, using fallback:', error.message);
        // Use fallback options if full method fails
        filterOptions = await DemographicRecord.getBasicFilterOptions();
      }
      
      res.json({
        success: true,
        data: filterOptions
      });

    } catch (error) {
      console.error('Error getting filter options:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving filter options'
      });
    }
  }
}

module.exports = DemographicRecordController;
