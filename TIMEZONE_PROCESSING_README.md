# Timezone Processing System

This document describes the automated timezone processing system for SheetBC demographic records.

## Overview

The timezone processing system automatically assigns timezone information to demographic records based on their state. This ensures that all records have proper timezone data for filtering and display purposes.

## Components

### 1. Timezone Processor (`src/scripts/processTimezones.js`)
- **Purpose**: Processes timezone information for demographic records
- **Features**:
  - Batch processing (1000 records per batch)
  - Error handling and logging
  - State code mapping from full state names
  - Timezone ID assignment based on state mappings
  - Performance monitoring and statistics

### 2. Cron Processor (`src/scripts/cronTimezoneProcessor.js`)
- **Purpose**: Automated execution of timezone processing
- **Features**:
  - Logging to file and console
  - Conditional execution (time of day, records to process)
  - Automatic log cleanup (30-day retention)
  - Error handling and recovery

### 3. Setup Script (`setup-cron.sh`)
- **Purpose**: Interactive cron job setup
- **Features**:
  - Multiple schedule options
  - Automatic log directory creation
  - Cron job management
  - Testing and validation

## NPM Commands

### Manual Processing
```bash
# Process timezones once
npm run process:timezones

# Run cron processor manually
npm run cron:timezones

# Complete timezone setup
npm run setup:timezones
```

### Cron Setup
```bash
# Interactive cron setup
npm run setup:cron

# This will guide you through:
# 1. Schedule selection (5 min, hourly, daily, custom)
# 2. Log file configuration
# 3. Cron job installation
```

### One-time Fixes
```bash
# Fix state-timezone mappings
npm run fix:state-timezones

# Fix demographic records timezone data
npm run fix:demographic-timezones

# Fix both state mappings and demographic records
npm run fix:all-timezones
```

## Cron Job Schedules

### Recommended Schedules

1. **Every 5 minutes** (`*/5 * * * *`)
   - Best for active systems with frequent uploads
   - Ensures new records get timezone data quickly
   - Higher resource usage

2. **Every hour** (`0 * * * *`)
   - Good balance for moderate usage
   - Reasonable resource usage
   - Suitable for most production systems

3. **Daily at 2 AM** (`0 2 * * *`)
   - Minimal resource usage
   - Good for systems with infrequent uploads
   - Runs during low-traffic hours

### Custom Schedules
You can specify any valid cron schedule:
- `*/10 * * * *` - Every 10 minutes
- `0 */2 * * *` - Every 2 hours
- `0 1,13 * * *` - Daily at 1 AM and 1 PM

## Logging

### Log Files
- **Location**: `logs/timezone-processor.log`
- **Format**: `[timestamp] message`
- **Retention**: 30 days (automatic cleanup)

### Log Examples
```
[2025-01-27T10:30:00.000Z] 🕐 Starting cron timezone processor...
[2025-01-27T10:30:00.123Z] 📊 Found 150 records that need timezone processing
[2025-01-27T10:30:05.456Z] ✅ Timezone processing completed successfully!
[2025-01-27T10:30:05.457Z] 📊 Processed: 150 records
[2025-01-27T10:30:05.458Z] ❌ Errors: 0 records
[2025-01-27T10:30:05.459Z] ⏱️ Duration: 5.34 seconds
```

### Monitoring
```bash
# View real-time logs
tail -f logs/timezone-processor.log

# View last 100 lines
tail -n 100 logs/timezone-processor.log

# Search for errors
grep "ERROR\|FATAL" logs/timezone-processor.log
```

## Database Schema

### Tables Involved
1. **`demographic_records`**
   - `timezone_id` (INTEGER) - References timezones.id
   - `state_code` (VARCHAR(2)) - State abbreviation
   - `state` (TEXT) - Full state name

2. **`states`**
   - `state_code` (VARCHAR(2)) - State abbreviation
   - `timezone_id` (INTEGER) - References timezones.id

3. **`timezones`**
   - `id` (SERIAL) - Primary key
   - `display_name` (VARCHAR(100)) - Human-readable name
   - `abbreviation_standard` (VARCHAR(10)) - Timezone abbreviation

### Timezone Mappings
- **Eastern Time (EST/EDT)**: 23 states
- **Central Time (CST/CDT)**: 14 states
- **Mountain Time (MST/MDT)**: 7 states
- **Pacific Time (PST/PDT)**: 4 states
- **Alaska Time (AKST/AKDT)**: 1 state
- **Hawaii Time (HST)**: 1 state

## Processing Logic

### 1. Record Selection
- Finds records where `timezone_id IS NULL`
- Orders by `created_at DESC` (newest first)

### 2. State Code Mapping
- Maps full state names to state codes
- Updates `state_code` field if missing

### 3. Timezone Assignment
- Looks up `timezone_id` from `states` table
- Updates `timezone_id` and `updated_at` fields

### 4. Error Handling
- Individual record errors don't stop processing
- Failed records are logged and counted
- Processing continues with remaining records

## Performance Considerations

### Batch Processing
- Processes 1000 records per batch
- 100ms delay between batches
- Prevents database overload

### Resource Usage
- Minimal memory usage (streaming approach)
- Database connection pooling
- Efficient SQL queries with proper indexing

### Monitoring
- Processing time tracking
- Record count statistics
- Error rate monitoring

## Troubleshooting

### Common Issues

1. **No records processed**
   - Check if records exist without timezone_id
   - Verify state_code values are set
   - Check state-timezone mappings

2. **High error rate**
   - Check database connectivity
   - Verify timezone data exists
   - Review log files for specific errors

3. **Slow processing**
   - Check database performance
   - Verify indexes on timezone_id, state_code
   - Monitor system resources

### Debug Commands
```bash
# Check timezone statistics
psql -d sheetbc_db -c "SELECT COUNT(*) as total, COUNT(timezone_id) as with_timezone FROM demographic_records;"

# Check state mappings
psql -d sheetbc_db -c "SELECT state_code, COUNT(*) FROM demographic_records GROUP BY state_code;"

# Check timezone data
psql -d sheetbc_db -c "SELECT display_name, COUNT(*) FROM timezones t JOIN demographic_records d ON t.id = d.timezone_id GROUP BY display_name;"
```

## Security Considerations

### File Permissions
- Log files should be readable by application user
- Scripts should be executable by application user
- Database credentials should be properly secured

### Cron Security
- Use absolute paths in cron entries
- Set proper environment variables
- Monitor cron job execution

## Maintenance

### Regular Tasks
1. **Monitor log files** for errors and performance
2. **Review processing statistics** weekly
3. **Clean up old logs** (automatic, 30-day retention)
4. **Update timezone data** if needed

### Updates
- Timezone data updates (DST changes, new timezones)
- State mappings updates
- Processing logic improvements

## Support

For issues or questions:
1. Check log files first
2. Review this documentation
3. Test with manual processing
4. Contact system administrator

---

**Last Updated**: January 27, 2025
**Version**: 1.0.0
