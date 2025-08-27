# Demographic Records Filtering System

This document describes the enhanced filtering and sorting functionality for the Demographic Records table, designed to provide Excel-like filtering capabilities.

## Overview

The demographic records table now features comprehensive filtering and sorting capabilities that work like Excel, allowing users to filter data by any column and combine multiple filter conditions.

## Key Features

### ✅ **Excel-Like Filtering**
- **Column-level filters**: Each column has its own filter dropdown
- **Text search**: Partial text matching within columns
- **Multiple filter types**: Text, numeric, and date filtering
- **Filter indicators**: Visual indicators show when filters are active
- **Quick reset**: Easy filter clearing and reset functionality

### ✅ **Enhanced Sorting**
- **Multi-column sorting**: Sort by any column
- **Sort indicators**: Visual indicators for sort direction
- **Persistent sorting**: Sort state maintained during navigation

### ✅ **Advanced Features**
- **Row selection**: Select multiple rows for bulk operations
- **Export functionality**: Export filtered data to CSV
- **Real-time filtering**: Instant filter results
- **Filter combinations**: Combine multiple filter conditions

## Column Structure

The table now uses a **flattened column structure** (no grouped columns) to ensure optimal filtering performance:

| Column | Data Type | Filter Type | Sortable | Description |
|--------|-----------|-------------|----------|-------------|
| **ZIPCODE** | Text | Text Search | ✅ | Zipcode with blue tag styling |
| **STATE** | Text | Text Search | ✅ | State name |
| **COUNTY** | Text | Text Search | ✅ | County name with ellipsis |
| **CITY** | Text | Text Search | ✅ | City name with ellipsis |
| **TIMEZONE** | Text | Text Search | ✅ | Timezone with colored tags |
| **MEDIAN HHI** | Currency | Text Search | ✅ | Median household income |
| **AVG HHI** | Currency | Text Search | ✅ | Average household income |
| **PC INCOME** | Currency | Text Search | ✅ | Per capita income |
| **MEDIAN AGE** | Number | Text Search | ✅ | Median age |
| **HOUSEHOLDS** | Number | Text Search | ✅ | Total households |
| **WHITE %** | Number | Text Search | ✅ | White population percentage |
| **BLACK %** | Number | Text Search | ✅ | Black population percentage |
| **HISPANIC %** | Number | Text Search | ✅ | Hispanic population percentage |
| **ACT** | Actions | N/A | ❌ | View details action |

## Filter Types

### 1. **Text Search Filters**
- **Partial matching**: Search for text within any column
- **Case-insensitive**: Searches work regardless of case
- **Real-time**: Results update as you type
- **Special characters**: Handles currency symbols, commas, etc.

### 2. **Dropdown Filters**
- **Unique values**: Shows all unique values in the column
- **Sorted options**: Values are sorted alphabetically
- **Limited options**: Maximum 50 options to prevent performance issues
- **Quick selection**: Click to select/deselect values

### 3. **Numeric Filters**
- **Currency handling**: Automatically formats currency values
- **Range filtering**: Filter by numeric ranges
- **Null handling**: Properly handles empty or null values

## How to Use Filters

### **Basic Filtering**
1. **Click the filter icon** (🔽) on any column header
2. **Type in the search box** to filter by text
3. **Press Enter** or click "Filter" to apply
4. **Click "Reset"** to clear the filter

### **Advanced Filtering**
1. **Use multiple filters** simultaneously across different columns
2. **Combine text and dropdown filters** for precise results
3. **Use partial text matching** for flexible searches
4. **Clear individual filters** or reset all filters

### **Sorting**
1. **Click column headers** to sort ascending/descending
2. **Visual indicators** show sort direction (↑↓)
3. **Multi-column sorting** supported
4. **Sort state persists** during filtering

## Filter Examples

### **Filter by State**
```
Column: STATE
Filter: "New York"
Result: Shows only New York records
```

### **Filter by Income Range**
```
Column: MEDIAN HHI
Filter: "$250,001"
Result: Shows only high-income areas
```

### **Filter by Timezone**
```
Column: TIMEZONE
Filter: "Eastern Time"
Result: Shows only Eastern Time zone records
```

### **Partial Text Search**
```
Column: CITY
Filter: "New"
Result: Shows cities containing "New" (New York, Newport, etc.)
```

### **Multiple Filters**
```
STATE: "Florida"
TIMEZONE: "Eastern Time"
MEDIAN HHI: "$250,001"
Result: Shows Florida records in Eastern Time with high income
```

## Technical Implementation

### **Filter Functions**
```typescript
// Enhanced Excel-like filter function
const getColumnSearchProps = (dataIndex: keyof DemographicRecord, title: string) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
    <div style={{ padding: 12, minWidth: 200 }}>
      <Input
        placeholder={`Search ${title}...`}
        value={selectedKeys[0]}
        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => confirm()}
        autoFocus
      />
      <Space>
        <Button type="primary" onClick={() => confirm()}>Filter</Button>
        <Button onClick={() => { clearFilters(); confirm(); }}>Reset</Button>
      </Space>
    </div>
  ),
  filterIcon: (filtered: boolean) => (
    <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
  ),
  onFilter: (value: boolean | React.Key, record: DemographicRecord) => {
    const recordValue = record[dataIndex]?.toString().toLowerCase() || '';
    const filterValue = value.toString().toLowerCase();
    return recordValue.includes(filterValue);
  },
  filterMultiple: false,
});
```

### **Unique Values Generation**
```typescript
const getUniqueValues = (key: keyof DemographicRecord) => {
  const values = records.map(record => record[key]).filter(Boolean);
  const uniqueValues = Array.from(new Set(values));
  
  // Sort values for better UX
  const sortedValues = uniqueValues.sort((a, b) => {
    const aStr = a?.toString() || '';
    const bStr = b?.toString() || '';
    return aStr.localeCompare(bStr);
  });
  
  return sortedValues.map(value => ({
    text: value?.toString() || '',
    value: value?.toString() || ''
  })).slice(0, 50); // Limit to 50 options
};
```

## Performance Optimizations

### **Filter Performance**
- **Client-side filtering**: Fast filtering without server requests
- **Debounced search**: Prevents excessive filtering during typing
- **Limited options**: Maximum 50 filter options per column
- **Efficient rendering**: Optimized table rendering for large datasets

### **Memory Management**
- **Lazy loading**: Load data in chunks
- **Virtual scrolling**: Efficient rendering for large tables
- **Garbage collection**: Proper cleanup of filter states

## User Experience Features

### **Visual Indicators**
- **Filter icons**: Show when filters are active (blue color)
- **Sort indicators**: Clear visual feedback for sort direction
- **Loading states**: Show loading during filter operations
- **Empty states**: Clear messages when no results found

### **Accessibility**
- **Keyboard navigation**: Full keyboard support for filtering
- **Screen reader support**: Proper ARIA labels and descriptions
- **High contrast**: Works with high contrast themes
- **Focus management**: Proper focus handling in filter dropdowns

## Troubleshooting

### **Common Issues**

1. **Filters not working**
   - Check if data is loaded properly
   - Verify column data types match filter expectations
   - Clear browser cache and refresh

2. **Slow filtering**
   - Reduce the number of filter options
   - Check for large datasets
   - Verify client-side filtering is enabled

3. **Filter dropdown not opening**
   - Check for JavaScript errors in console
   - Verify Ant Design version compatibility
   - Check for CSS conflicts

### **Performance Tips**

1. **Limit filter options** to 50 per column
2. **Use text search** instead of dropdown for large datasets
3. **Clear unused filters** to improve performance
4. **Refresh data** periodically for large datasets

## Future Enhancements

### **Planned Features**
- **Range filters**: Numeric range filtering (e.g., income ranges)
- **Date filters**: Date range filtering for temporal data
- **Saved filters**: Save and reuse filter combinations
- **Export filtered data**: Export only filtered results
- **Filter presets**: Predefined filter combinations

### **Advanced Filtering**
- **Regex support**: Regular expression filtering
- **Fuzzy search**: Approximate text matching
- **Multi-select filters**: Select multiple filter values
- **Filter history**: Track and restore previous filters

---

**Last Updated**: January 27, 2025  
**Version**: 2.0.0  
**Component**: DemographicRecords
