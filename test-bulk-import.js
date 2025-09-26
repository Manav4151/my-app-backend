/**
 * Test script for bulk import functionality
 * This script demonstrates how to use the bulk import APIs
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/books';

// Test data - create a sample Excel file for testing
const testData = [
    ['ISBN', 'Title', 'Author', 'Price', 'Currency', 'Publisher', 'Year', 'Discount'],
    ['978-1234567890', 'Test Book 1', 'John Doe', '29.99', 'USD', 'Test Publisher', '2023', '10'],
    ['978-0987654321', 'Test Book 2', 'Jane Smith', '19.99', 'USD', 'Another Publisher', '2023', '5'],
    ['978-1122334455', 'Test Book 3', 'Bob Johnson', '39.99', 'USD', 'Test Publisher', '2023', '0']
];

/**
 * Create a test Excel file
 */
function createTestExcelFile() {
    const xlsx = require('xlsx');
    const ws = xlsx.utils.aoa_to_sheet(testData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Books');
    
    const testFilePath = path.join(process.cwd(), 'test-books.xlsx');
    xlsx.writeFile(wb, testFilePath);
    return testFilePath;
}

/**
 * Test the validation API
 */
async function testValidationAPI(filePath) {
    console.log('\n🧪 Testing Validation API...');
    
    try {
        const form = new FormData();
        form.append('excelFile', fs.createReadStream(filePath));
        
        const response = await fetch(`${BASE_URL}/validate-excel`, {
            method: 'POST',
            body: form
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Validation successful!');
            console.log('📊 Headers found:', result.data.headers);
            console.log('🗺️  Auto-mapped fields:', result.data.mapping);
            console.log('❓ Unmapped headers:', result.data.unmappedHeaders);
            console.log('💡 Suggested mappings:', result.data.suggestedMapping);
            console.log('✅ Validation status:', result.data.validation);
            return result.data.mapping;
        } else {
            console.log('❌ Validation failed:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ Error testing validation API:', error.message);
        return null;
    }
}

/**
 * Test the bulk import API
 */
async function testBulkImportAPI(filePath, mapping) {
    console.log('\n🚀 Testing Bulk Import API...');
    
    try {
        const form = new FormData();
        form.append('excelFile', fs.createReadStream(filePath));
        form.append('mapping', JSON.stringify(mapping));
        form.append('options', JSON.stringify({
            skipDuplicates: true,
            skipConflicts: true,
            updateExisting: false
        }));
        
        const response = await fetch(`${BASE_URL}/bulk-import`, {
            method: 'POST',
            body: form
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Bulk import successful!');
            console.log('📈 Import statistics:', result.data.stats);
            console.log('📋 Summary:', result.data.summary);
            console.log('📄 Log file:', result.data.logFile);
            return result.data;
        } else {
            console.log('❌ Bulk import failed:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ Error testing bulk import API:', error.message);
        return null;
    }
}

/**
 * Clean up test files
 */
function cleanup(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🧹 Cleaned up test file:', filePath);
        }
    } catch (error) {
        console.warn('⚠️  Could not clean up test file:', error.message);
    }
}

/**
 * Main test function
 */
async function runTests() {
    console.log('🧪 Starting Bulk Import API Tests...');
    console.log('=====================================');
    
    // Create test Excel file
    const testFilePath = createTestExcelFile();
    console.log('📄 Created test Excel file:', testFilePath);
    
    try {
        // Test validation API
        const mapping = await testValidationAPI(testFilePath);
        
        if (mapping) {
            // Test bulk import API
            await testBulkImportAPI(testFilePath, mapping);
        }
        
        console.log('\n✅ All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        // Clean up
        cleanup(testFilePath);
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export { runTests, testValidationAPI, testBulkImportAPI };
