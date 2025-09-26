#!/bin/bash

# Test script for bulk import APIs using curl
# Make sure your server is running on localhost:3000

echo "🧪 Testing Bulk Import APIs with cURL"
echo "====================================="

# Check if sample file exists
SAMPLE_FILE="/Users/flutte/Desktop/demo-pro/my-app-backend/sample-books-2025-09-26.xlsx"
if [ ! -f "$SAMPLE_FILE" ]; then
    echo "❌ Sample file not found. Creating one..."
    cd /Users/flutte/Desktop/demo-pro/my-app-backend
    node create-sample-excel.js
fi

echo "📄 Using sample file: $SAMPLE_FILE"
echo ""

# Test 1: Validation API
echo "🔍 Testing Validation API..."
echo "----------------------------"
curl -X POST http://localhost:3000/api/books/validate-excel \
  -F "excelFile=@$SAMPLE_FILE" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received (install jq for pretty JSON)"

echo ""
echo ""

# Test 2: Bulk Import API
echo "🚀 Testing Bulk Import API..."
echo "-----------------------------"
curl -X POST http://localhost:3000/api/books/bulk-import \
  -F "excelFile=@$SAMPLE_FILE" \
  -F 'mapping={"ISBN":"isbn","Title":"title","Author":"author","Price":"rate","Currency":"currency","Publisher":"publisher_name","Year":"year","Discount":"discount","Classification":"classification","Binding Type":"binding_type"}' \
  -F 'options={"skipDuplicates":true,"skipConflicts":true,"updateExisting":false}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received (install jq for pretty JSON)"

echo ""
echo "✅ Tests completed!"
echo ""
echo "📋 Expected Results:"
echo "   - Validation API should return column mapping information"
echo "   - Bulk Import API should return import statistics"
echo "   - Check the logs/ directory for detailed log files"
