# Bulk Import Guide

This guide explains how to use the new bulk import functionality for books and pricing data from Excel files.

## Overview

The bulk import system provides two main APIs:
1. **Validation API** - Validates Excel column mapping before import
2. **Import API** - Performs the actual bulk import with conflict detection and logging

## API Endpoints

### 1. Validate Excel Mapping
**POST** `/api/books/validate-excel`

Validates an Excel file and returns column mapping information.

#### Request
- **Content-Type**: `multipart/form-data`
- **File**: Excel file (.xlsx or .xls)
- **Field name**: `excelFile`

#### Response
```json
{
  "success": true,
  "message": "Excel file validation completed",
  "data": {
    "fileName": "books.xlsx",
    "headers": ["ISBN", "Title", "Author", "Price", "Currency"],
    "mapping": {
      "ISBN": "isbn",
      "Title": "title",
      "Author": "author",
      "Price": "rate",
      "Currency": "currency"
    },
    "unmappedHeaders": ["Extra Column"],
    "suggestedMapping": {
      "Extra Column": "remarks"
    },
    "validation": {
      "hasRequiredBookFields": true,
      "hasRequiredPricingFields": true,
      "missingBookFields": [],
      "missingPricingFields": [],
      "totalRows": 100,
      "mappedFields": {
        "book": ["isbn", "title", "author"],
        "pricing": ["rate", "currency"]
      }
    }
  }
}
```

### 2. Bulk Import Excel
**POST** `/api/books/bulk-import`

Performs bulk import with conflict detection and logging.

#### Request
- **Content-Type**: `multipart/form-data`
- **File**: Excel file (.xlsx or .xls)
- **Field name**: `excelFile`
- **Body parameters**:
  - `mapping`: JSON object with column mapping
  - `options`: JSON object with import options (optional)

#### Example Request Body
```json
{
  "mapping": {
    "ISBN": "isbn",
    "Title": "title",
    "Author": "author",
    "Price": "rate",
    "Currency": "currency",
    "Discount": "discount",
    "Publisher": "publisher_name"
  },
  "options": {
    "skipDuplicates": true,
    "skipConflicts": true,
    "updateExisting": false
  }
}
```

#### Import Options
- `skipDuplicates`: Skip completely duplicate records (default: true)
- `skipConflicts`: Skip records with conflicts (default: true)
- `updateExisting`: Update existing records instead of skipping (default: false)

#### Response
```json
{
  "success": true,
  "message": "Bulk import completed successfully",
  "data": {
    "fileName": "books.xlsx",
    "stats": {
      "total": 100,
      "inserted": 75,
      "updated": 10,
      "skipped": 5,
      "conflicts": 8,
      "duplicates": 2,
      "errors": 0
    },
    "summary": {
      "totalProcessed": 100,
      "successful": 85,
      "failed": 15,
      "conflicts": 8,
      "duplicates": 2,
      "errors": 0,
      "skipped": 5
    },
    "logFile": "/path/to/logs/bulk-import-books-2024-01-15T10-30-00.log"
  }
}
```

## Supported Excel Columns

### Book Fields
| Excel Column | Database Field | Required | Description |
|-------------|----------------|----------|-------------|
| ISBN | isbn | No | Book ISBN |
| Non ISBN | nonisbn | No | Non-ISBN identifier |
| Other Code | other_code | No | Other book code |
| Title | title | Yes | Book title |
| Author | author | Yes | Book author |
| Edition | edition | No | Book edition |
| Year | year | No | Publication year |
| Publisher | publisher_name | No | Publisher name |
| Binding Type | binding_type | No | Book binding type |
| Classification | classification | No | Book classification |
| Subject | remarks | No | Additional remarks |

### Pricing Fields
| Excel Column | Database Field | Required | Description |
|-------------|----------------|----------|-------------|
| Price/Rate | rate | Yes | Book price |
| Currency | currency | Yes | Currency code (USD, INR, etc.) |
| Discount | discount | No | Discount percentage |
| Source | source | No | Price source (defaults to filename) |

## Conflict Detection

The system detects several types of conflicts:

### 1. Duplicate Books
- Same ISBN + Title + Author
- Same other_code + Title + Author  
- Same Title + Author (when no ISBN/other_code)

### 2. Book Conflicts
- Same ISBN but different Title/Author
- Same other_code but different Title/Author
- Same Title but different Author

### 3. Pricing Conflicts
- Same book + source but different price/discount/currency

## Logging

The system creates detailed log files for:
- **Conflicts**: Records that have conflicts with existing data
- **Duplicates**: Records that are complete duplicates
- **Errors**: Records that failed to process

Log files are stored in the `logs/` directory with format:
`bulk-import-{filename}-{timestamp}.log`

## Usage Workflow

### Step 1: Validate Excel File
```bash
curl -X POST http://localhost:3000/api/books/validate-excel \
  -F "excelFile=@books.xlsx"
```

### Step 2: Review Mapping
Check the validation response to ensure:
- All required fields are mapped
- Unmapped headers are handled appropriately
- Suggested mappings are correct

### Step 3: Perform Import
```bash
curl -X POST http://localhost:3000/api/books/bulk-import \
  -F "excelFile=@books.xlsx" \
  -F 'mapping={"ISBN":"isbn","Title":"title","Author":"author","Price":"rate","Currency":"currency"}' \
  -F 'options={"updateExisting":false}'
```

### Step 4: Review Results
- Check the import statistics
- Review the log file for conflicts and duplicates
- Take appropriate action for any issues

## Error Handling

The system handles various error scenarios:

1. **Invalid Excel Format**: Returns validation error
2. **Missing Required Fields**: Skips records with missing essential data
3. **Database Errors**: Logs errors and continues processing
4. **File Upload Errors**: Returns appropriate error messages

## Best Practices

1. **Always validate first**: Use the validation API before importing
2. **Review mappings**: Ensure column mappings are correct
3. **Start small**: Test with a small file first
4. **Check logs**: Always review the generated log files
5. **Backup data**: Consider backing up data before large imports
6. **Use appropriate options**: Choose the right import options for your use case

## Example Excel File Structure

| ISBN | Title | Author | Price | Currency | Publisher | Year |
|------|-------|--------|-------|----------|-----------|------|
| 978-1234567890 | Sample Book | John Doe | 29.99 | USD | Sample Publisher | 2023 |
| 978-0987654321 | Another Book | Jane Smith | 19.99 | USD | Another Publisher | 2023 |

## Troubleshooting

### Common Issues

1. **"No title or ISBN provided"**: Ensure your Excel has Title or ISBN columns
2. **"Column mapping is required"**: Provide the mapping parameter in the request
3. **"File too large"**: Excel files are limited to 10MB
4. **"Only Excel files allowed"**: Ensure you're uploading .xlsx or .xls files

### Getting Help

If you encounter issues:
1. Check the server logs for detailed error messages
2. Review the generated log files for specific record issues
3. Ensure your Excel file follows the expected format
4. Verify all required fields are present and mapped correctly