#!/usr/bin/env node

const SchemaManager = require('../utils/schemaManager');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SchemaCLI {
  static async showMenu() {
    console.log('\n🔧 Demographic Records Schema Manager');
    console.log('=====================================');
    console.log('1. View current schema');
    console.log('2. Add new columns');
    console.log('3. Remove columns');
    console.log('4. Rename column');
    console.log('5. Change column type');
    console.log('6. Backup table');
    console.log('7. Restore from backup');
    console.log('8. Sync schema with CSV headers');
    console.log('9. Exit');
    console.log('=====================================');
  }

  static async getInput(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  static async viewCurrentSchema() {
    try {
      console.log('\n📋 Current Schema:');
      const schema = await SchemaManager.getCurrentSchema();
      
      if (schema.length === 0) {
        console.log('No columns found in table.');
        return;
      }

      console.log('\nColumn Name'.padEnd(25) + 'Type'.padEnd(20) + 'Nullable'.padEnd(10) + 'Default');
      console.log('-'.repeat(70));
      
      schema.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO';
        const defaultValue = col.column_default || 'NULL';
        console.log(
          col.column_name.padEnd(25) + 
          col.data_type.padEnd(20) + 
          nullable.padEnd(10) + 
          defaultValue
        );
      });
      
      console.log(`\nTotal columns: ${schema.length}`);
    } catch (error) {
      console.error('❌ Error viewing schema:', error.message);
    }
  }

  static async addNewColumns() {
    try {
      console.log('\n➕ Add New Columns');
      const columnInput = await this.getInput('Enter column definitions (name:type:nullable:default, separated by commas): ');
      
      if (!columnInput.trim()) {
        console.log('❌ No columns specified');
        return;
      }

      const columns = columnInput.split(',').map(col => {
        const [name, type = 'TEXT', nullable = 'true', defaultValue = null] = col.trim().split(':');
        return {
          name: name.trim(),
          type: type.trim().toUpperCase(),
          nullable: nullable.trim().toLowerCase() === 'true',
          default: defaultValue === 'null' ? null : defaultValue
        };
      });

      console.log('\nAdding columns:', columns.map(c => c.name).join(', '));
      const result = await SchemaManager.addColumns('demographic_records', columns);
      console.log('✅', result.message);
    } catch (error) {
      console.error('❌ Error adding columns:', error.message);
    }
  }

  static async removeColumns() {
    try {
      console.log('\n➖ Remove Columns');
      const columnsInput = await this.getInput('Enter column names to remove (separated by commas): ');
      
      if (!columnsInput.trim()) {
        console.log('❌ No columns specified');
        return;
      }

      const columns = columnsInput.split(',').map(col => col.trim());
      console.log('\nRemoving columns:', columns.join(', '));
      
      const result = await SchemaManager.removeColumns('demographic_records', columns);
      console.log('✅', result.message);
    } catch (error) {
      console.error('❌ Error removing columns:', error.message);
    }
  }

  static async renameColumn() {
    try {
      console.log('\n🔄 Rename Column');
      const oldName = await this.getInput('Enter current column name: ');
      const newName = await this.getInput('Enter new column name: ');
      
      if (!oldName.trim() || !newName.trim()) {
        console.log('❌ Both names are required');
        return;
      }

      const result = await SchemaManager.renameColumn('demographic_records', oldName.trim(), newName.trim());
      if (result.success) {
        console.log('✅', result.message);
      } else {
        console.log('❌', result.message);
      }
    } catch (error) {
      console.error('❌ Error renaming column:', error.message);
    }
  }

  static async changeColumnType() {
    try {
      console.log('\n🔧 Change Column Type');
      const columnName = await this.getInput('Enter column name: ');
      const newType = await this.getInput('Enter new data type (e.g., TEXT, INTEGER, DECIMAL): ');
      
      if (!columnName.trim() || !newType.trim()) {
        console.log('❌ Both column name and type are required');
        return;
      }

      const result = await SchemaManager.changeColumnType('demographic_records', columnName.trim(), newType.trim().toUpperCase());
      if (result.success) {
        console.log('✅', result.message);
      } else {
        console.log('❌', result.message);
      }
    } catch (error) {
      console.error('❌ Error changing column type:', error.message);
    }
  }

  static async backupTable() {
    try {
      console.log('\n💾 Backup Table');
      console.log('Creating backup...');
      const backupName = await SchemaManager.backupTable('demographic_records');
      console.log('✅ Table backed up as:', backupName);
    } catch (error) {
      console.error('❌ Error backing up table:', error.message);
    }
  }

  static async restoreFromBackup() {
    try {
      console.log('\n🔄 Restore From Backup');
      const backupName = await this.getInput('Enter backup table name: ');
      
      if (!backupName.trim()) {
        console.log('❌ Backup name is required');
        return;
      }

      console.log('Restoring from backup...');
      const result = await SchemaManager.restoreFromBackup('demographic_records', backupName.trim());
      console.log('✅', result.message);
    } catch (error) {
      console.error('❌ Error restoring from backup:', error.message);
    }
  }

  static async syncSchemaWithCSV() {
    try {
      console.log('\n🔄 Sync Schema with CSV');
      const csvHeadersInput = await this.getInput('Enter CSV headers (separated by commas): ');
      
      if (!csvHeadersInput.trim()) {
        console.log('❌ CSV headers are required');
        return;
      }

      const csvHeaders = csvHeadersInput.split(',').map(header => header.trim());
      console.log('\nSyncing schema with CSV headers:', csvHeaders.join(', '));
      
      const result = await SchemaManager.syncSchemaWithCSV('demographic_records', csvHeaders);
      console.log('✅ Schema synchronized successfully');
      if (result.missingColumns.length > 0) {
        console.log('Added columns:', result.missingColumns.join(', '));
      }
    } catch (error) {
      console.error('❌ Error syncing schema:', error.message);
    }
  }

  static async run() {
    while (true) {
      await this.showMenu();
      const choice = await this.getInput('\nEnter your choice (1-9): ');
      
      switch (choice.trim()) {
        case '1':
          await this.viewCurrentSchema();
          break;
        case '2':
          await this.addNewColumns();
          break;
        case '3':
          await this.removeColumns();
          break;
        case '4':
          await this.renameColumn();
          break;
        case '5':
          await this.changeColumnType();
          break;
        case '6':
          await this.backupTable();
          break;
        case '7':
          await this.restoreFromBackup();
          break;
        case '8':
          await this.syncSchemaWithCSV();
          break;
        case '9':
          console.log('\n👋 Goodbye!');
          rl.close();
          process.exit(0);
        default:
          console.log('❌ Invalid choice. Please enter a number between 1-9.');
      }
      
      await this.getInput('\nPress Enter to continue...');
    }
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  SchemaCLI.run().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SchemaCLI;
