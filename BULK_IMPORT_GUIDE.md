# Bulk Import Guide

## Overview
The bulk import functionality allows you to upload Excel files (.xlsx or .xls) to import multiple books into the database. The system automatically checks for duplicates and either updates existing records or creates new ones.

## API Endpoint
```
POST /api/books/import
```

## Request Format
- **Content-Type**: `multipart/form-data`
- **Field Name**: `excelFile`
- **File Types**: `.xlsx`, `.xls`
- **Max File Size**: 10MB

## Excel File Format
Your Excel file should have the following column headers (case-sensitive):

| Excel Column | Database Field | Description |
|-------------|----------------|-------------|
| ISBN | isbn | Book ISBN |
| Non ISBN | nonisbn | Non-ISBN identifier |
| Other Code | other_code | Other book codes |
| Title | title | Book title |
| Author | author | Book author |
| EDITION | edition | Book edition |
| Year | year | Publication year |
| Publisher Code | publisher_id | Publisher identifier |
| Publisher | publisher_name | Publisher name |
| Edition | binding_type | Binding type |
| Sub_Subject | classification | Book classification |
| Subject | remarks | Additional remarks |
| Price | price | Book price |
| Curr | currency | Currency code |

## Duplicate Detection Logic
The system checks for duplicates in the following order:

1. **By ISBN**: If a book with the same ISBN exists, it will be updated
2. **By Title + Author**: If no ISBN match, checks for exact title and author match (case-insensitive)
3. **By Title Only**: If no title+author match, checks for exact title match (case-insensitive)

## Response Format
```json
{
  "message": "Books imported successfully",
  "success": true,
  "stats": {
    "total": 100,
    "inserted": 45,
    "updated": 30,
    "skipped": 20,
    "errors": 5,
    "errorDetails": [
      {
        "row": 15,
        "error": "Validation error message",
        "data": { /* row data */ }
      }
    ]
  }
}
```

## Example Usage

### Using cURL
```bash
curl -X POST \
  http://localhost:8000/api/books/import \
  -H 'Content-Type: multipart/form-data' \
  -F 'excelFile=@/path/to/your/books.xlsx'
```

### Using JavaScript/Fetch
```javascript
const formData = new FormData();
formData.append('excelFile', fileInput.files[0]);

fetch('/api/books/import', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Import result:', data);
  console.log(`Inserted: ${data.stats.inserted}`);
  console.log(`Updated: ${data.stats.updated}`);
  console.log(`Skipped: ${data.stats.skipped}`);
  console.log(`Errors: ${data.stats.errors}`);
});
```

### Using Postman
1. Set method to POST
2. URL: `http://localhost:8000/api/books/import`
3. Go to Body tab
4. Select "form-data"
5. Add key: `excelFile` (type: File)
6. Select your Excel file
7. Send request

## Error Handling
- **File not uploaded**: Returns 400 with message "No Excel file uploaded"
- **Invalid file type**: Returns 400 with message "Invalid file type"
- **File too large**: Returns 400 with message "File too large"
- **Processing errors**: Individual row errors are logged and included in response

## Notes
- Empty rows are automatically skipped
- Rows without title or ISBN are skipped
- The system automatically assigns unique `book_id` values for new books
- Existing books retain their original `book_id` when updated
- All imports are logged with detailed statistics
- Uploaded files are temporarily stored in the `uploads/` directory

## File Cleanup
Uploaded files are stored temporarily. Consider implementing a cleanup job to remove old files from the `uploads/` directory.
