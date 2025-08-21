const State = require('../models/State');

class StateController {
  async getAllStates(req, res) {
    try {
      const { page = 1, limit = 50, region, search, sortBy = 'state_name', sortOrder = 'ASC' } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        region,
        search,
        orderBy: `${sortBy} ${sortOrder}`
      };

      const states = await State.findAll(options);
      
      res.json({
        success: true,
        data: states,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: states.length
        }
      });
    } catch (error) {
      console.error('Error getting states:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving states'
      });
    }
  }

  async getStateById(req, res) {
    try {
      const { id } = req.params;
      const state = await State.findById(id);
      
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      res.json({
        success: true,
        data: state
      });
    } catch (error) {
      console.error('Error getting state:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving state'
      });
    }
  }

  async getStateByCode(req, res) {
    try {
      const { code } = req.params;
      const state = await State.findByCode(code);
      
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      res.json({
        success: true,
        data: state
      });
    } catch (error) {
      console.error('Error getting state:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving state'
      });
    }
  }

  async getStatesByRegion(req, res) {
    try {
      const { region } = req.params;
      const states = await State.getStatesByRegion(region);
      
      res.json({
        success: true,
        data: states
      });
    } catch (error) {
      console.error('Error getting states by region:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving states by region'
      });
    }
  }

  async getRegions(req, res) {
    try {
      const regions = await State.getRegions();
      
      res.json({
        success: true,
        data: regions
      });
    } catch (error) {
      console.error('Error getting regions:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving regions'
      });
    }
  }

  async searchStates(req, res) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const states = await State.searchStates(q);
      
      res.json({
        success: true,
        data: states,
        searchQuery: q
      });
    } catch (error) {
      console.error('Error searching states:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching states'
      });
    }
  }

  async getStats(req, res) {
    try {
      const stats = await State.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting state stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving state statistics'
      });
    }
  }

  async createState(req, res) {
    try {
      const { state_code, state_name, region } = req.body;
      
      if (!state_code || !state_name) {
        return res.status(400).json({
          success: false,
          message: 'State code and state name are required'
        });
      }

      const state = await State.create({ state_code, state_name, region });
      
      res.status(201).json({
        success: true,
        data: state,
        message: 'State created successfully'
      });
    } catch (error) {
      console.error('Error creating state:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating state'
      });
    }
  }

  async updateState(req, res) {
    try {
      const { id } = req.params;
      const { state_code, state_name, region } = req.body;
      
      const state = await State.update(id, { state_code, state_name, region });
      
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      res.json({
        success: true,
        data: state,
        message: 'State updated successfully'
      });
    } catch (error) {
      console.error('Error updating state:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating state'
      });
    }
  }

  async deleteState(req, res) {
    try {
      const { id } = req.params;
      const state = await State.deleteById(id);
      
      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'State not found'
        });
      }

      res.json({
        success: true,
        message: 'State deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting state:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting state'
      });
    }
  }
}

module.exports = new StateController();
