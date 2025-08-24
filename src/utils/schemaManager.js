const db = require('../config/database');

class SchemaManager {
  // Get current table schema
  static async getCurrentSchema(tableName = 'demographic_records') {
    try {
      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `;
      const result = await db.query(query, [tableName]);
      return result.rows;
    } catch (error) {
      console.error('Error getting current schema:', error);
      throw error;
    }
  }

  // Add new columns to the table
  static async addColumns(tableName, newColumns) {
    try {
      const currentSchema = await this.getCurrentSchema(tableName);
      const existingColumns = currentSchema.map(col => col.column_name);
      
      for (const column of newColumns) {
        if (!existingColumns.includes(column.name)) {
          const query = `
            ALTER TABLE ${tableName} 
            ADD COLUMN ${column.name} ${column.type} ${column.nullable ? '' : 'NOT NULL'} ${column.default ? `DEFAULT ${column.default}` : ''}
          `;
          await db.query(query);
          console.log(`Added column: ${column.name}`);
        } else {
          console.log(`Column ${column.name} already exists, skipping`);
        }
      }
      
      return { success: true, message: 'Columns added successfully' };
    } catch (error) {
      console.error('Error adding columns:', error);
      throw error;
    }
  }

  // Remove columns from the table
  static async removeColumns(tableName, columnsToRemove) {
    try {
      const currentSchema = await this.getCurrentSchema(tableName);
      const existingColumns = currentSchema.map(col => col.column_name);
      
      for (const columnName of columnsToRemove) {
        if (existingColumns.includes(columnName)) {
          const query = `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`;
          await db.query(query);
          console.log(`Removed column: ${columnName}`);
        } else {
          console.log(`Column ${columnName} does not exist, skipping`);
        }
      }
      
      return { success: true, message: 'Columns removed successfully' };
    } catch (error) {
      console.error('Error removing columns:', error);
      throw error;
    }
  }

  // Rename columns
  static async renameColumn(tableName, oldName, newName) {
    try {
      const currentSchema = await this.getCurrentSchema(tableName);
      const existingColumns = currentSchema.map(col => col.column_name);
      
      if (existingColumns.includes(oldName) && !existingColumns.includes(newName)) {
        const query = `ALTER TABLE ${tableName} RENAME COLUMN ${oldName} TO ${newName}`;
        await db.query(query);
        console.log(`Renamed column: ${oldName} -> ${newName}`);
        return { success: true, message: `Column renamed from ${oldName} to ${newName}` };
      } else {
        return { success: false, message: `Cannot rename: ${oldName} doesn't exist or ${newName} already exists` };
      }
    } catch (error) {
      console.error('Error renaming column:', error);
      throw error;
    }
  }

  // Change column data type
  static async changeColumnType(tableName, columnName, newType) {
    try {
      const currentSchema = await this.getCurrentSchema(tableName);
      const existingColumns = currentSchema.map(col => col.column_name);
      
      if (existingColumns.includes(columnName)) {
        const query = `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE ${newType}`;
        await db.query(query);
        console.log(`Changed column type: ${columnName} -> ${newType}`);
        return { success: true, message: `Column type changed for ${columnName}` };
      } else {
        return { success: false, message: `Column ${columnName} does not exist` };
      }
    } catch (error) {
      console.error('Error changing column type:', error);
      throw error;
    }
  }

  // Sync table schema with CSV headers
  static async syncSchemaWithCSV(tableName, csvHeaders) {
    try {
      const currentSchema = await this.getCurrentSchema(tableName);
      const existingColumns = currentSchema.map(col => col.column_name);
      
      // Find missing columns
      const missingColumns = csvHeaders.filter(header => !existingColumns.includes(header));
      
      if (missingColumns.length > 0) {
        console.log(`Found ${missingColumns.length} new columns: ${missingColumns.join(', ')}`);
        
        // Add missing columns
        const newColumns = missingColumns.map(name => ({
          name,
          type: 'TEXT', // Default to TEXT for flexibility
          nullable: true,
          default: null
        }));
        
        await this.addColumns(tableName, newColumns);
        console.log('Schema synchronized with CSV headers');
      } else {
        console.log('Schema is already in sync with CSV headers');
      }
      
      return { success: true, missingColumns };
    } catch (error) {
      console.error('Error syncing schema:', error);
      throw error;
    }
  }

  // Create table if it doesn't exist with dynamic columns
  static async createTableIfNotExists(tableName, columns) {
    try {
      // Check if table exists
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);
      
      if (!tableExists.rows[0].exists) {
        // Create table with dynamic columns
        const columnDefinitions = columns.map(col => 
          `${col.name} ${col.type} ${col.nullable ? '' : 'NOT NULL'} ${col.default ? `DEFAULT ${col.default}` : ''}`
        ).join(', ');
        
        const query = `
          CREATE TABLE ${tableName} (
            id SERIAL PRIMARY KEY,
            ${columnDefinitions},
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        await db.query(query);
        console.log(`Created table: ${tableName}`);
        
        // Create indexes for common search fields
        const searchFields = ['zipcode', 'state', 'county', 'city'];
        for (const field of searchFields) {
          if (columns.some(col => col.name === field)) {
            await db.query(`CREATE INDEX idx_${tableName}_${field} ON ${tableName}(${field})`);
          }
        }
        
        return { success: true, message: `Table ${tableName} created successfully` };
      } else {
        console.log(`Table ${tableName} already exists`);
        return { success: true, message: `Table ${tableName} already exists` };
      }
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  // Get schema differences between current table and CSV
  static async getSchemaDifferences(tableName, csvHeaders) {
    try {
      const currentSchema = await this.getCurrentSchema(tableName);
      const existingColumns = currentSchema.map(col => col.column_name);
      
      const missingInTable = csvHeaders.filter(header => !existingColumns.includes(header));
      const missingInCSV = existingColumns.filter(col => !csvHeaders.includes(col) && !['id', 'created_at', 'updated_at'].includes(col));
      
      return {
        missingInTable,
        missingInCSV,
        totalColumnsInTable: existingColumns.length,
        totalColumnsInCSV: csvHeaders.length,
        isSynchronized: missingInTable.length === 0 && missingInCSV.length === 0
      };
    } catch (error) {
      console.error('Error getting schema differences:', error);
      throw error;
    }
  }

  // Backup table before schema changes
  static async backupTable(tableName) {
    try {
      const backupTableName = `${tableName}_backup_${Date.now()}`;
      const query = `CREATE TABLE ${backupTableName} AS SELECT * FROM ${tableName}`;
      await db.query(query);
      console.log(`Table backed up as: ${backupTableName}`);
      return backupTableName;
    } catch (error) {
      console.error('Error backing up table:', error);
      throw error;
    }
  }

  // Restore table from backup
  static async restoreFromBackup(originalTableName, backupTableName) {
    try {
      // Drop original table
      await db.query(`DROP TABLE IF EXISTS ${originalTableName}`);
      
      // Rename backup to original
      await db.query(`ALTER TABLE ${backupTableName} RENAME TO ${originalTableName}`);
      
      console.log(`Table restored from backup: ${backupTableName}`);
      return { success: true, message: 'Table restored successfully' };
    } catch (error) {
      console.error('Error restoring table:', error);
      throw error;
    }
  }
}

module.exports = SchemaManager;
