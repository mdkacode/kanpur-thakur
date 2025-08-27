# Database Sequence Fix

This document describes the fix for the database sequence issue that was causing upload failures with the error: `duplicate key value violates unique constraint "file_uploads_pkey"`.

## Problem Description

The error occurred because the PostgreSQL sequence for the `file_uploads` table's primary key was out of sync with the actual data. This commonly happens when:

1. Records are inserted manually with specific IDs
2. Data is imported from backups
3. Sequences are reset without proper synchronization
4. Database migrations don't update sequences correctly

## Error Details

```
error: duplicate key value violates unique constraint "file_uploads_pkey"
Key (id)=(12) already exists.
```

This indicates that the sequence was trying to use ID 12, but a record with that ID already existed in the table.

## Solution

### 1. Quick Fix (Recommended)

Run the simple sequence fix script:

```bash
npm run fix:sequences-simple
```

This script will:
- Check all tables with ID sequences
- Compare current max ID with sequence value
- Update sequences to the correct value
- Skip test inserts to avoid constraint issues

### 2. Comprehensive Fix

For a more thorough fix with testing:

```bash
npm run fix:sequences
```

This script includes:
- Detailed analysis of sequence state
- Test inserts (may fail if constraints are strict)
- Duplicate ID detection
- Gap analysis

### 3. Schema Check

To understand the current database state:

```bash
npm run check:schema
```

This will show:
- Table structure and constraints
- Current sequence values
- Data statistics
- Potential issues

## Files Created

### 1. `fix_sequences_simple.js`
- **Purpose**: Simple sequence fix without test inserts
- **Safe**: Won't fail due to constraint violations
- **Recommended**: Use this first

### 2. `fix_database_sequences.js`
- **Purpose**: Comprehensive sequence fix with testing
- **Features**: Detailed analysis and test inserts
- **Caution**: May fail if constraints are strict

### 3. `check_database_schema.js`
- **Purpose**: Database schema analysis
- **Features**: Shows table structure, constraints, and data stats
- **Useful**: For understanding current state

### 4. Updated `src/models/FileUpload.js`
- **Purpose**: Automatic sequence fix on upload errors
- **Feature**: Detects sequence issues and fixes them automatically
- **Benefit**: Prevents future upload failures

## How It Works

### Sequence Synchronization

The fix works by:

1. **Finding the maximum ID** in the table
2. **Checking the current sequence value**
3. **Updating the sequence** to `max_id + 1`
4. **Ensuring future inserts** use correct IDs

### Example

```sql
-- Before fix
SELECT MAX(id) FROM file_uploads; -- Returns 12
SELECT last_value FROM file_uploads_id_seq; -- Returns 8

-- After fix
SELECT setval('file_uploads_id_seq', 13, true); -- Sets sequence to 13
SELECT last_value FROM file_uploads_id_seq; -- Returns 13
```

## Usage Instructions

### Step 1: Run Simple Fix

```bash
npm run fix:sequences-simple
```

### Step 2: Test Upload

Try uploading a file to see if the issue is resolved.

### Step 3: Check Schema (if needed)

```bash
npm run check:schema
```

### Step 4: Comprehensive Fix (if needed)

```bash
npm run fix:sequences
```

## Tables Fixed

The scripts will fix sequences for these tables:

1. **`file_uploads`** - Main upload records
2. **`demographic_records`** - Demographic data
3. **`telecare_records`** - Telecare data
4. **`phone_numbers`** - Phone number data
5. **`filters`** - Filter configurations

## Prevention

### Automatic Fix

The updated `FileUpload.create()` method now includes automatic sequence fixing:

```javascript
// If sequence error occurs, automatically fix and retry
if (error.code === '23505' && error.constraint === 'file_uploads_pkey') {
  await FileUpload.fixSequence();
  // Retry the insert
}
```

### Regular Maintenance

Consider running sequence checks periodically:

```bash
# Add to cron job
0 2 * * * cd /path/to/app && npm run fix:sequences-simple
```

## Troubleshooting

### Issue: Still getting sequence errors

1. **Check if sequence exists**:
   ```sql
   SELECT * FROM information_schema.sequences WHERE sequence_name = 'file_uploads_id_seq';
   ```

2. **Check table constraints**:
   ```sql
   SELECT * FROM information_schema.table_constraints WHERE table_name = 'file_uploads';
   ```

3. **Check for duplicate IDs**:
   ```sql
   SELECT id, COUNT(*) FROM file_uploads GROUP BY id HAVING COUNT(*) > 1;
   ```

### Issue: Script fails with constraint errors

1. **Use simple fix instead**:
   ```bash
   npm run fix:sequences-simple
   ```

2. **Check schema first**:
   ```bash
   npm run check:schema
   ```

3. **Fix constraints manually** if needed

### Issue: Multiple tables affected

The scripts automatically check and fix all relevant tables. If you need to fix a specific table:

```javascript
// In Node.js REPL or script
const { fixSequencesSimple } = require('./fix_sequences_simple');
await fixSequencesSimple();
```

## Monitoring

### Check Sequence Health

```sql
-- Check all sequences
SELECT 
  sequence_name,
  last_value,
  is_called
FROM information_schema.sequences 
WHERE sequence_name LIKE '%_id_seq';
```

### Monitor Upload Errors

Watch for these error patterns:
- `duplicate key value violates unique constraint`
- `null value in column violates not-null constraint`
- `sequence does not exist`

## Rollback

If issues occur after the fix:

1. **Check database backups** for sequence values
2. **Restore from backup** if necessary
3. **Manually set sequences** to known good values

```sql
-- Example rollback
SELECT setval('file_uploads_id_seq', 10, true);
```

## Future Improvements

1. **Automated monitoring** of sequence health
2. **Preventive maintenance** scripts
3. **Better error handling** in upload processes
4. **Database migration** improvements

---

**Last Updated**: January 27, 2025  
**Version**: 1.0.0  
**Tested**: PostgreSQL 12+
